import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YAPILY_API_URL = "https://api.yapily.com";

async function getYapilyAuth(): Promise<string> {
  const appKey = Deno.env.get("YAPILY_APPLICATION_KEY");
  const appSecret = Deno.env.get("YAPILY_APPLICATION_SECRET");
  
  if (!appKey || !appSecret) {
    throw new Error("Yapily credentials not configured");
  }
  
  return btoa(`${appKey}:${appSecret}`);
}

async function yapilyRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const auth = await getYapilyAuth();
  
  const response = await fetch(`${YAPILY_API_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
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
      case "get-institutions": {
        const response = await yapilyRequest("/institutions");
        const data = await response.json();
        
        // Filter to UK institutions only
        const ukInstitutions = data.data?.filter((inst: any) => 
          inst.countries?.some((c: any) => c.countryCode2 === "GB")
        ) || [];
        
        return new Response(JSON.stringify({ institutions: ukInstitutions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create-authorization": {
        const { institutionId, callbackUrl } = params;
        
        const response = await yapilyRequest("/account-auth-requests", {
          method: "POST",
          body: JSON.stringify({
            applicationUserId: userId,
            institutionId,
            callback: callbackUrl,
            accountRequest: {
              transactionFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              transactionTo: new Date().toISOString().split("T")[0],
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              featureScope: ["ACCOUNTS", "ACCOUNT_TRANSACTIONS", "ACCOUNT_STATEMENTS", "ACCOUNT_SCHEDULED_PAYMENTS"],
            },
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          console.error("Yapily authorization error:", data);
          return new Response(JSON.stringify({ error: data.error?.message || "Failed to create authorization" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ 
          authorisationUrl: data.data?.authorisationUrl,
          userUuid: data.data?.userUuid,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "exchange-consent": {
        const { consentToken, institutionId, institutionName } = params;
        
        // Store the consent
        const { data: connection, error: connError } = await supabase
          .from("connected_bank_accounts")
          .insert({
            user_id: userId,
            institution_id: institutionId,
            institution_name: institutionName,
            consent_token: consentToken,
            consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active",
          })
          .select()
          .single();

        if (connError) {
          console.error("Error storing consent:", connError);
          return new Response(JSON.stringify({ error: "Failed to store consent" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Fetch accounts
        const accountsResponse = await yapilyRequest("/accounts", {
          headers: { "Consent": consentToken },
        });
        const accountsData = await accountsResponse.json();

        if (accountsData.data) {
          for (const account of accountsData.data) {
            await supabase.from("synced_bank_accounts").insert({
              user_id: userId,
              connection_id: connection.id,
              external_account_id: account.id,
              account_type: account.accountType || "UNKNOWN",
              account_name: account.accountNames?.[0]?.name || account.nickname || "Account",
              currency: account.currency || "GBP",
              balance: account.balance || 0,
              available_balance: account.availableBalance,
              last_synced_at: new Date().toISOString(),
            });
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          connectionId: connection.id,
          accountsCount: accountsData.data?.length || 0,
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

        const consentToken = connection.consent_token;

        // Fetch accounts
        const accountsResponse = await yapilyRequest("/accounts", {
          headers: { "Consent": consentToken },
        });
        const accountsData = await accountsResponse.json();

        if (!accountsResponse.ok) {
          console.error("Yapily accounts error:", accountsData);
          
          // Mark connection as expired if consent is invalid
          if (accountsData.error?.code === "CONSENT_EXPIRED" || accountsData.error?.code === "CONSENT_REVOKED") {
            await supabase
              .from("connected_bank_accounts")
              .update({ status: "expired" })
              .eq("id", connectionId);
          }
          
          return new Response(JSON.stringify({ error: accountsData.error?.message || "Failed to sync accounts" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let transactionCount = 0;
        let standingOrderCount = 0;

        for (const account of accountsData.data || []) {
          // Upsert account
          const { data: syncedAccount } = await supabase
            .from("synced_bank_accounts")
            .upsert({
              user_id: userId,
              connection_id: connectionId,
              external_account_id: account.id,
              account_type: account.accountType || "UNKNOWN",
              account_name: account.accountNames?.[0]?.name || account.nickname || "Account",
              currency: account.currency || "GBP",
              balance: account.balance || 0,
              available_balance: account.availableBalance,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "connection_id,external_account_id" })
            .select()
            .single();

          if (!syncedAccount) continue;

          // Update linked savings/debt balances
          if (syncedAccount.linked_savings_id) {
            await supabase
              .from("savings_accounts")
              .update({ balance: account.balance || 0 })
              .eq("id", syncedAccount.linked_savings_id);
          }
          if (syncedAccount.linked_debt_id) {
            await supabase
              .from("debts")
              .update({ balance: Math.abs(account.balance || 0) })
              .eq("id", syncedAccount.linked_debt_id);
          }

          // Fetch transactions
          const txResponse = await yapilyRequest(`/accounts/${account.id}/transactions`, {
            headers: { "Consent": consentToken },
          });
          const txData = await txResponse.json();

          if (txData.data) {
            for (const tx of txData.data) {
              const { error: txError } = await supabase
                .from("synced_transactions")
                .upsert({
                  user_id: userId,
                  synced_account_id: syncedAccount.id,
                  external_transaction_id: tx.id,
                  amount: tx.amount || 0,
                  currency: tx.currency || "GBP",
                  description: tx.description || tx.reference,
                  merchant_name: tx.merchant?.merchantName,
                  category: tx.enrichment?.category?.mainCategory,
                  transaction_date: tx.date || tx.bookingDateTime?.split("T")[0],
                  booking_date: tx.bookingDateTime?.split("T")[0],
                  status: tx.status || "booked",
                }, { onConflict: "synced_account_id,external_transaction_id" });
              
              if (!txError) transactionCount++;
            }
          }

          // Fetch standing orders
          const soResponse = await yapilyRequest(`/accounts/${account.id}/scheduled-payments`, {
            headers: { "Consent": consentToken },
          });
          const soData = await soResponse.json();

          if (soData.data) {
            for (const so of soData.data) {
              const { error: soError } = await supabase
                .from("synced_standing_orders")
                .upsert({
                  user_id: userId,
                  synced_account_id: syncedAccount.id,
                  external_order_id: so.id,
                  amount: so.amountDetails?.amount || 0,
                  currency: so.amountDetails?.currency || "GBP",
                  reference: so.reference,
                  payee_name: so.payee?.name,
                  frequency: so.scheduledPaymentType,
                  next_payment_date: so.scheduledPaymentDateTime?.split("T")[0],
                  first_payment_date: so.firstPaymentDateTime?.split("T")[0],
                  final_payment_date: so.finalPaymentDateTime?.split("T")[0],
                  status: so.status || "active",
                }, { onConflict: "synced_account_id,external_order_id" });
              
              if (!soError) standingOrderCount++;
            }
          }
        }

        // Update connection last synced
        await supabase
          .from("connected_bank_accounts")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connectionId);

        return new Response(JSON.stringify({ 
          success: true,
          accountsCount: accountsData.data?.length || 0,
          transactionCount,
          standingOrderCount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        const { connectionId } = params;

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
