import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.1";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const event = await req.json();
    const accessToken = await paypalAccessToken();
    if (!await verifyWebhook(req.headers, event, accessToken)) return json({ error: "Invalid PayPal webhook signature." }, 401);
    const admin = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

    if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
      const orderId = String(event.resource?.id || "");
      const { data: payment } = await admin.from("booking_payments").select("id,status").eq("paypal_order_id", orderId).maybeSingle();
      if (payment && !["paid","completed"].includes(payment.status)) {
        const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method:"POST", headers:{ Authorization:`Bearer ${accessToken}`, "Content-Type":"application/json", "PayPal-Request-Id":`white-line-capture-${payment.id}`, Prefer:"return=representation" }, body:"{}" });
        const payload = await response.json();
        if (!response.ok && payload?.name !== "ORDER_ALREADY_CAPTURED") throw new Error(payload?.details?.[0]?.description || payload?.message || "PayPal capture failed.");
      }
    }
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") await recordCompletedCapture(admin, event);
    if (["PAYMENT.CAPTURE.DENIED","PAYMENT.CAPTURE.REVERSED","PAYMENT.CAPTURE.REFUNDED"].includes(event.event_type)) {
      const status = event.event_type.endsWith("DENIED") ? "denied" : event.event_type.endsWith("REVERSED") ? "reversed" : "refunded";
      await updateCaptureStatus(admin, event, status);
    }
    if (event.event_type.startsWith("PAYMENT.PAYOUTS-ITEM.")) await reconcilePayoutItem(admin, event);
    if (event.event_type.startsWith("PAYMENT.PAYOUTSBATCH.")) await reconcilePayoutBatch(admin, event);
    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, 500);
  }
});

async function recordCompletedCapture(admin: any, event: any) {
  const capture = event.resource || {};
  const orderId = String(capture.supplementary_data?.related_ids?.order_id || "");
  const captureId = String(capture.id || "");
  if (!orderId || !captureId) return;
  const { data: payment, error } = await admin.from("booking_payments").select("id,client_request_id").eq("paypal_order_id", orderId).maybeSingle();
  if (error) throw error;
  if (!payment) return;
  const result = await admin.from("booking_payments").update({ status:"paid", paypal_capture_id:captureId, paid_at:capture.create_time || new Date().toISOString(), provider_payload:{ capture_status:capture.status, payer_email:capture.payee?.email_address || null, webhook_event_id:event.id || null } }).eq("id", payment.id);
  if (result.error) throw result.error;
  const booking = await admin.from("client_requests").select("quoted_amount").eq("id", payment.client_request_id).single();
  if (booking.error) throw booking.error;
  const completed = await admin.from("booking_payments").select("amount").eq("client_request_id", payment.client_request_id).eq("status", "paid");
  if (completed.error) throw completed.error;
  const amountPaid = (completed.data || []).reduce((sum:number,row:any)=>sum+Number(row.amount||0),0);
  const paymentStatus = Number(booking.data.quoted_amount||0)>0 && amountPaid>=Number(booking.data.quoted_amount||0) ? "paid" : "deposit_paid";
  const update = await admin.from("client_requests").update({ amount_paid:amountPaid, payment_status:paymentStatus }).eq("id", payment.client_request_id);
  if (update.error) throw update.error;
  await admin.rpc("refresh_talent_payout_for_booking", { p_client_request_id: payment.client_request_id });
}

async function updateCaptureStatus(admin:any,event:any,status:string) {
  const orderId=String(event.resource?.supplementary_data?.related_ids?.order_id||"");
  if(!orderId)return;
  const {data:payment,error}=await admin.from("booking_payments").select("id,client_request_id").eq("paypal_order_id",orderId).maybeSingle();
  if(error)throw error;if(!payment)return;
  const result=await admin.from("booking_payments").update({status,provider_payload:{webhook_event_id:event.id||null,capture_status:event.resource?.status||status}}).eq("id",payment.id);
  if(result.error)throw result.error;
  if(["denied","reversed"].includes(status))await admin.from("client_requests").update({payment_status:`paypal_${status}`}).eq("id",payment.client_request_id);
}

