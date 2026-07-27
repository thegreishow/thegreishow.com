import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const allowedOrigins = new Set([
  "https://thegreishow.com",
  "https://www.thegreishow.com",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const origin = req.headers.get("origin") || "";
    if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.first_name || "").trim().slice(0, 80);
    const country = String(body.country || "").trim().slice(0, 80);
    const website = String(body.website || "").trim();

    if (website) return json(req, { ok: true });
    if (body.consent_to_marketing !== true) return json(req, { error: "Marketing consent is required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(req, { error: "Enter a valid email address" }, 400);
    }

    const supabase = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const now = new Date().toISOString();
    const { data: subscriber, error: dbError } = await supabase
      .from("release_list_subscribers")
      .upsert(
        {
          email,
          first_name: firstName || null,
          country: country || null,
          interests: ["music", "stories", "games", "events"],
          consent_to_marketing: true,
          consent_recorded_at: now,
          status: "subscribed",
          source: String(body.source || "thegreishow.com").slice(0, 200),
          user_agent: req.headers.get("user-agent"),
          referrer: String(body.referrer || "").slice(0, 500) || null,
          updated_at: now,
        },
        { onConflict: "email" },
      )
      .select("id,email,first_name,welcome_sent_at")
      .single();

    if (dbError) throw dbError;

    // The production Resend key is intentionally send-only. Subscriber records
    // live in Supabase; a welcome email is a best-effort follow-up, not a
    // prerequisite for joining the list.
    if (!subscriber.welcome_sent_at) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const greeting = escapeHtml(firstName || "friend");
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: "The Grei Show <updates@mail.thegreishow.com>",
              to: [email],
              reply_to: "thegreishow@gmail.com",
              subject: "Welcome to The Grei Show",
              html: welcomeHtml(greeting),
              text: `Hello ${firstName || "friend"},\n\nWelcome to the official release list for new music, stories, visuals, live moments and playable experiments from The Grei Show.\n\nEnter: https://thegreishow.com`,
              tags: [{ name: "flow", value: "release-list-welcome" }],
            }),
          });
          const emailBody = await emailResponse.json().catch(() => ({}));
          if (!emailResponse.ok) throw new Error(emailBody?.message || "Welcome email failed");
          const { error: updateError } = await supabase
            .from("release_list_subscribers")
            .update({ welcome_sent_at: new Date().toISOString(), resend_message_id: emailBody.id || null })
            .eq("id", subscriber.id);
          if (updateError) console.error("Could not record welcome delivery", updateError);
        }
      } catch (welcomeError) {
        console.error("Subscriber saved; welcome email deferred", welcomeError);
      }
    }

    return json(req, { ok: true, message: "You are on the list. Check your inbox." });
  } catch (error) {
    console.error(error);
    return json(req, { error: String(error?.message || error) }, 500);
  }
});

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function welcomeHtml(greeting: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#03060c"><table width="100%" cellpadding="0" cellspacing="0" bgcolor="#03060c"><tr><td align="center" style="padding:32px 16px"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0b111b;border-radius:16px"><tr><td style="padding:36px 32px 12px;font:700 12px Arial;color:#d8ff63;letter-spacing:2px">THE GREI SHOW</td></tr><tr><td style="padding:4px 32px 12px;font:700 32px/40px Arial;color:#f5f7fb">Welcome to the signal.</td></tr><tr><td style="padding:4px 32px 12px;font:16px/27px Arial;color:#d7dee8">Hello ${greeting},</td></tr><tr><td style="padding:0 32px 18px;font:16px/27px Arial;color:#d7dee8">You are now on the official release list for new music, stories, visuals, live moments and playable experiments from The Grei Show.</td></tr><tr><td style="padding:8px 32px 24px"><a href="https://thegreishow.com" style="display:inline-block;background:#d8ff63;border-radius:999px;padding:13px 22px;font:700 15px Arial;color:#03060c;text-decoration:none">Welcome to The Grei Show</a></td></tr><tr><td style="padding:4px 32px 32px;font:13px/21px Arial;color:#91a0b3">Independent music, stories and creative worlds from Jamaica.<br>Reply to this email anytime.</td></tr></table></td></tr></table></body></html>`;
}

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://thegreishow.com",
    "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}
