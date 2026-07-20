create table if not exists public.whiteline_email_settings (
  id boolean primary key default true check (id),
  notification_email text not null default 'thegreishow@gmail.com',
  reply_to_email text not null default 'thegreishow@gmail.com',
  sender_name text not null default 'White Line Entertainment',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.whiteline_email_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.whiteline_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  template_key text not null,
  recipient_email text not null,
  recipient_name text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whiteline_email_outbox_dispatch_idx on public.whiteline_email_outbox(status, available_at, created_at);
alter table public.whiteline_email_settings enable row level security;
alter table public.whiteline_email_outbox enable row level security;
drop policy if exists "Admins read email settings" on public.whiteline_email_settings;
create policy "Admins read email settings" on public.whiteline_email_settings for select to authenticated using (public.is_whiteline_admin());
drop policy if exists "Admins manage email outbox" on public.whiteline_email_outbox;
create policy "Admins manage email outbox" on public.whiteline_email_outbox for all to authenticated using (public.is_whiteline_admin()) with check (public.is_whiteline_admin());

create or replace function public.whiteline_queue_email(p_event_key text,p_template_key text,p_recipient_email text,p_recipient_name text default null,p_payload jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_enabled boolean;
begin
  select enabled into v_enabled from public.whiteline_email_settings where id=true;
  if coalesce(v_enabled,true) is not true or nullif(trim(p_recipient_email),'') is null then return null; end if;
  insert into public.whiteline_email_outbox(event_key,template_key,recipient_email,recipient_name,payload)
  values(p_event_key,p_template_key,lower(trim(p_recipient_email)),nullif(trim(p_recipient_name),''),coalesce(p_payload,'{}'::jsonb))
  on conflict(event_key) do update set updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.whiteline_queue_email(text,text,text,text,jsonb) from public,anon,authenticated;

create or replace function public.whiteline_admin_email() returns text language sql stable security definer set search_path=public as $$
  select notification_email from public.whiteline_email_settings where id=true
$$;

create or replace function public.whiteline_email_talent_application_trigger() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_name text := coalesce(nullif(new.stage_name,''),new.full_name); v_admin text;
begin
  v_admin:=public.whiteline_admin_email();
  if tg_op='INSERT' then
    perform public.whiteline_queue_email('talent-application-received:'||new.id,'talent_application_received',new.email,v_name,jsonb_build_object('name',v_name,'category',new.category,'city',new.city,'country',new.country,'application_id',new.id));
    perform public.whiteline_queue_email('admin-new-talent-application:'||new.id,'admin_new_talent_application',v_admin,'White Line Admin',jsonb_build_object('name',v_name,'email',new.email,'category',new.category,'city',new.city,'country',new.country,'application_id',new.id));
  elsif new.status is distinct from old.status and new.status in ('approved','rejected') then
    perform public.whiteline_queue_email('talent-application-'||new.status||':'||new.id,'talent_application_'||new.status,new.email,v_name,jsonb_build_object('name',v_name,'category',new.category,'application_id',new.id));
  end if;
  return new;
end; $$;
drop trigger if exists whiteline_email_talent_application on public.talent_applications;
create trigger whiteline_email_talent_application after insert or update of status on public.talent_applications for each row execute function public.whiteline_email_talent_application_trigger();

create or replace function public.whiteline_email_client_request_trigger() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_admin text; v_stage text; v_payment text;
begin
  v_admin:=public.whiteline_admin_email();
  if tg_op='INSERT' then
    perform public.whiteline_queue_email('client-request-received:'||new.id,'client_request_received',new.email,new.client_name,jsonb_build_object('name',new.client_name,'project_type',new.project_type,'event_date',new.event_date,'location',new.location,'request_id',new.id));
    perform public.whiteline_queue_email('admin-new-client-request:'||new.id,'admin_new_client_request',v_admin,'White Line Admin',jsonb_build_object('name',new.client_name,'company',new.company_name,'email',new.email,'project_type',new.project_type,'event_date',new.event_date,'location',new.location,'request_id',new.id));
    return new;
  end if;
  v_stage:=coalesce(new.booking_stage,new.status);
  if v_stage is distinct from coalesce(old.booking_stage,old.status) and v_stage in ('quoted','confirmed','completed','cancelled') then
    perform public.whiteline_queue_email('client-booking-'||v_stage||':'||new.id,'client_booking_'||v_stage,new.email,new.client_name,jsonb_build_object('name',new.client_name,'project_type',new.project_type,'event_date',new.event_date,'location',new.location,'quoted_amount',new.quoted_amount,'currency',new.currency,'request_id',new.id));
  end if;
  v_payment:=new.payment_status;
  if v_payment is distinct from old.payment_status and v_payment in ('deposit_paid','paid') then
    perform public.whiteline_queue_email('client-payment-'||v_payment||':'||new.id,'client_payment_'||v_payment,new.email,new.client_name,jsonb_build_object('name',new.client_name,'project_type',new.project_type,'quoted_amount',new.quoted_amount,'amount_paid',new.amount_paid,'currency',new.currency,'request_id',new.id));
  end if;
  return new;
end; $$;
drop trigger if exists whiteline_email_client_request on public.client_requests;
create trigger whiteline_email_client_request after insert or update of booking_stage,status,payment_status on public.client_requests for each row execute function public.whiteline_email_client_request_trigger();

create or replace function public.whiteline_email_payout_trigger() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_email text; v_name text;
begin
  if tg_op='UPDATE' and new.status is distinct from old.status and new.status in ('paid','failed','held','unclaimed','returned') then
    select payout_email,coalesce(nullif(stage_name,''),full_name) into v_email,v_name from public.talent_profiles where id=new.talent_profile_id;
    perform public.whiteline_queue_email('talent-payout-'||new.status||':'||new.id,'talent_payout_'||new.status,v_email,v_name,jsonb_build_object('name',v_name,'amount',new.payout_amount,'currency',new.currency,'status',new.status,'payout_id',new.id));
  end if;
  return new;
end; $$;
drop trigger if exists whiteline_email_talent_payout on public.talent_payouts;
create trigger whiteline_email_talent_payout after update of status on public.talent_payouts for each row execute function public.whiteline_email_payout_trigger();

comment on table public.whiteline_email_outbox is 'Idempotent transactional email queue for White Line applications, bookings, payments and payouts.';