async function reconcilePayoutItem(admin:any,event:any) {
  const resource=event.resource||{}, item=resource.payout_item||{};
  const payoutId=String(item.sender_item_id||resource.sender_item_id||"");
  const itemId=String(resource.payout_item_id||resource.id||"");
  if(!payoutId&&!itemId)return;
  const statuses:any={"PAYMENT.PAYOUTS-ITEM.SUCCEEDED":"paid","PAYMENT.PAYOUTS-ITEM.FAILED":"failed","PAYMENT.PAYOUTS-ITEM.HELD":"held","PAYMENT.PAYOUTS-ITEM.UNCLAIMED":"unclaimed","PAYMENT.PAYOUTS-ITEM.RETURNED":"returned","PAYMENT.PAYOUTS-ITEM.REFUNDED":"refunded","PAYMENT.PAYOUTS-ITEM.BLOCKED":"blocked","PAYMENT.PAYOUTS-ITEM.CANCELED":"cancelled"};
  const status=statuses[event.event_type]||String(resource.transaction_status||"processing").toLowerCase();
  let query=admin.from("talent_payouts").update({status,paypal_payout_item_id:itemId||null,paypal_transaction_id:resource.transaction_id||null,paid_at:status==="paid"?(resource.time_processed||new Date().toISOString()):null,provider_payload:{webhook_event_id:event.id||null,transaction_status:resource.transaction_status||null,errors:resource.errors||null},updated_at:new Date().toISOString()});
  query=payoutId?query.eq("id",payoutId):query.eq("paypal_payout_item_id",itemId);
  const result=await query;if(result.error)throw result.error;
}

async function reconcilePayoutBatch(admin:any,event:any) {
  const resource=event.resource||{};
  const batchId=String(resource.batch_header?.payout_batch_id||resource.payout_batch_id||resource.id||"");
  if(!batchId)return;
  const batchStatus=String(resource.batch_header?.batch_status||resource.batch_status||"").toLowerCase();
  const status=batchStatus==="denied"?"denied":"processing";
  const result=await admin.from("talent_payouts").update({status,provider_payload:{webhook_event_id:event.id||null,batch_status:batchStatus},updated_at:new Date().toISOString()}).eq("paypal_payout_batch_id",batchId).neq("status","paid");
  if(result.error)throw result.error;
}

async function verifyWebhook(headers:Headers,event:unknown,accessToken:string) {
  const response=await fetch(`${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({auth_algo:headers.get("paypal-auth-algo"),cert_url:headers.get("paypal-cert-url"),transmission_id:headers.get("paypal-transmission-id"),transmission_sig:headers.get("paypal-transmission-sig"),transmission_time:headers.get("paypal-transmission-time"),webhook_id:requiredEnv("PAYPAL_WEBHOOK_ID"),webhook_event:event})});
  const payload=await response.json();if(!response.ok)throw new Error(payload.message||"PayPal webhook verification failed.");return payload.verification_status==="SUCCESS";
}
async function paypalAccessToken(){const response=await fetch(`${paypalBaseUrl()}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${btoa(`${requiredEnv("PAYPAL_CLIENT_ID")}:${requiredEnv("PAYPAL_CLIENT_SECRET")}`)}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});const payload=await response.json();if(!response.ok||!payload.access_token)throw new Error(payload.error_description||"Could not authenticate with PayPal.");return payload.access_token as string;}
function paypalBaseUrl(){return(Deno.env.get("PAYPAL_ENV")||"sandbox").toLowerCase()==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";}
function requiredEnv(name:string){const value=Deno.env.get(name);if(!value)throw new Error(`${name} is not configured.`);return value;}
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});}
