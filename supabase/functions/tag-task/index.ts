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
      .select("id,title,description,due_date,due_time,repeat_type")
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

    // Upsert-ish: prevent duplicates
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

    const htmlParts = [
      `<h2>New task assigned</h2>`,
      `<p><strong>${escapeIcsText(task.title)}</strong></p>`,
      task.description ? `<p>${escapeIcsText(task.description)}</p>` : "",
      task.due_date ? `<p>Due: ${task.due_date}${task.due_time ? ` ${task.due_time}` : ""}</p>` : "",
      `<p>If your email client supports it, you can add the attached calendar invite.</p>`,
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
