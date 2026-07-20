import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anon = requiredEnv("SUPABASE_ANON_KEY");
    const serviceRole = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session" }, 401);
    const { data: membership } = await admin.from("whiteline_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!membership) return json({ error: "White Line administrator access required" }, 403);

    const body = await req.json();
    const payoutId = String(body.payout_id || "");
    if (!payoutId) return json({ error: "payout_id is required" }, 400);

    const { data: payout, error } = await admin.from("talent_payouts")
      .select("id,status,payout_amount,currency,payout_receiver,paypal_sender_batch_id,paypal_payout_batch_id,talent_profiles(stage_name,full_name,payout_email)")
      .eq("id", payoutId).single();
    if (error) throw error;
    if (payout.status === "paid") return json({ payout_id: payout.id, status: payout.status, batch_id: payout.paypal_payout_batch_id });
    if (payout.status === "processing" && payout.paypal_payout_batch_id) return json({ payout_id: payout.id, status: payout.status, batch_id: payout.paypal_payout_batch_id });
    if (payout.status !== "eligible") return json({ error: `Payout is ${payout.status}, not eligible.` }, 409);

    const profile = Array.isArray(payout.talent_profiles) ? payout.talent_profiles[0] : payout.talent_profiles;
    const receiver = String(payout.payout_receiver || profile?.payout_email || "").trim().toLowerCase();
    if (!receiver || !receiver.includes("@")) return json({ error: "Talent PayPal payout email is missing." }, 409);
    const amount = Number(payout.payout_amount || 0);
    if (!(amount > 0)) return json({ error: "Payout amount must be greater than zero." }, 409);

    const senderBatchId = payout.paypal_sender_batch_id || `wl-${payout.id}`;
    const token = await paypalAccessToken();
    const response = await fetch(`${paypalBaseUrl()}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": senderBatchId,
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: "Your White Line Entertainment payout",
          email_message: "Your talent payout has been released by White Line Entertainment.",
        },
        items: [{
          recipient_type: "EMAIL",
          receiver,
          amount: { value: amount.toFixed(2), currency: String(payout.currency || "USD").toUpperCase() },
          note: `White Line talent payout for ${profile?.stage_name || profile?.full_name || "booking"}`,
          sender_item_id: payout.id,
          purpose: "SERVICES",
        }],
      }),
    });
    const provider = await response.json();
    if (!response.ok) throw new Error(provider?.details?.[0]?.description || provider?.message || "PayPal payout request failed.");

    const batchId = provider?.batch_header?.payout_batch_id || null;
    const { error: updateError } = await admin.from("talent_payouts").update({
      status: "processing",
      payout_receiver: receiver,
      paypal_sender_batch_id: senderBatchId,
      paypal_payout_batch_id: batchId,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      provider_payload: { batch_status: provider?.batch_header?.batch_status || null },
      updated_at: new Date().toISOString(),
    }).eq("id", payout.id);
    if (updateError) throw updateError;

    return json({ payout_id: payout.id, status: "processing", batch_id: batchId });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Talent payout failed." }, 500);
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

function paypalBaseUrl() {
  return (Deno.env.get("PAYPAL_ENV") || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}
function requiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured.`); return value; }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
