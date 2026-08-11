import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const allowedOrigins = new Set([
  "https://thegreishow.com",
  "https://www.thegreishow.com",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const origin = req.headers.get("Origin") || "";
    if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
    const body = await safeJson(req);
    if (String(body.website || "").trim()) return json(req, { error: "Request rejected" }, 400);

    const slug = normalizeSlug(body.experience || body.slug);
    const bookingDate = String(body.date || "").trim();
    const guests = Number(body.guests);
    const pickup = String(body.pickup || body.pickupArea || "").trim();
    const name = String(body.name || "").trim() || null;
    const email = validEmail(body.email);
    const phone = String(body.phone || "").trim() || null;

    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) return json(req, { error: "Choose a valid experience date." }, 400);
    if (!Number.isInteger(guests) || guests < 1 || guests > 12) return json(req, { error: "Choose between 1 and 12 guests." }, 400);

    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    const fingerprint = await requestFingerprint(req);
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count, error: countError } = await admin.from("tour_bookings").select("id", { count: "exact", head: true }).gte("created_at", since).contains("provider_payload", { request_fingerprint: fingerprint });
    if (countError) throw countError;
    if ((count || 0) >= 5) return json(req, { error: "Too many checkout attempts. Please try again shortly." }, 429);

    const { data: hold, error: holdError } = await admin.rpc("create_tour_booking_hold", {
      p_slug: slug,
      p_booking_date: bookingDate,
      p_guest_count: guests,
      p_customer_name: name,
      p_customer_email: email,
      p_customer_phone: phone,
      p_pickup_area: pickup || null,
    });
    if (holdError) return json(req, { error: cleanDbError(holdError.message) }, 400);
    if (!hold?.id) throw new Error("Could not reserve availability.");

    await admin.from("tour_bookings").update({ provider_payload: { request_fingerprint: fingerprint } }).eq("id", hold.id);
    const { data: experience, error: experienceError } = await admin.from("tour_experiences").select("title,cancellation_hours").eq("id", hold.experience_id).single();
    if (experienceError) throw experienceError;

    const siteUrl = (Deno.env.get("SITE_URL") || "https://thegreishow.com").replace(/\/$/, "");
    const accessToken = await paypalAccessToken();
    const orderResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `ilovekingston-${hold.id}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: hold.id,
          custom_id: `tour:${hold.id}`,
          invoice_id: hold.booking_reference,
          description: `${String(experience.title).slice(0, 90)} — ${bookingDate}`,
          amount: { currency_code: hold.currency, value: Number(hold.amount_total).toFixed(2) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "iLoveKingston",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: `${siteUrl}/experiences/booking-confirmation.html?booking=${encodeURIComponent(hold.id)}&ref=${encodeURIComponent(hold.booking_reference)}`,
              cancel_url: `${siteUrl}/experiences/${slug}.html?booking=cancelled`,
            },
          },
        },
      }),
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      await admin.from("tour_bookings").update({ status: "payment_failed", provider_payload: { request_fingerprint: fingerprint, create_error: order?.name || order?.message || "unknown" }, updated_at: new Date().toISOString() }).eq("id", hold.id);
      throw new Error(order?.details?.[0]?.description || order?.message || "PayPal could not create the checkout.");
    }
    const approvalUrl = order.links?.find((link: { rel?: string }) => ["payer-action", "approve"].includes(link.rel || ""))?.href;
    if (!approvalUrl) throw new Error("PayPal did not return an approval URL.");

    const update = await admin.from("tour_bookings").update({
      paypal_order_id: order.id,
      approval_url: approvalUrl,
      provider_payload: { request_fingerprint: fingerprint, order_status: order.status },
      updated_at: new Date().toISOString(),
    }).eq("id", hold.id);
    if (update.error) throw update.error;

    return json(req, {
      url: approvalUrl,
      bookingId: hold.id,
      reference: hold.booking_reference,
      amount: Number(hold.amount_total),
      currency: hold.currency,
      cancellationHours: Number(experience.cancellation_hours || 24),
    });
  } catch (error) {
    console.error(error);
    return json(req, { error: error instanceof Error ? error.message : "Could not create PayPal checkout." }, 500);
  }
});

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
async function requestFingerprint(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim();
  const ua = req.headers.get("user-agent") || "";
  const secret = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:tour:${ip}:${ua}`));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function paypalBaseUrl() { return (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"; }
function requiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function normalizeSlug(value: unknown) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function validEmail(value: unknown) { const email = String(value || "").trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function cleanDbError(value: string) { return value.replace(/^.*?:\s*/, "").replace(/\s*CONTEXT:.*$/s, "").trim(); }
async function safeJson(req: Request) { try { return await req.json(); } catch { return {}; } }
function corsHeaders(req: Request) { const origin = req.headers.get("Origin") || ""; return { "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://thegreishow.com", "Access-Control-Allow-Headers": "content-type, apikey, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" }; }
function json(req: Request, body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }); }
