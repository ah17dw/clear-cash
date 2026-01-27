import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plaid API - same URL for all environments, keys determine environment
const PLAID_API_URL = "https://production.plaid.com";
const PLAID_SANDBOX_URL = "https://sandbox.plaid.com";
const PLAID_DEVELOPMENT_URL = "https://development.plaid.com";

function getPlaidUrl(): string {
  const env = Deno.env.get("PLAID_ENV") || "sandbox";
  switch (env) {
    case "production":
      return PLAID_API_URL;
    case "development":
      return PLAID_DEVELOPMENT_URL;
    default:
      return PLAID_SANDBOX_URL;
  }
}

async function plaidRequest(path: string, body: Record<string, unknown>): Promise<Response> {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  
  if (!clientId || !secret) {
    throw new Error("Plaid credentials not configured");
  }
  
  const response = await fetch(`${getPlaidUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      secret: secret,
      ...body,
    }),
  });
  
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { action, ...params } = await req.json();

    switch (action) {
      case "create-link-token": {
        // Build request body - only include redirect_uri if provided and configured in Plaid Dashboard
        const linkTokenBody: Record<string, unknown> = {
          user: { client_user_id: userId },
          client_name: "AH Finance",
          products: ["transactions"],
          country_codes: ["GB"],
          language: "en",
        };
        
        // Only add redirect_uri if provided (required for OAuth banks like UK banks in production)
        if (params.redirectUri) {
          linkTokenBody.redirect_uri = params.redirectUri;
        }
        
        const response = await plaidRequest("/link/token/create", linkTokenBody);
        
        const data = await response.json();
        console.log("Plaid link token response status:", response.status);
        
        if (!response.ok) {
          console.error("Plaid API error:", JSON.stringify(data));
          return new Response(JSON.stringify({ error: data.error_message || "Failed to create link token" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ linkToken: data.link_token }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchange-token": {
        const { publicToken, institutionId, institutionName } = params;
        
        // Exchange public token for access token
        const exchangeResponse = await plaidRequest("/item/public_token/exchange", {
          public_token: publicToken,
        });
        
        const exchangeData = await exchangeResponse.json();
        
        if (!exchangeResponse.ok) {
          console.error("Plaid exchange error:", exchangeData);
          return new Response(JSON.stringify({ error: exchangeData.error_message || "Failed to exchange token" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        const accessToken = exchangeData.access_token;
        const itemId = exchangeData.item_id;
        
        // Store the connection
        const { data: connection, error: connError } = await supabase
          .from("connected_bank_accounts")
          .insert({
            user_id: userId,
            institution_id: institutionId || itemId,
            institution_name: institutionName || "Connected Bank",
            consent_token: accessToken,
            consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Plaid tokens don't expire
            status: "active",
          })
          .select()
          .single();

        if (connError) {
          console.error("Error storing connection:", connError);
          return new Response(JSON.stringify({ error: "Failed to store connection" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fetch accounts
        const accountsResponse = await plaidRequest("/accounts/balance/get", {
          access_token: accessToken,
        });
        const accountsData = await accountsResponse.json();
        
        let accountsCount = 0;
        if (accountsData.accounts) {
          for (const account of accountsData.accounts) {
            await supabase.from("synced_bank_accounts").insert({
              user_id: userId,
              connection_id: connection.id,
              external_account_id: account.account_id,
              account_type: account.type?.toUpperCase() || "UNKNOWN",
              account_name: account.name || account.official_name || "Account",
              currency: account.balances?.iso_currency_code || "GBP",
              balance: account.balances?.current || 0,
              available_balance: account.balances?.available,
              last_synced_at: new Date().toISOString(),
            });
            accountsCount++;
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          connectionId: connection.id,
          accountsCount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync-accounts": {
        const { connectionId } = params;

        const { data: connection, error: connError } = await supabase
          .from("connected_bank_accounts")
          .select("*")
          .eq("id", connectionId)
          .eq("user_id", userId)
          .single();

        if (connError || !connection) {
          return new Response(JSON.stringify({ error: "Connection not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const accessToken = connection.consent_token;

        // Fetch accounts and balances
        const accountsResponse = await plaidRequest("/accounts/balance/get", {
          access_token: accessToken,
        });
        const accountsData = await accountsResponse.json();

        if (!accountsResponse.ok) {
          console.error("Plaid accounts error:", accountsData);
          
          // Check for item errors (needs re-auth)
          if (accountsData.error_code === "ITEM_LOGIN_REQUIRED") {
            await supabase
              .from("connected_bank_accounts")
              .update({ status: "expired" })
              .eq("id", connectionId);
          }
          
          return new Response(JSON.stringify({ error: accountsData.error_message || "Failed to sync accounts" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let transactionCount = 0;

        for (const account of accountsData.accounts || []) {
          // Upsert account
          const { data: syncedAccount } = await supabase
            .from("synced_bank_accounts")
            .upsert({
              user_id: userId,
              connection_id: connectionId,
              external_account_id: account.account_id,
              account_type: account.type?.toUpperCase() || "UNKNOWN",
              account_name: account.name || account.official_name || "Account",
              currency: account.balances?.iso_currency_code || "GBP",
              balance: account.balances?.current || 0,
              available_balance: account.balances?.available,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "connection_id,external_account_id" })
            .select()
            .single();

          if (!syncedAccount) continue;

          // Update linked savings/debt balances
          if (syncedAccount.linked_savings_id) {
            await supabase
              .from("savings_accounts")
              .update({ balance: account.balances?.current || 0 })
              .eq("id", syncedAccount.linked_savings_id);
          }
          if (syncedAccount.linked_debt_id) {
            await supabase
              .from("debts")
              .update({ balance: Math.abs(account.balances?.current || 0) })
              .eq("id", syncedAccount.linked_debt_id);
          }
        }

        // Fetch transactions using transactions/sync
        const { data: existingAccounts } = await supabase
          .from("synced_bank_accounts")
          .select("id, external_account_id")
          .eq("connection_id", connectionId);

        const accountIdMap = new Map(
          existingAccounts?.map(a => [a.external_account_id, a.id]) || []
        );

        const txResponse = await plaidRequest("/transactions/sync", {
          access_token: accessToken,
          count: 100,
        });
        const txData = await txResponse.json();

        if (txData.added) {
          for (const tx of txData.added) {
            const syncedAccountId = accountIdMap.get(tx.account_id);
            if (!syncedAccountId) continue;

            const { error: txError } = await supabase
              .from("synced_transactions")
              .upsert({
                user_id: userId,
                synced_account_id: syncedAccountId,
                external_transaction_id: tx.transaction_id,
                amount: tx.amount * -1, // Plaid uses negative for credits
                currency: tx.iso_currency_code || "GBP",
                description: tx.name,
                merchant_name: tx.merchant_name,
                category: tx.personal_finance_category?.primary,
                transaction_date: tx.date,
                booking_date: tx.authorized_date,
                status: tx.pending ? "pending" : "booked",
              }, { onConflict: "synced_account_id,external_transaction_id" });
            
            if (!txError) transactionCount++;
          }
        }

        // Update connection last synced
        await supabase
          .from("connected_bank_accounts")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connectionId);

        return new Response(JSON.stringify({ 
          success: true,
          accountsCount: accountsData.accounts?.length || 0,
          transactionCount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        const { connectionId } = params;

        // Get the connection to remove item from Plaid
        const { data: connection } = await supabase
          .from("connected_bank_accounts")
          .select("consent_token")
          .eq("id", connectionId)
          .eq("user_id", userId)
          .single();

        if (connection?.consent_token) {
          // Remove item from Plaid
          await plaidRequest("/item/remove", {
            access_token: connection.consent_token,
          });
        }

        const { error } = await supabase
          .from("connected_bank_accounts")
          .delete()
          .eq("id", connectionId)
          .eq("user_id", userId);

        if (error) {
          return new Response(JSON.stringify({ error: "Failed to disconnect" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Open banking error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
