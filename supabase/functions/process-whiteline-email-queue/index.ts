import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type QueueRow = {
  id: string;
  template_key: string;
  recipient_email: string;
  recipient_name: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    await authorize(req);
    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
    await supabase.rpc("whiteline_recover_stale_emails");
    const requested = Number((await safeJson(req))?.limit || 20);
    const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 20, 100));
    const { data, error } = await supabase.rpc("whiteline_claim_email_batch", { p_limit: limit });
    if (error) throw error;

    const rows = (data || []) as QueueRow[];
    const results = [];
    for (const row of rows) {
      try {
        const rendered = renderTemplate(row.template_key, row.recipient_name, row.payload || {});
        const providerId = await sendWithResend(row.recipient_email, rendered.subject, rendered.html, rendered.text);
        const { error: updateError } = await supabase.from("whiteline_email_outbox").update({
          status: "sent",
          provider_message_id: providerId,
          sent_at: new Date().toISOString(),
          locked_at: null,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        if (updateError) throw updateError;
        results.push({ id: row.id, status: "sent" });
      } catch (error) {
        const backoffMinutes = Math.min(60, Math.max(2, Math.pow(2, row.attempts)));
        await supabase.from("whiteline_email_outbox").update({
          status: row.attempts >= 5 ? "cancelled" : "failed",
          last_error: String(error?.message || error).slice(0, 1000),
          available_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
          locked_at: null,
          updated_at: new Date().toISOString(),
        }).eq("id", row.id);
        results.push({ id: row.id, status: "failed", error: String(error?.message || error) });
      }
    }
    return json({ processed: results.length, results });
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
});

async function authorize(req: Request) {
  const cronSecret = Deno.env.get("EMAIL_CRON_SECRET") || "";
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) throw new Error("Authentication required");
  const userClient = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Invalid session");
  const { data: membership } = await admin.from("whiteline_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!membership) throw new Error("White Line administrator access required");
}

