import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = (Deno.env.get("SITE_URL") || "https://thegreishow.com").replace(/\/$/, "");
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing admin session." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid admin session." }, 401);

    const { data: adminRow } = await admin.from("whiteline_admins").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (!adminRow) return json({ error: "White Line admin access required." }, 403);

    const body = await req.json();
    const clientRequestId = String(body.clientRequestId || "");
    const paymentType = String(body.paymentType || "");
    const quoteAmount = Number(body.quoteAmount);
    const depositPercent = Number(body.depositPercent || 50);
    const currency = String(body.currency || "USD").toUpperCase();

    if (!clientRequestId) return json({ error: "Missing booking request." }, 400);
    if (!["deposit", "balance", "full"].includes(paymentType)) return json({ error: "Invalid payment type." }, 400);
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) return json({ error: "Invalid quote amount." }, 400);
    if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) return json({ error: "Invalid deposit percentage." }, 400);
    if (!/^[A-Z]{3}$/.test(currency)) return json({ error: "Invalid currency." }, 400);

    const { data: booking, error: bookingError } = await admin
      .from("client_requests")
      .select("id,client_name,email,project_name,project_type,quoted_amount,amount_paid")
      .eq("id", clientRequestId)
      .single();
    if (bookingError || !booking) return json({ error: "Booking request not found." }, 404);

    const amountPaid = Number(booking.amount_paid || 0);
    const depositAmount = roundMoney(quoteAmount * depositPercent / 100);
    const amount = paymentType === "deposit"
      ? Math.max(depositAmount - amountPaid, 0)
      : Math.max(quoteAmount - amountPaid, 0);
    if (amount <= 0) return json({ error: "This booking has no remaining amount due." }, 400);

    const { data: payment, error: paymentError } = await admin.from("booking_payments").insert({
      client_request_id: clientRequestId,
      payment_type: paymentType,
      provider: "paypal",
      amount,
      currency,
      status: "pending",
      description: `${capitalize(paymentType)} for ${booking.project_name || booking.project_type || "White Line booking"}`,
      created_by: userData.user.id,
    }).select("id").single();
    if (paymentError) throw paymentError;

    const reference = `WLE-${clientRequestId.slice(0, 8).toUpperCase()}`;
    const accessToken = await paypalAccessToken();
    const orderResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `white-line-${payment.id}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: payment.id,
          custom_id: payment.id,
          invoice_id: payment.id,
          description: `White Line ${paymentType} payment — ${reference}`,
          amount: { currency_code: currency, value: amount.toFixed(2) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "White Line Entertainment",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: `${siteUrl}/whiteline-payment-success.html?provider=paypal`,
              cancel_url: `${siteUrl}/whiteline-payment-success.html?provider=paypal&status=cancelled`,
            },
          },
        },
      }),
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) throw new Error(order?.details?.[0]?.description || order?.message || "PayPal could not create the order.");

    const approvalUrl = order.links?.find((link: { rel?: string }) => ["payer-action", "approve"].includes(link.rel || ""))?.href;
    if (!approvalUrl) throw new Error("PayPal did not return an approval URL.");

    const { error: updatePaymentError } = await admin.from("booking_payments").update({
      status: "checkout_created",
      paypal_order_id: order.id,
      approval_url: approvalUrl,
      provider_payload: { order_status: order.status },
    }).eq("id", payment.id);
    if (updatePaymentError) throw updatePaymentError;

    const { error: updateBookingError } = await admin.from("client_requests").update({
      quoted_amount: quoteAmount,
      currency,
      deposit_percent: depositPercent,
      payment_status: paymentType === "deposit" ? "deposit_pending" : "balance_pending",
    }).eq("id", clientRequestId);
    if (updateBookingError) throw updateBookingError;

    return json({ paymentId: payment.id, orderId: order.id, url: approvalUrl, reference });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not create PayPal checkout." }, 500);
  }
});

async function paypalAccessToken() {
  const clientId = requiredEnv("PAYPAL_CLIENT_ID");
  const secret = requiredEnv("PAYPAL_CLIENT_SECRET");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${secret}`)}`,
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
function requiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
