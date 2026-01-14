import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// App URL for deep-linking - uses preview URL or production URL
const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--ce393664-57f1-40bb-a2d9-ed3f18651f95.lovable.app";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const response = url.searchParams.get("response");

    console.log("delegation-response request", {
      method: req.method,
      token_present: !!token,
      response,
      user_agent: req.headers.get("user-agent") ?? "",
    });

    const htmlHeaders = { "Content-Type": "text/html; charset=utf-8", ...corsHeaders };

    if (!token || !response) {
      return new Response(renderErrorHtml("Missing required parameters"), {
        status: 400,
        headers: htmlHeaders,
      });
    }

    if (!["accepted", "rejected"].includes(response)) {
      return new Response(renderErrorHtml("Invalid response value"), {
        status: 400,
        headers: htmlHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("delegation-response missing backend env vars");
      return new Response(renderErrorHtml("Backend not configured"), {
        status: 500,
        headers: htmlHeaders,
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find the delegation response record
    const { data: delegationRecord, error: findErr } = await admin
      .from("task_delegation_responses")
      .select("id, task_id, responded_at")
      .eq("token", token)
      .maybeSingle();

    if (findErr || !delegationRecord) {
      console.error("delegation-response token lookup failed", { findErr });
      return new Response(renderErrorHtml("Invalid or expired link"), {
        status: 404,
        headers: htmlHeaders,
      });
    }

    // Check if already responded - redirect to app anyway
    if (delegationRecord.responded_at) {
      const redirectUrl = `${APP_URL}/todo?task=${delegationRecord.task_id}&delegation=already_responded`;
      return new Response(
        renderRedirectHtml("You have already responded to this task", true, redirectUrl),
        {
          status: 200,
          headers: htmlHeaders,
        }
      );
    }

    // Update the delegation response record
    const { error: updateDelegationErr } = await admin
      .from("task_delegation_responses")
      .update({
        response: response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", delegationRecord.id);

    if (updateDelegationErr) {
      console.error("delegation-response delegation update failed", updateDelegationErr);
      return new Response(renderErrorHtml("Failed to record your response"), {
        status: 500,
        headers: htmlHeaders,
      });
    }

    // Update the task's delegation status (and clear token so the same token can't be reused)
    const { error: updateTaskErr } = await admin
      .from("tasks")
      .update({
        delegation_status: response,
        delegation_responded_at: new Date().toISOString(),
        delegation_token: null,
      })
      .eq("id", delegationRecord.task_id);

    if (updateTaskErr) {
      console.error("delegation-response task update failed", updateTaskErr);
      return new Response(renderErrorHtml("Failed to update task"), {
        status: 500,
        headers: htmlHeaders,
      });
    }

    const isAccepted = response === "accepted";
    console.log("delegation-response updated", {
      task_id: delegationRecord.task_id,
      response,
    });

    // Redirect to app with task ID and response status
    const redirectUrl = `${APP_URL}/todo?task=${delegationRecord.task_id}&delegation=${response}`;
    
    return new Response(
      renderRedirectHtml(isAccepted ? "Task Accepted!" : "Task Declined", isAccepted, redirectUrl),
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error in delegation-response", error);
    return new Response(renderErrorHtml("An error occurred"), {
      status: 500,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...corsHeaders,
      },
    });
  }
});

function renderRedirectHtml(message: string, accepted: boolean, redirectUrl: string): string {
  const bgColor = accepted ? "#dcfce7" : "#fef2f2";
  const iconColor = accepted ? "#22c55e" : "#ef4444";
  const icon = accepted ? "✓" : "✕";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="2;url=${redirectUrl}">
  <title>Task Response</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bgColor};
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 420px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${iconColor};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin-bottom: 10px;
    }
    p {
      color: #666;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .redirect-notice {
      font-size: 12px;
      color: #999;
    }
    .btn {
      display: inline-block;
      background: ${iconColor};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 16px;
    }
    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${message}</h1>
    <p>Your response has been recorded.</p>
    <p class="redirect-notice">Redirecting to the app...</p>
    <a href="${redirectUrl}" class="btn">Open App Now</a>
  </div>
  <script>
    // Immediate redirect for better UX
    setTimeout(function() {
      window.location.href = "${redirectUrl}";
    }, 1500);
  </script>
</body>
</html>`;
}

function renderErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Response</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fef2f2;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 420px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      margin-bottom: 10px;
    }
    p {
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠</div>
    <h1>${message}</h1>
    <p>Please try again or contact support.</p>
  </div>
</body>
</html>`;
}

