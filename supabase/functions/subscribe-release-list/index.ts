import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const allowedOrigins = new Set([
  "https://thegreishow.com",
  "https://www.thegreishow.com",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const consentVersion = "2026-07-27";
const fanTopicName = "New Music & Artist Updates";
const fanTopicId = "f9a8d25e-d9c9-4788-bd78-6de0b1e6d228";
const confirmationLifetimeMs = 24 * 60 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();
const rateWindowMs = 10 * 60 * 1000;
const rateLimit = 5;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });

  try {
    const url = new URL(req.url);
    if (req.method === "GET" && url.searchParams.has("token")) {
      return await confirmSubscription(url.searchParams.get("token") || "");
    }
    if (req.method === "POST") return await requestConfirmation(req);
    return json(req, { error: "Method not allowed" }, 405);
  } catch (error) {
    console.error(error);
    return json(req, { error: "The subscription could not be updated right now." }, 500);
  }
});

async function requestConfirmation(req: Request) {
  const origin = req.headers.get("origin") || "";
  if (!allowedOrigins.has(origin)) {
    return json(req, { error: "Origin not allowed" }, 403);
  }
  if (Number(req.headers.get("content-length") || 0) > 12_000) {
    return json(req, { error: "Request too large" }, 413);
  }
  if (!consumeRateLimit(req)) {
    return json(req, { error: "Too many signup attempts. Please try again later." }, 429);
  }

  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const firstName = String(body.first_name || "").trim().slice(0, 80);
  const country = String(body.country || "").trim().slice(0, 80);
  const website = String(body.website || "").trim();

  if (website) return json(req, { ok: true });
  if (!(await verifyTurnstile(req, body))) {
    return json(req, { error: "Human verification failed. Please try again." }, 400);
  }
  // Accept the legacy browser field during the static-site rollout; either way,
  // the address remains pending until the inbox confirmation link is clicked.
  const consentGranted =
    body.consent_to_marketing === true || body.marketing_consent === true;
  if (!consentGranted) {
    return json(req, { error: "Marketing consent is required" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json(req, { error: "Enter a valid email address" }, 400);
  }

  const supabase = adminClient();
  const { data: existing, error: existingError } = await supabase
    .from("release_list_subscribers")
    .select("id,status,confirmed_at")
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing?.confirmed_at || existing?.status === "confirmed") {
    return json(req, {
      ok: true,
      message: "This address is already confirmed for The Grei Signal.",
    });
  }
  if (existing?.status === "suppressed") {
    return json(req, {
      ok: true,
      message: "If this address is eligible, a confirmation email will arrive shortly.",
    });
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + confirmationLifetimeMs);
  const referrer = String(body.referrer || "").slice(0, 500) || null;

  const { data: subscriber, error: dbError } = await supabase
    .from("release_list_subscribers")
    .upsert(
      {
        email,
        first_name: firstName || null,
        country: country || null,
        interests: ["music", "stories", "games", "events"],
        consent_to_marketing: true,
        consent_recorded_at: now.toISOString(),
        consent_version: consentVersion,
        topic_preference: fanTopicName,
        status: "pending",
        source: "website:release-list",
        user_agent: req.headers.get("user-agent"),
        referrer,
        confirmation_token_hash: tokenHash,
        confirmation_expires_at: expiresAt.toISOString(),
        confirmed_at: null,
        resend_contact_id: null,
        resend_event_sent_at: null,
        updated_at: now.toISOString(),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (dbError) throw dbError;

  const confirmUrl =
    `${required("SUPABASE_URL")}/functions/v1/subscribe-release-list?token=${encodeURIComponent(token)}`;
  const confirmation = await resend("/emails", {
    method: "POST",
    headers: { "Idempotency-Key": `confirm-release-list/${subscriber.id}/${tokenHash.slice(0, 16)}` },
    body: {
      from: "The Grei Show <hello@mail.thegreishow.com>",
      to: [email],
      reply_to: "thegreishow@gmail.com",
      subject: "Confirm your Grei Signal subscription",
      html: confirmationHtml(firstName, confirmUrl),
      text:
        `Hello ${firstName || "friend"},\n\nConfirm that you want The Grei Signal: ${confirmUrl}\n\n` +
        "The link expires in 24 hours. If you did not request this, ignore this email.",
      tags: [{ name: "flow", value: "release-list-confirmation" }],
    },
  });

  const { error: sentError } = await supabase
    .from("release_list_subscribers")
    .update({
      confirmation_sent_at: new Date().toISOString(),
      resend_message_id: confirmation.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriber.id);
  if (sentError) console.error("Could not record confirmation delivery", sentError);

  return json(req, {
    ok: true,
    message: "Check your inbox and confirm your subscription within 24 hours.",
  });
}

function consumeRateLimit(req: Request) {
  const ip = (req.headers.get("x-form-client") || req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown")
    .split(",")[0]
    .trim();
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + rateWindowMs });
    return true;
  }
  if (current.count >= rateLimit) return false;
  current.count += 1;
  if (attempts.size > 5000) {
    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key);
    }
  }
  return true;
}

async function verifyTurnstile(req: Request, body: Record<string, unknown>) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  const token = String(body.turnstile_token || body["cf-turnstile-response"] || "").slice(0, 2048);
  if (!token) return false;
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  if (ip) form.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  return Boolean(result.success && (!result.action || result.action === "newsletter"));
}

