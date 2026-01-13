import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TagTaskRequest = {
  taskId: string;
  taggedEmail: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function yyyymmdd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function yyyymmddThhmmss(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function weekdayToIcsByday(d: Date) {
  const day = d.getUTCDay();
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][day];
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function buildTaskIcs(opts: {
  uid: string;
  title: string;
  description?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  dueTime?: string | null; // HH:MM:SS or null
  repeatType?: string | null; // none/daily/weekly/monthly
}) {
  const dtstamp = yyyymmddThhmmss(new Date());

  // No due date => no calendar invite
  if (!opts.dueDate) return null;

  const safeTitle = escapeIcsText(opts.title);
  const safeDesc = escapeIcsText(opts.description ?? "");

  const baseDate = new Date(`${opts.dueDate}T00:00:00Z`);
  const repeat = opts.repeatType ?? "none";

  let dtstartLine = "";
  let dtendLine = "";

  if (!opts.dueTime) {
    // All-day event
    const start = yyyymmdd(baseDate);
    const endDate = new Date(baseDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = yyyymmdd(endDate);

    dtstartLine = `DTSTART;VALUE=DATE:${start}`;
    dtendLine = `DTEND;VALUE=DATE:${end}`;
  } else {
    // Timed event (default 60 minutes)
    const [hh, mm] = opts.dueTime.split(":").map((x) => parseInt(x, 10));
    const start = new Date(baseDate);
    start.setUTCHours(isNaN(hh) ? 9 : hh, isNaN(mm) ? 0 : mm, 0, 0);
    const end = new Date(start);
    end.setUTCMinutes(end.getUTCMinutes() + 60);

    dtstartLine = `DTSTART:${yyyymmddThhmmss(start)}`;
    dtendLine = `DTEND:${yyyymmddThhmmss(end)}`;
  }

  let rruleLine = "";
  if (repeat === "daily") {
    rruleLine = "RRULE:FREQ=DAILY";
  } else if (repeat === "weekly") {
    rruleLine = `RRULE:FREQ=WEEKLY;BYDAY=${weekdayToIcsByday(baseDate)}`;
  } else if (repeat === "monthly") {
    rruleLine = `RRULE:FREQ=MONTHLY;BYMONTHDAY=${baseDate.getUTCDate()}`;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lovable//Tasks//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${dtstamp}`,
    dtstartLine,
    dtendLine,
    `SUMMARY:${safeTitle}`,
    safeDesc ? `DESCRIPTION:${safeDesc}` : "",
    rruleLine,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, taggedEmail } = (await req.json()) as TagTaskRequest;

    if (!taskId || !taggedEmail) {
      return new Response(JSON.stringify({ error: "taskId and taggedEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidEmail(taggedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Missing backend env vars");
      return new Response(JSON.stringify({ error: "Backend not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabaseAuthed.auth.getUser();
    if (userErr || !userData?.user) {
      console.error("Auth error", userErr);
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Validate ownership + load task info for email/ICS
    const { data: task, error: taskErr } = await admin
      .from("tasks")
      .select("id,title,description,due_date,due_time,repeat_type,delegation_status")
      .eq("id", taskId)
      .eq("user_id", callerId)
      .single();

    if (taskErr || !task) {
      console.error("Task lookup failed", taskErr);
      return new Response(JSON.stringify({ error: "Task not found or not owned by you" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique token for this delegation
    const delegationToken = generateToken();

    // Create a delegation response record
    const { error: delegationInsertErr } = await admin
      .from("task_delegation_responses")
      .insert({
        task_id: taskId,
        email: taggedEmail,
        token: delegationToken,
      });

    if (delegationInsertErr) {
      console.error("Delegation insert failed", delegationInsertErr);
      // Continue anyway - the email can still be sent
    }

    // Upsert-ish: prevent duplicates in task_tags
    const { data: existing } = await admin
      .from("task_tags")
      .select("id")
      .eq("task_id", taskId)
      .eq("tagged_email", taggedEmail)
      .maybeSingle();

    let tagRecord = existing;

    if (!existing) {
      const { data: inserted, error: insertErr } = await admin
        .from("task_tags")
        .insert({ task_id: taskId, tagged_email: taggedEmail, created_by: callerId })
        .select()
        .single();

      if (insertErr) {
        console.error("Tag insert failed", insertErr);
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      tagRecord = inserted;
    }

    // Update task delegation status to pending
    await admin
      .from("tasks")
      .update({ 
        delegation_status: 'pending',
        delegation_token: delegationToken 
      })
      .eq("id", taskId);

    // Send email + calendar invite
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? Deno.env.get("Resend") ?? "";
    if (!resendApiKey) {
      console.error("Resend secret missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);

    const ics = buildTaskIcs({
      uid: `${task.id}@lovable`,
      title: task.title,
      description: task.description,
      dueDate: task.due_date,
      dueTime: task.due_time,
      repeatType: task.repeat_type,
    });

    // Build confirm/decline URLs - these will be handled by an edge function
    // NOTE: in HTML attributes, '&' should be escaped as '&amp;' otherwise some email clients truncate the URL.
    const baseUrl = supabaseUrl.replace('/rest/v1', '');
    const confirmUrl = `${baseUrl}/functions/v1/delegation-response?token=${delegationToken}&response=accepted`;
    const declineUrl = `${baseUrl}/functions/v1/delegation-response?token=${delegationToken}&response=rejected`;

    const confirmHref = confirmUrl.replace(/&/g, "&amp;");
    const declineHref = declineUrl.replace(/&/g, "&amp;");

    const htmlParts = [
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">`,
      `<h2 style="color: #333; margin-bottom: 20px;">New Task Assigned to You</h2>`,
      `<div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">`,
      `<h3 style="color: #1a1a1a; margin: 0 0 10px 0;">${escapeIcsText(task.title)}</h3>`,
      task.description ? `<p style="color: #666; margin: 0 0 10px 0;">${escapeIcsText(task.description)}</p>` : "",
      task.due_date ? `<p style="color: #888; font-size: 14px; margin: 0;"><strong>Due:</strong> ${task.due_date}${task.due_time ? ` at ${task.due_time}` : ""}</p>` : "",
      `</div>`,
      `<p style="color: #666; margin-bottom: 20px;">Please respond to confirm or decline this task:</p>`,
      `<div style="margin-bottom: 16px;">`,
      `<a href="${confirmHref}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; font-weight: 500;">✓ Accept Task</a>`,
      `<a href="${declineHref}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">✕ Decline Task</a>`,
      `</div>`,
      `<p style="color: #999; font-size: 12px; margin: 0;">If the buttons don't work, use these links:</p>`,
      `<p style="color: #666; font-size: 12px; margin: 8px 0 0;">Accept: <a href="${confirmHref}">${confirmUrl}</a></p>`,
      `<p style="color: #666; font-size: 12px; margin: 4px 0 0;">Decline: <a href="${declineHref}">${declineUrl}</a></p>`,
      `<p style="color: #999; font-size: 12px; margin-top: 18px;">If your email client supports it, you can also add the attached calendar invite.</p>`,
      `</div>`,
    ].filter(Boolean);

    const emailPayload: Record<string, unknown> = {
      from: "Tasks <onboarding@resend.dev>",
      to: [taggedEmail],
      subject: `Task assigned: ${task.title}`,
      html: htmlParts.join("\n"),
    };

    if (ics) {
      emailPayload.attachments = [
        {
          filename: "task.ics",
          content: btoa(ics),
          contentType: "text/calendar; charset=utf-8",
        },
      ];
    }

    const emailResult = await resend.emails.send(emailPayload as any);
    console.log("Email sent", emailResult);

    return new Response(JSON.stringify({ data: { tag: tagRecord, emailSent: true } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in tag-task", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
