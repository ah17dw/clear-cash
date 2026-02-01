import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TRUELAYER_AUTH_URL = "https://auth.truelayer.com";
const TRUELAYER_API_URL = "https://api.truelayer.com";

// For sandbox testing, use these instead:
// const TRUELAYER_AUTH_URL = "https://auth.truelayer-sandbox.com";
// const TRUELAYER_API_URL = "https://api.truelayer-sandbox.com";

interface TrueLayerTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope: string;
}

async function getClientCredentialsToken(): Promise<string> {
  const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");
  const clientSecret = Deno.env.get("TRUELAYER_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("TrueLayer credentials not configured");
  }

  const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "info accounts balance transactions",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TrueLayer token error:", errorText);
    throw new Error(`Failed to get TrueLayer token: ${errorText}`);
  }

  const data: TrueLayerTokenResponse = await response.json();
  return data.access_token;
}

async function exchangeAuthCode(
  code: string,
  redirectUri: string
): Promise<TrueLayerTokenResponse> {
  const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");
  const clientSecret = Deno.env.get("TRUELAYER_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("TrueLayer credentials not configured");
  }

  const response = await fetch(`${TRUELAYER_AUTH_URL}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TrueLayer token exchange error:", errorText);
    throw new Error(`Failed to exchange code: ${errorText}`);
  }

  return await response.json();
}

async function listProviders(country: string = "gb") {
  const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");

  if (!clientId) {
    throw new Error("TrueLayer credentials not configured");
  }

  // TrueLayer providers endpoint
  const response = await fetch(
    `${TRUELAYER_AUTH_URL}/api/providers?client_id=${clientId}&response_type=code&response_mode=query&scope=info%20accounts%20balance%20transactions&providers=uk-ob-all`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TrueLayer providers error:", errorText);
    throw new Error(`Failed to list providers: ${errorText}`);
  }

  const data = await response.json();
  return data.results || data;
}

function buildAuthLink(redirectUri: string, providerId?: string): { authUrl: string; state: string } {
  const clientId = Deno.env.get("TRUELAYER_CLIENT_ID");

  if (!clientId) {
    throw new Error("TrueLayer credentials not configured");
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "info accounts balance transactions",
    redirect_uri: redirectUri,
    state,
    providers: providerId || "uk-ob-all",
    // IMPORTANT: SPA callback routes can't read POST bodies, so we need the code in the URL.
    response_mode: "query",
  });

  return {
    authUrl: `${TRUELAYER_AUTH_URL}/?${params.toString()}`,
    state,
  };
}

async function getAccounts(accessToken: string) {
  const response = await fetch(`${TRUELAYER_API_URL}/data/v1/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TrueLayer accounts error:", errorText);
    throw new Error(`Failed to get accounts: ${errorText}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function getAccountBalance(accessToken: string, accountId: string) {
  const response = await fetch(
    `${TRUELAYER_API_URL}/data/v1/accounts/${accountId}/balance`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TrueLayer balance error:", errorText);
    throw new Error(`Failed to get balance: ${errorText}`);
  }

  const data = await response.json();
  return data.results?.[0] || null;
}

async function getAccountTransactions(
  accessToken: string,
  accountId: string,
  from?: string,
  to?: string
) {
  let url = `${TRUELAYER_API_URL}/data/v1/accounts/${accountId}/transactions`;

  if (from || to) {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("TrueLayer transactions error:", errorText);
    throw new Error(`Failed to get transactions: ${errorText}`);
  }

  const data = await response.json();
  return data.results || [];
}

async function getAccountStandingOrders(accessToken: string, accountId: string) {
  const response = await fetch(
    `${TRUELAYER_API_URL}/data/v1/accounts/${accountId}/standing_orders`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    // Standing orders might not be supported for all accounts
    if (response.status === 501) {
      return [];
    }
    const errorText = await response.text();
    console.error("TrueLayer standing orders error:", errorText);
    throw new Error(`Failed to get standing orders: ${errorText}`);
  }

  const data = await response.json();
  return data.results || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();
    console.info(`TrueLayer action: ${action}`);

    let result;

    switch (action) {
      case "list-providers": {
        const providers = await listProviders(params.country || "gb");
        result = { providers };
        break;
      }

      case "create-auth-link": {
        const { redirectUri, providerId } = params;
        if (!redirectUri) {
          throw new Error("redirectUri is required");
        }

        const authLink = buildAuthLink(redirectUri, providerId);
        result = authLink;
        break;
      }

      case "complete-auth": {
        const { code, redirectUri } = params;
        if (!code || !redirectUri) {
          throw new Error("code and redirectUri are required");
        }

        // Exchange the authorization code for tokens
        const tokenData = await exchangeAuthCode(code, redirectUri);

        // Get accounts to verify connection and store metadata
        const accounts = await getAccounts(tokenData.access_token);

        if (accounts.length === 0) {
          throw new Error("No accounts found with this bank connection");
        }

        // Extract bank name from the first account's provider info
        // TrueLayer returns provider info in various formats
        const firstAccount = accounts[0];
        let institutionId = "truelayer";
        let institutionName = "Connected Bank";
        
        // Try to get provider info from account
        if (firstAccount?.provider?.provider_id) {
          institutionId = firstAccount.provider.provider_id;
          institutionName = firstAccount.provider.display_name || firstAccount.provider.provider_id;
        } else if (firstAccount?.provider?.display_name) {
          institutionName = firstAccount.provider.display_name;
        }
        
        // Map common UK bank connector IDs to friendly names
        const bankNameMap: Record<string, string> = {
          "ob-natwest": "NatWest",
          "ob-rbs": "Royal Bank of Scotland",
          "ob-hsbc": "HSBC",
          "ob-barclays": "Barclays",
          "ob-lloyds": "Lloyds Bank",
          "ob-halifax": "Halifax",
          "ob-santander": "Santander",
          "ob-nationwide": "Nationwide",
          "ob-tsb": "TSB",
          "ob-monzo": "Monzo",
          "ob-starling": "Starling Bank",
          "ob-revolut": "Revolut",
          "ob-chase": "Chase UK",
          "ob-first-direct": "First Direct",
        };
        
        // Check if we can extract connector_id from JWT claims
        try {
          const tokenParts = tokenData.access_token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.connector_id) {
              institutionId = payload.connector_id;
              institutionName = bankNameMap[payload.connector_id] || payload.connector_id.replace("ob-", "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
            }
          }
        } catch (e) {
          console.log("Could not parse JWT for connector_id, using account provider info");
        }

        // Store the connection in database
        const { data: connection, error: insertError } = await supabase
          .from("connected_bank_accounts")
          .insert({
            user_id: user.id,
            institution_id: institutionId,
            institution_name: institutionName,
            consent_token: tokenData.access_token,
            consent_expires_at: tokenData.refresh_token
              ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            provider: "truelayer",
            account_ids: accounts.map((a: any) => a.account_id),
            status: "active",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to save connection:", insertError);
          throw new Error("Failed to save bank connection");
        }

        // Sync accounts immediately
        for (const account of accounts) {
          try {
            const balance = await getAccountBalance(
              tokenData.access_token,
              account.account_id
            );

            const { error: syncError } = await supabase.from("synced_bank_accounts").upsert(
              {
                user_id: user.id,
                connection_id: connection.id,
                external_account_id: account.account_id,
                account_type: account.account_type || "unknown",
                account_name:
                  account.display_name ||
                  account.account_number?.number ||
                  "Bank Account",
                currency: balance?.currency || "GBP",
                balance: balance?.current || 0,
                available_balance: balance?.available || null,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "external_account_id" }
            );
            
            if (syncError) {
              console.error("Failed to sync account:", syncError);
            }
          } catch (accountErr) {
            console.error("Error syncing account:", accountErr);
          }
        }

        // Update last_synced_at on connection
        await supabase
          .from("connected_bank_accounts")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connection.id);

        result = {
          success: true,
          connectionId: connection.id,
          accountsCount: accounts.length,
          institutionName,
        };
        break;
      }

      case "sync-accounts": {
        const { connectionId } = params;
        if (!connectionId) {
          throw new Error("connectionId is required");
        }

        // Get connection
        const { data: connection, error: connError } = await supabase
          .from("connected_bank_accounts")
          .select("*")
          .eq("id", connectionId)
          .eq("user_id", user.id)
          .eq("provider", "truelayer")
          .single();

        if (connError || !connection) {
          throw new Error("Connection not found");
        }

        const accessToken = connection.consent_token;
        const accounts = await getAccounts(accessToken);
        let transactionCount = 0;

        for (const account of accounts) {
          // Get balance
          const balance = await getAccountBalance(accessToken, account.account_id);

          // Upsert synced account
          const { data: syncedAccount, error: syncError } = await supabase
            .from("synced_bank_accounts")
            .upsert(
              {
                user_id: user.id,
                connection_id: connectionId,
                external_account_id: account.account_id,
                account_type: account.account_type || "unknown",
                account_name:
                  account.display_name ||
                  account.account_number?.number ||
                  "Bank Account",
                currency: balance?.currency || "GBP",
                balance: balance?.current || 0,
                available_balance: balance?.available || null,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "external_account_id" }
            )
            .select()
            .single();

          if (syncError) {
            console.error("Failed to sync account:", syncError);
            continue;
          }

          // Update linked savings/debt balances
          if (syncedAccount?.linked_savings_id) {
            await supabase
              .from("savings_accounts")
              .update({ balance: balance?.current || 0 })
              .eq("id", syncedAccount.linked_savings_id);
          }

          if (syncedAccount?.linked_debt_id) {
            await supabase
              .from("debts")
              .update({ balance: Math.abs(balance?.current || 0) })
              .eq("id", syncedAccount.linked_debt_id);
          }

          // Get transactions (last 90 days)
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 90);

          try {
            const transactions = await getAccountTransactions(
              accessToken,
              account.account_id,
              fromDate.toISOString().split("T")[0]
            );

            for (const tx of transactions) {
              const { error: txError } = await supabase
                .from("synced_transactions")
                .upsert(
                  {
                    user_id: user.id,
                    synced_account_id: syncedAccount.id,
                    external_transaction_id: tx.transaction_id,
                    amount: tx.amount,
                    currency: tx.currency || "GBP",
                    description: tx.description,
                    merchant_name: tx.merchant_name,
                    category: tx.transaction_category,
                    transaction_date: tx.timestamp?.split("T")[0] || new Date().toISOString().split("T")[0],
                    status: tx.transaction_type === "PENDING" ? "pending" : "booked",
                  },
                  { onConflict: "external_transaction_id" }
                );

              if (!txError) {
                transactionCount++;
              }
            }
          } catch (txErr) {
            console.error("Failed to sync transactions:", txErr);
          }

          // Get standing orders
          try {
            const standingOrders = await getAccountStandingOrders(
              accessToken,
              account.account_id
            );

            for (const order of standingOrders) {
              await supabase.from("synced_standing_orders").upsert(
                {
                  user_id: user.id,
                  synced_account_id: syncedAccount.id,
                  external_order_id: order.standing_order_id || crypto.randomUUID(),
                  amount: order.amount,
                  currency: order.currency || "GBP",
                  reference: order.reference,
                  payee_name: order.payee,
                  frequency: order.frequency,
                  next_payment_date: order.next_payment_date,
                  first_payment_date: order.first_payment_date,
                  final_payment_date: order.final_payment_date,
                  status: "active",
                },
                { onConflict: "external_order_id" }
              );
            }
          } catch (soErr) {
            console.error("Failed to sync standing orders:", soErr);
          }
        }

        // Update connection last_synced_at
        await supabase
          .from("connected_bank_accounts")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", connectionId);

        result = {
          success: true,
          accountsCount: accounts.length,
          transactionCount,
        };
        break;
      }

      case "disconnect": {
        const { connectionId } = params;
        if (!connectionId) {
          throw new Error("connectionId is required");
        }

        // Delete synced data
        const { data: syncedAccounts } = await supabase
          .from("synced_bank_accounts")
          .select("id")
          .eq("connection_id", connectionId);

        if (syncedAccounts) {
          const accountIds = syncedAccounts.map((a) => a.id);

          await supabase
            .from("synced_transactions")
            .delete()
            .in("synced_account_id", accountIds);

          await supabase
            .from("synced_standing_orders")
            .delete()
            .in("synced_account_id", accountIds);

          await supabase
            .from("synced_bank_accounts")
            .delete()
            .eq("connection_id", connectionId);
        }

        await supabase
          .from("connected_bank_accounts")
          .delete()
          .eq("id", connectionId)
          .eq("user_id", user.id);

        result = { success: true };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("TrueLayer error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