async function confirmSubscription(token: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) {
    return confirmationPage("Invalid confirmation link", "This confirmation link is not valid.", 400);
  }

  const supabase = adminClient();
  const tokenHash = await sha256(token);
  const { data: subscriber, error } = await supabase
    .from("release_list_subscribers")
    .select(
      "id,email,first_name,status,confirmed_at,confirmation_expires_at,consent_version,topic_preference,resend_event_sent_at",
    )
    .eq("confirmation_token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!subscriber) {
    return confirmationPage("Invalid confirmation link", "This confirmation link is not valid.", 400);
  }
  if (
    !subscriber.confirmed_at &&
    (!subscriber.confirmation_expires_at ||
      new Date(subscriber.confirmation_expires_at).getTime() < Date.now())
  ) {
    return confirmationPage(
      "Confirmation link expired",
      "Return to thegreishow.com and join again for a fresh link.",
      410,
    );
  }

  const confirmedAt = subscriber.confirmed_at || new Date().toISOString();
  if (!subscriber.confirmed_at) {
    const { error: confirmError } = await supabase
      .from("release_list_subscribers")
      .update({
        status: "confirmed",
        confirmed_at: confirmedAt,
        updated_at: confirmedAt,
      })
      .eq("id", subscriber.id)
      .is("confirmed_at", null);
    if (confirmError) throw confirmError;
  }

  if (!subscriber.resend_event_sent_at) {
    const contact = await upsertConfirmedContact(subscriber.email, subscriber.first_name);
    await resend("/events/send", {
      method: "POST",
      body: {
        event: "grei.subscriber.confirmed",
        contact_id: contact.id,
        payload: {
          confirmed: true,
          confirmation_timestamp: confirmedAt,
          consent_version: subscriber.consent_version || consentVersion,
          topic: subscriber.topic_preference || fanTopicName,
          source: "website:release-list",
        },
      },
    });

    const { error: eventError } = await supabase
      .from("release_list_subscribers")
      .update({
        resend_contact_id: contact.id,
        resend_event_sent_at: new Date().toISOString(),
        confirmation_token_hash: null,
        confirmation_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriber.id);
    if (eventError) throw eventError;
  }

  return confirmationPage(
    "Subscription confirmed",
    "You are confirmed for The Grei Signal. Your welcome email is on the way.",
    200,
  );
}

async function upsertConfirmedContact(email: string, firstName: string | null) {
  const encoded = encodeURIComponent(email);
  const existingResponse = await fetch(`https://api.resend.com/contacts/${encoded}`, {
    headers: { Authorization: `Bearer ${required("RESEND_API_KEY")}` },
  });

  let contact: { id: string };
  if (existingResponse.status === 404) {
    contact = await resend("/contacts", {
      method: "POST",
      body: {
        email,
        first_name: firstName || undefined,
        unsubscribed: false,
        topics: [{ id: fanTopicId, subscription: "opt_in" }],
      },
    });
  } else {
    const existing = await readApi(existingResponse);
    if (existing.unsubscribed === true) {
      await resend(`/contacts/${encoded}`, {
        method: "PATCH",
        body: { first_name: firstName || undefined, unsubscribed: false },
      });
    } else if (firstName) {
      await resend(`/contacts/${encoded}`, {
        method: "PATCH",
        body: { first_name: firstName },
      });
    }
    await resend(`/contacts/${encoded}/topics`, {
      method: "PATCH",
      body: [{ id: fanTopicId, subscription: "opt_in" }],
    });
    contact = { id: existing.id };
  }
  return contact;
}

async function resend(
  path: string,
  options: { method: string; body: unknown; headers?: Record<string, string> },
) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${required("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(options.body),
  });
  return await readApi(response);
}

async function readApi(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Resend request failed (${response.status})`);
  return body;
}

function adminClient() {
  return createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function confirmationHtml(firstName: string, confirmUrl: string) {
  const greeting = escapeHtml(firstName || "friend");
  const link = escapeHtml(confirmUrl);
  return `<!doctype html><html><body style="margin:0;background:#03060c"><table width="100%" cellpadding="0" cellspacing="0" bgcolor="#03060c"><tr><td align="center" style="padding:32px 16px"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0b111b;border-radius:16px"><tr><td style="padding:36px 32px 12px;font:700 12px Arial;color:#d8ff63;letter-spacing:2px">THE GREI SHOW</td></tr><tr><td style="padding:4px 32px 12px;font:700 32px/40px Arial;color:#f5f7fb">Confirm the signal.</td></tr><tr><td style="padding:4px 32px 12px;font:16px/27px Arial;color:#d7dee8">Hello ${greeting},</td></tr><tr><td style="padding:0 32px 18px;font:16px/27px Arial;color:#d7dee8">One click confirms that you want release and project updates from The Grei Show.</td></tr><tr><td style="padding:8px 32px 24px"><a href="${link}" style="display:inline-block;background:#d8ff63;border-radius:999px;padding:13px 22px;font:700 15px Arial;color:#03060c;text-decoration:none">Confirm subscription</a></td></tr><tr><td style="padding:4px 32px 32px;font:13px/21px Arial;color:#91a0b3">This link expires in 24 hours. If you did not request it, ignore this email.</td></tr></table></td></tr></table></body></html>`;
}

function confirmationPage(title: string, message: string, status: number) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><body style="margin:0;background:#03060c;color:#f5f7fb;font:16px/1.6 Arial;display:grid;min-height:100vh;place-items:center"><main style="max-width:620px;padding:40px"><p style="color:#d8ff63;letter-spacing:2px;font-weight:700">THE GREI SHOW</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="https://thegreishow.com" style="color:#d8ff63">Return to The Grei Show</a></p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character] || character
  );
}

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://thegreishow.com",
    "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
