import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const event = await req.json();
    const accessToken = await paypalAccessToken();
    const verified = await verifyWebhook(req.headers, event, accessToken);
    if (!verified) return json({ error: "Invalid PayPal webhook signature." }, 401);

    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const orderId = String(event.resource?.id || "");
      if (!orderId) return json({ received: true });
      const { data: payment } = await admin
        .from("booking_payments")
        .select("id,status")
        .eq("paypal_order_id", orderId)
        .maybeSingle();
      if (payment && !["paid", "completed"].includes(payment.status)) {
        const captureResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": `white-line-capture-${payment.id}`,
            Prefer: "return=representation",
          },
          body: "{}",
        });
        const capture = await captureResponse.json();
        if (!captureResponse.ok && capture?.name !== "ORDER_ALREADY_CAPTURED") {
          throw new Error(capture?.details?.[0]?.description || capture?.message || "PayPal capture failed.");
        }
      }
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      await recordCompletedCapture(admin, event);
    }

    if (["PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REVERSED"].includes(event.event_type)) {
      await updateCaptureStatus(admin, event, event.event_type === "PAYMENT.CAPTURE.DENIED" ? "denied" : "reversed");
    }

    if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      await updateCaptureStatus(admin, event, "refunded");
    }

    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 500);
  }
});

async function recordCompletedCapture(admin: ReturnType<typeof createClient>, event: any) {
  const capture = event.resource || {};
  const orderId = String(capture.supplementary_data?.related_ids?.order_id || "");
  const captureId = String(capture.id || "");
  if (!orderId || !captureId) return;

  const { data: payment, error } = await admin
    .from("booking_payments")
    .select("id,client_request_id,amount,currency,status")
    .eq("paypal_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!payment) return;

  const { error: paymentError } = await admin.from("booking_payments").update({
    status: "paid",
    paypal_capture_id: captureId,
    paid_at: capture.create_time || new Date().toISOString(),
    provider_payload: {
      capture_status: capture.status,
      payer_email: capture.payee?.email_address || null,
      webhook_event_id: event.id || null,
    },
  }).eq("id", payment.id);
  if (paymentError) throw paymentError;

  const { data: booking, error: bookingError } = await admin
    .from("client_requests")
    .select("quoted_amount")
    .eq("id", payment.client_request_id)
    .single();
  if (bookingError) throw bookingError;

  const { data: completed, error: completedError } = await admin
    .from("booking_payments")
    .select("amount")
    .eq("client_request_id", payment.client_request_id)
    .eq("status", "paid");
  if (completedError) throw completedError;

  const amountPaid = (completed || []).reduce((sum: number, row: { amount: number | string }) => sum + Number(row.amount || 0), 0);
  const quote = Number(booking.quoted_amount || 0);
  const paymentStatus = quote > 0 && amountPaid >= quote ? "paid" : "deposit_paid";
  const { error: updateBookingError } = await admin.from("client_requests").update({
    amount_paid: amountPaid,
    payment_status: paymentStatus,
  }).eq("id", payment.client_request_id);
  if (updateBookingError) throw updateBookingError;
}

async function updateCaptureStatus(admin: ReturnType<typeof createClient>, event: any, status: string) {
  const capture = event.resource || {};
  const orderId = String(capture.supplementary_data?.related_ids?.order_id || "");
  if (!orderId) return;
  const { data: payment, error } = await admin
    .from("booking_payments")
    .select("id,client_request_id")
    .eq("paypal_order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!payment) return;

  const { error: paymentError } = await admin.from("booking_payments").update({
    status,
    provider_payload: { webhook_event_id: event.id || null, capture_status: capture.status || status },
  }).eq("id", payment.id);
  if (paymentError) throw paymentError;

  if (["denied", "reversed"].includes(status)) {
    const { error: bookingError } = await admin.from("client_requests").update({ payment_status: `paypal_${status}` }).eq("id", payment.client_request_id);
    if (bookingError) throw bookingError;
  }
}

async function verifyWebhook(headers: Headers, event: unknown, accessToken: string) {
  const response = await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: requiredEnv("PAYPAL_WEBHOOK_ID"),
      webhook_event: event,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "PayPal webhook verification failed.");
  return payload.verification_status === "SUCCESS";
}

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
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
