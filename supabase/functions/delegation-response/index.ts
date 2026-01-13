import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const response = url.searchParams.get("response");

    if (!token || !response) {
      return new Response(renderHtml("Missing required parameters", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!["accepted", "rejected"].includes(response)) {
      return new Response(renderHtml("Invalid response value", false), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing backend env vars");
      return new Response(renderHtml("Backend not configured", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
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
      console.error("Token lookup failed", findErr);
      return new Response(renderHtml("Invalid or expired link", false), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Check if already responded
    if (delegationRecord.responded_at) {
      return new Response(renderHtml("You have already responded to this task", true, response === "accepted"), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
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
      console.error("Delegation update failed", updateDelegationErr);
    }

    // Update the task's delegation status
    const { error: updateTaskErr } = await admin
      .from("tasks")
      .update({
        delegation_status: response,
        delegation_responded_at: new Date().toISOString(),
      })
      .eq("id", delegationRecord.task_id);

    if (updateTaskErr) {
      console.error("Task update failed", updateTaskErr);
      return new Response(renderHtml("Failed to update task", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const isAccepted = response === "accepted";
    console.log(`Task ${delegationRecord.task_id} delegation ${response}`);

    return new Response(
      renderHtml(
        isAccepted ? "Task Accepted!" : "Task Declined",
        true,
        isAccepted
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("Error in delegation-response", error);
    return new Response(renderHtml("An error occurred", false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function renderHtml(message: string, success: boolean, accepted?: boolean): string {
  const bgColor = success ? (accepted ? "#dcfce7" : "#fef2f2") : "#fef2f2";
  const iconColor = success ? (accepted ? "#22c55e" : "#ef4444") : "#ef4444";
  const icon = success
    ? accepted
      ? "✓"
      : "✕"
    : "⚠";

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
      background: ${bgColor};
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
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
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${message}</h1>
    <p>${success ? "You can close this window." : "Please try again or contact support."}</p>
  </div>
</body>
</html>`;
}
