alter table public.booking_payments
  add column if not exists provider text not null default 'manual',
  add column if not exists approval_url text,
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text,
  add column if not exists provider_payload jsonb;

create unique index if not exists booking_payments_paypal_order_id_key
  on public.booking_payments (paypal_order_id)
  where paypal_order_id is not null;

create unique index if not exists booking_payments_paypal_capture_id_key
  on public.booking_payments (paypal_capture_id)
  where paypal_capture_id is not null;

comment on column public.booking_payments.provider is 'Payment provider, such as paypal, wise, payoneer, bank or manual.';
comment on column public.booking_payments.provider_payload is 'Sanitized provider response metadata used for reconciliation and support.';
