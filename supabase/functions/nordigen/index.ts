import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NORDIGEN_API_URL = "https://bankaccountdata.gocardless.com/api/v2";

interface NordigenToken {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

let cachedToken: { token: NordigenToken; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    return cachedToken.token.access;
  }
  
  const secretId = Deno.env.get("GOCARDLESS_SECRET_ID");
  const secretKey = Deno.env.get("GOCARDLESS_SECRET_KEY");
  
  if (!secretId || !secretKey) {
    throw new Error("GoCardless credentials not configured");
  }
  
  const response = await fetch(`${NORDIGEN_API_URL}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: secretId,
      secret_key: secretKey,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error("Failed to get access token");
  }
  
  const token: NordigenToken = await response.json();
  cachedToken = {
    token,
    expiresAt: now + token.access_expires * 1000,
  };
  
  return token.access;
}

async function nordigenRequest(
  path: string, 
  method: string = "GET", 
  body?: Record<string, unknown>
): Promise<Response> {
  const accessToken = await getAccessToken();
  
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return await fetch(`${NORDIGEN_API_URL}${path}`, options);
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
      case "list-institutions": {
        const { country = "GB" } = params;
        
        const response = await nordigenRequest(`/institutions/?country=${country}`);
        const data = await response.json();
        
        if (!response.ok) {
          console.error("Nordigen institutions error:", data);
          return new Response(JSON.stringify({ error: data.detail || "Failed to fetch institutions" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Return simplified institution list
        const institutions = data.map((inst: any) => ({
          id: inst.id,
          name: inst.name,
          logo: inst.logo,
          countries: inst.countries,
          transactionTotalDays: inst.transaction_total_days,
        }));
        
        return new Response(JSON.stringify({ institutions }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create-requisition": {
        const { institutionId, redirectUri } = params;
        
        if (!institutionId || !redirectUri) {
          return new Response(JSON.stringify({ error: "Missing institutionId or redirectUri" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Create end user agreement first (optional, for max days access)
        const agreementResponse = await nordigenRequest("/agreements/enduser/", "POST", {
          institution_id: institutionId,
          max_historical_days: 730, // 2 years
          access_valid_for_days: 90,
          access_scope: ["balances", "details", "transactions"],
        });
        
        let agreementId: string | undefined;
        if (agreementResponse.ok) {
          const agreement = await agreementResponse.json();
          agreementId = agreement.id;
        }
        
        // Create requisition
        const requisitionBody: Record<string, unknown> = {
          redirect: redirectUri,
          institution_id: institutionId,
          reference: `user_${userId}_${Date.now()}`,
          user_language: "EN",
        };
        
        if (agreementId) {
          requisitionBody.agreement = agreementId;
        }
        
        const response = await nordigenRequest("/requisitions/", "POST", requisitionBody);
        const data = await response.json();
        
        if (!response.ok) {
          console.error("Nordigen requisition error:", data);
          return new Response(JSON.stringify({ error: data.detail || "Failed to create requisition" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ 
          requisitionId: data.id,
          link: data.link,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "complete-requisition": {
        const { requisitionId, institutionName } = params;
        
        if (!requisitionId) {
          return new Response(JSON.stringify({ error: "Missing requisitionId" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Get requisition status
        const response = await nordigenRequest(`/requisitions/${requisitionId}/`);
        const data = await response.json();
        
        if (!response.ok) {
          console.error("Nordigen requisition status error:", data);
          return new Response(JSON.stringify({ error: data.detail || "Failed to get requisition" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        if (data.status !== "LN") { // LN = Linked
          return new Response(JSON.stringify({ 
            error: "Requisition not completed",
            status: data.status,
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Store the connection
        const { data: connection, error: connError } = await supabase
          .from("connected_bank_accounts")
          .insert({
            user_id: userId,
            institution_id: data.institution_id,
            institution_name: institutionName || data.institution_id,
            consent_token: requisitionId, // Store requisition ID as token
            requisition_id: requisitionId,
            provider: "nordigen",
            consent_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            account_ids: data.accounts,
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

        // Sync accounts immediately
        let accountsCount = 0;
        for (const accountId of data.accounts || []) {
          const accountResponse = await nordigenRequest(`/accounts/${accountId}/`);
          const accountData = await accountResponse.json();
          
          if (!accountResponse.ok) continue;
          
          // Get account details
          const detailsResponse = await nordigenRequest(`/accounts/${accountId}/details/`);
          const detailsData = detailsResponse.ok ? await detailsResponse.json() : {};
          
          // Get account balances
          const balancesResponse = await nordigenRequest(`/accounts/${accountId}/balances/`);
          const balancesData = balancesResponse.ok ? await balancesResponse.json() : {};
          
          const balance = balancesData.balances?.[0]?.balanceAmount?.amount || 0;
          const currency = balancesData.balances?.[0]?.balanceAmount?.currency || "GBP";
          
          await supabase.from("synced_bank_accounts").insert({
            user_id: userId,
            connection_id: connection.id,
            external_account_id: accountId,
            account_type: detailsData.account?.cashAccountType || accountData.status || "UNKNOWN",
            account_name: detailsData.account?.name || detailsData.account?.ownerName || "Account",
            currency,
            balance: parseFloat(balance),
            available_balance: null,
            last_synced_at: new Date().toISOString(),
          });
          accountsCount++;
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
          .eq("provider", "nordigen")
          .single();

        if (connError || !connection) {
          return new Response(JSON.stringify({ error: "Connection not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const requisitionId = connection.requisition_id;
        let transactionCount = 0;
        let accountsCount = 0;
        
        // Get requisition to get account IDs
        const reqResponse = await nordigenRequest(`/requisitions/${requisitionId}/`);
        const reqData = await reqResponse.json();
        
        if (!reqResponse.ok || reqData.status !== "LN") {
          await supabase
            .from("connected_bank_accounts")
            .update({ status: "expired" })
            .eq("id", connectionId);
            
          return new Response(JSON.stringify({ error: "Requisition expired or invalid" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        for (const accountId of reqData.accounts || []) {
          // Get account balances
          const balancesResponse = await nordigenRequest(`/accounts/${accountId}/balances/`);
          const balancesData = balancesResponse.ok ? await balancesResponse.json() : {};
          
          const balance = parseFloat(balancesData.balances?.[0]?.balanceAmount?.amount || "0");
          const currency = balancesData.balances?.[0]?.balanceAmount?.currency || "GBP";
          
          // Upsert account
          const { data: syncedAccount } = await supabase
            .from("synced_bank_accounts")
            .upsert({
              user_id: userId,
              connection_id: connectionId,
              external_account_id: accountId,
              account_type: "ACCOUNT",
              account_name: "Account",
              currency,
              balance,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: "connection_id,external_account_id" })
            .select()
            .single();

          if (!syncedAccount) continue;
          accountsCount++;

          // Update linked savings/debt balances
          if (syncedAccount.linked_savings_id) {
            await supabase
              .from("savings_accounts")
              .update({ balance })
              .eq("id", syncedAccount.linked_savings_id);
          }
          if (syncedAccount.linked_debt_id) {
            await supabase
              .from("debts")
              .update({ balance: Math.abs(balance) })
              .eq("id", syncedAccount.linked_debt_id);
          }

          // Get transactions
          const txResponse = await nordigenRequest(`/accounts/${accountId}/transactions/`);
          const txData = txResponse.ok ? await txResponse.json() : {};
          
          for (const tx of txData.transactions?.booked || []) {
            const { error: txError } = await supabase
              .from("synced_transactions")
              .upsert({
                user_id: userId,
                synced_account_id: syncedAccount.id,
                external_transaction_id: tx.transactionId || tx.internalTransactionId || `${accountId}_${tx.bookingDate}_${tx.transactionAmount.amount}`,
                amount: parseFloat(tx.transactionAmount.amount),
                currency: tx.transactionAmount.currency,
                description: tx.remittanceInformationUnstructured || tx.additionalInformation,
                merchant_name: tx.creditorName || tx.debtorName,
                category: null,
                transaction_date: tx.bookingDate,
                booking_date: tx.valueDate,
                status: "booked",
              }, { onConflict: "synced_account_id,external_transaction_id" });
            
            if (!txError) transactionCount++;
          }
        }

        // Update connection last synced
        await supabase
          .from("connected_bank_accounts")
          .update({ 
            last_synced_at: new Date().toISOString(),
            account_ids: reqData.accounts,
          })
          .eq("id", connectionId);

        return new Response(JSON.stringify({ 
          success: true,
          accountsCount,
          transactionCount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        const { connectionId } = params;

        const { data: connection } = await supabase
          .from("connected_bank_accounts")
          .select("requisition_id")
          .eq("id", connectionId)
          .eq("user_id", userId)
          .eq("provider", "nordigen")
          .single();

        if (connection?.requisition_id) {
          // Delete requisition from Nordigen
          await nordigenRequest(`/requisitions/${connection.requisition_id}/`, "DELETE");
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
    console.error("Nordigen error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
