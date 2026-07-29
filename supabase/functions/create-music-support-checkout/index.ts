import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const allowedOrigins = new Set([
  "https://thegreishow.com",
  "https://www.thegreishow.com",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
const downloadableReleases: Record<string, string> = {
  "no-drama": "No Drama",
  "pineapples-and-hot-sauce": "Pineapples & Hot Sauce",
  "puff-puff-pass-remix-feat-bay-c": "Puff Puff Pass Remix (feat. Bay-C)",
  "game-of-hearts": "Game of Hearts",
  "puff-puff-pass": "Puff Puff Pass",
  "the-vibe": "The Vibe",
  "joy": "Joy",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const origin = req.headers.get("Origin") || "";
    if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);

    const body = await safeJson(req);
    if (String(body.website || "").trim()) return json(req, { error: "Request rejected" }, 400);

    const slug = normalizeSlug(body.slug);
    const amount = Number(body.amount);
    const releaseTitle = downloadableReleases[slug];
    if (!releaseTitle) return json(req, { error: "Choose a downloadable release." }, 400);
    if (!Number.isFinite(amount) || amount < 1 || amount > 500) {
      return json(req, { error: "Enter an amount from $1 to $500 USD." }, 400);
    }

    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });
    const fingerprint = await requestFingerprint(req);
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count, error: countError } = await admin
      .from("music_support_payments")
      .select("id", { count: "exact", head: true })
      .eq("request_fingerprint", fingerprint)
      .gte("created_at", since);
    if (countError) throw countError;
    if ((count || 0) >= 5) return json(req, { error: "Too many checkout attempts. Please try again shortly." }, 429);

    const roundedAmount = Math.round((amount + Number.EPSILON) * 100) / 100;
    const { data: payment, error: paymentError } = await admin
      .from("music_support_payments")
      .insert({
        release_slug: slug,
        release_title: releaseTitle,
        amount: roundedAmount,
        currency: "USD",
        request_fingerprint: fingerprint,
      })
      .select("id")
      .single();
    if (paymentError) throw paymentError;

    const siteUrl = (Deno.env.get("SITE_URL") || "https://thegreishow.com").replace(/\/$/, "");
    const accessToken = await paypalAccessToken();
    const orderResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `music-support-${payment.id}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: payment.id,
          custom_id: `music-support:${payment.id}`,
          invoice_id: payment.id,
          description: `Support The Grei Show — ${releaseTitle.slice(0, 90)}`,
          amount: { currency_code: "USD", value: roundedAmount.toFixed(2) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "The Grei Show",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: `${siteUrl}/music.html?support=thanks&slug=${encodeURIComponent(slug)}`,
              cancel_url: `${siteUrl}/music.html?support=cancelled&slug=${encodeURIComponent(slug)}`,
            },
          },
        },
      }),
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      await admin.from("music_support_payments").update({
        status: "cancelled",
        provider_payload: { create_error: order?.name || order?.message || "unknown" },
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id);
      throw new Error(order?.details?.[0]?.description || order?.message || "PayPal could not create the checkout.");
    }

    const approvalUrl = order.links?.find((link: { rel?: string }) =>
      ["payer-action", "approve"].includes(link.rel || "")
    )?.href;
    if (!approvalUrl) throw new Error("PayPal did not return an approval URL.");

    const { error: updateError } = await admin.from("music_support_payments").update({
      status: "checkout_created",
      paypal_order_id: order.id,
      approval_url: approvalUrl,
      provider_payload: { order_status: order.status },
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    if (updateError) throw updateError;

    return json(req, { url: approvalUrl });
  } catch (error) {
    console.error(error);
    return json(req, { error: error instanceof Error ? error.message : "Could not create PayPal checkout." }, 500);
  }
});

async function requestFingerprint(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim();
  const ua = req.headers.get("user-agent") || "";
  const secret = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:${ip}:${ua}`));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function paypalAccessToken() {
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${requiredEnv("PAYPAL_CLIENT_ID")}:${requiredEnv("PAYPAL_CLIENT_SECRET")}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Could not authenticate with PayPal.");
  return payload.access_token as string;
}
function paypalBaseUrl() {
  return (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}
function normalizeSlug(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
async function safeJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
}
function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://thegreishow.com",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
