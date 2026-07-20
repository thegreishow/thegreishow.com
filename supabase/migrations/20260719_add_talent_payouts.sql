alter table public.talent_profiles
  add column if not exists payout_method text not null default 'paypal',
  add column if not exists payout_email text,
  add column if not exists payout_currency text not null default 'USD';

create table if not exists public.talent_payouts (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null references public.client_requests(id) on delete cascade,
  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  commission_rate numeric(5,2) not null default 15 check (commission_rate between 0 and 100),
  commission_amount numeric(12,2) generated always as (round(gross_amount * commission_rate / 100, 2)) stored,
  payout_amount numeric(12,2) generated always as (round(gross_amount - (gross_amount * commission_rate / 100), 2)) stored,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','allocation_required','eligible','processing','paid','unclaimed','held','failed','blocked','denied','returned','refunded','cancelled')),
  payout_method text not null default 'paypal',
  payout_receiver text,
  paypal_sender_batch_id text,
  paypal_payout_batch_id text,
  paypal_payout_item_id text,
  paypal_transaction_id text,
  provider_payload jsonb,
  eligible_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_request_id, talent_profile_id)
);

create index if not exists talent_payouts_status_idx on public.talent_payouts(status, created_at desc);
create unique index if not exists talent_payouts_sender_batch_key on public.talent_payouts(paypal_sender_batch_id) where paypal_sender_batch_id is not null;
create unique index if not exists talent_payouts_batch_key on public.talent_payouts(paypal_payout_batch_id) where paypal_payout_batch_id is not null;
create unique index if not exists talent_payouts_item_key on public.talent_payouts(paypal_payout_item_id) where paypal_payout_item_id is not null;

alter table public.talent_payouts enable row level security;
drop policy if exists "Admins manage talent payouts" on public.talent_payouts;
create policy "Admins manage talent payouts" on public.talent_payouts for all to authenticated
using (public.is_whiteline_admin()) with check (public.is_whiteline_admin());
drop policy if exists "Talent reads own payouts" on public.talent_payouts;
create policy "Talent reads own payouts" on public.talent_payouts for select to authenticated using (
  exists (select 1 from public.talent_accounts a where a.user_id = auth.uid() and a.talent_profile_id = talent_payouts.talent_profile_id and a.status = 'active')
);

create or replace function public.set_my_payout_details(p_email text, p_currency text default 'USD') returns void
language plpgsql security definer set search_path = public as $$
declare v_profile_id uuid;
begin
  select talent_profile_id into v_profile_id from public.talent_accounts where user_id = auth.uid() and status = 'active' limit 1;
  if v_profile_id is null then raise exception 'Active talent portal access is required.'; end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid PayPal email.'; end if;
  update public.talent_profiles set payout_method='paypal', payout_email=lower(trim(p_email)), payout_currency=upper(coalesce(nullif(trim(p_currency),''),'USD')) where id=v_profile_id;
end; $$;
grant execute on function public.set_my_payout_details(text,text) to authenticated;

create or replace function public.refresh_talent_payout_for_booking(p_client_request_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_booking public.client_requests%rowtype; v_talent_id uuid; v_paid numeric(12,2); v_id uuid;
begin
  select * into v_booking from public.client_requests where id=p_client_request_id;
  if not found or coalesce(cardinality(v_booking.assigned_talent_ids),0) <> 1 then return null; end if;
  v_talent_id := v_booking.assigned_talent_ids[1];
  select coalesce(sum(amount),0) into v_paid from public.booking_payments where client_request_id=p_client_request_id and status in ('paid','completed');
  insert into public.talent_payouts(client_request_id,talent_profile_id,gross_amount,commission_rate,currency,status,payout_receiver,eligible_at)
  values(p_client_request_id,v_talent_id,v_paid,15,coalesce(v_booking.currency,'USD'),case when v_booking.booking_stage='completed' and v_booking.payment_status='paid' and v_paid>0 then 'eligible' else 'pending' end,(select payout_email from public.talent_profiles where id=v_talent_id),case when v_booking.booking_stage='completed' and v_booking.payment_status='paid' and v_paid>0 then now() else null end)
  on conflict(client_request_id,talent_profile_id) do update set gross_amount=excluded.gross_amount,currency=excluded.currency,payout_receiver=coalesce(excluded.payout_receiver,talent_payouts.payout_receiver),status=case when talent_payouts.status in ('processing','paid','unclaimed','held','returned','refunded') then talent_payouts.status else excluded.status end,eligible_at=case when excluded.status='eligible' then coalesce(talent_payouts.eligible_at,now()) else talent_payouts.eligible_at end,updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.refresh_talent_payout_payment_trigger() returns trigger
language plpgsql security definer set search_path=public as $$ begin perform public.refresh_talent_payout_for_booking(coalesce(new.client_request_id,old.client_request_id)); return coalesce(new,old); end; $$;
drop trigger if exists refresh_payout_after_booking_payment on public.booking_payments;
create trigger refresh_payout_after_booking_payment after insert or update of status,amount on public.booking_payments for each row execute function public.refresh_talent_payout_payment_trigger();

create or replace function public.refresh_talent_payout_booking_trigger() returns trigger
language plpgsql security definer set search_path=public as $$ begin perform public.refresh_talent_payout_for_booking(new.id); return new; end; $$;
drop trigger if exists refresh_payout_after_booking_update on public.client_requests;
create trigger refresh_payout_after_booking_update after update of booking_stage,payment_status,assigned_talent_ids on public.client_requests for each row execute function public.refresh_talent_payout_booking_trigger();

comment on table public.talent_payouts is 'White Line talent earnings ledger using the standard 85% talent / 15% agency split.';
comment on column public.talent_payouts.payout_amount is 'Talent share after the standard 15% commission. Sender-side PayPal payout fees are paid separately by White Line.';