async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${Deno.env.get("WLE_FROM_NAME") || "White Line Entertainment"} <${requiredEnv("WLE_FROM_EMAIL")}>`,
      to: [to],
      reply_to: Deno.env.get("WLE_REPLY_TO") || "thegreishow@gmail.com",
      subject,
      html,
      text,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || "Email provider request failed");
  return String(body?.id || "");
}

function renderTemplate(key: string, recipientName: string | null, payload: Record<string, unknown>) {
  const name = escapeHtml(recipientName || String(payload.name || "there"));
  const project = escapeHtml(String(payload.project_type || "your project"));
  const amount = payload.amount_paid ?? payload.quoted_amount ?? payload.amount;
  const money = amount == null ? "" : `${escapeHtml(String(payload.currency || "USD"))} ${Number(amount).toFixed(2)}`;
  const templates: Record<string, [string, string]> = {
    talent_application_received: ["Your White Line application was received", `<p>Hello ${name},</p><p>We received your White Line Entertainment talent application and media. Our team will review your profile privately and contact you by email or WhatsApp.</p><p><strong>Next step:</strong> keep your portfolio links active and watch for a response from White Line.</p>`],
    talent_application_approved: ["Welcome to White Line Entertainment", `<p>Hello ${name},</p><p>Your talent application has been approved. White Line will prepare your public roster profile and portal access.</p><p>Representation secured through White Line uses the agreed 15% agency commission.</p>`],
    talent_application_rejected: ["Update on your White Line application", `<p>Hello ${name},</p><p>Thank you for applying to White Line Entertainment. We are not moving forward with this application at this time.</p><p>You may submit a stronger updated profile in the future.</p>`],
    client_request_received: ["White Line received your booking request", `<p>Hello ${name},</p><p>We received your request for ${project}. White Line will review the brief, confirm suitable talent and follow up with availability and pricing.</p>`],
    client_booking_quoted: ["Your White Line quotation is ready", `<p>Hello ${name},</p><p>Your quotation for ${project} is ready${money ? `: <strong>${money}</strong>` : ""}. Reply to this email if any part of the scope needs adjustment.</p>`],
    client_booking_confirmed: ["Your White Line booking is confirmed", `<p>Hello ${name},</p><p>Your ${project} booking is confirmed. White Line will coordinate the assigned talent and final production details.</p>`],
    client_booking_completed: ["Thank you for booking through White Line", `<p>Hello ${name},</p><p>Your ${project} booking has been marked completed. Thank you for working with White Line Entertainment.</p>`],
    client_booking_cancelled: ["White Line booking update", `<p>Hello ${name},</p><p>Your ${project} booking has been marked cancelled. Reply if you need clarification or want to discuss a replacement date.</p>`],
    client_payment_deposit_paid: ["White Line deposit received", `<p>Hello ${name},</p><p>We confirmed your booking deposit${money ? ` of <strong>${money}</strong>` : ""}. Your payment record has been updated.</p>`],
    client_payment_paid: ["White Line payment received in full", `<p>Hello ${name},</p><p>Your payment${money ? ` of <strong>${money}</strong>` : ""} has been received in full. Thank you.</p>`],
    talent_payout_paid: ["Your White Line payout was sent", `<p>Hello ${name},</p><p>Your talent payout of <strong>${money}</strong> has been sent to your saved payout account.</p>`],
    talent_payout_failed: ["Action required: White Line payout issue", `<p>Hello ${name},</p><p>We could not complete your talent payout of <strong>${money}</strong>. Please verify your payout email in the talent portal.</p>`],
    talent_payout_held: ["White Line payout is being reviewed", `<p>Hello ${name},</p><p>Your payout of <strong>${money}</strong> is temporarily held by the payment provider. White Line is monitoring the status.</p>`],
    talent_payout_unclaimed: ["Action required: claim your White Line payout", `<p>Hello ${name},</p><p>Your payout of <strong>${money}</strong> is unclaimed. Confirm that your saved PayPal email is active and correct.</p>`],
    talent_payout_returned: ["White Line payout was returned", `<p>Hello ${name},</p><p>Your payout of <strong>${money}</strong> was returned. Update your payout details so White Line can resolve it.</p>`],
    admin_new_talent_application: ["New White Line talent application", `<p>A new talent application was received from <strong>${name}</strong>.</p><p>${escapeHtml(String(payload.category || "Talent"))} · ${escapeHtml(String(payload.city || ""))}, ${escapeHtml(String(payload.country || ""))}</p>`],
    admin_new_client_request: ["New White Line client request", `<p>A new booking request was received from <strong>${name}</strong> for ${project}.</p><p>${escapeHtml(String(payload.location || "Location not supplied"))}</p>`],
  };
  const [subject, body] = templates[key] || ["White Line Entertainment update", `<p>Hello ${name},</p><p>There is an update to your White Line Entertainment account or booking.</p>`];
  const html = `<!doctype html><html><body style="margin:0;background:#03060c;color:#f5f7fb;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:32px 20px"><div style="color:#d8ff63;font-weight:800;letter-spacing:.12em;font-size:12px">WHITE LINE ENTERTAINMENT</div><h1 style="font-size:28px">${escapeHtml(subject)}</h1><div style="line-height:1.7;color:#d7dee8">${body}</div><p style="margin-top:30px;color:#9eabba;font-size:13px">Talent · Casting · International bookings<br><a style="color:#d8ff63" href="https://thegreishow.com/whiteline">thegreishow.com/whiteline</a></p></div></body></html>`;
  return { subject, html, text: stripHtml(body) + "\n\nWhite Line Entertainment\nhttps://thegreishow.com/whiteline" };
}

function stripHtml(value: string) { return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }
function requiredEnv(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`${name} is not configured`); return value; }
async function safeJson(req: Request) { try { return await req.json(); } catch { return {}; } }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }); }
