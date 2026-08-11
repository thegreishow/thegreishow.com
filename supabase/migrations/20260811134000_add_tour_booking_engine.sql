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

create table if not exists public.tour_experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  active boolean not null default true,
  payment_enabled boolean not null default false,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  price_per_guest numeric(10,2) check (price_per_guest is null or price_per_guest > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  capacity_per_date integer not null default 6 check (capacity_per_date > 0),
  weekday smallint check (weekday is null or weekday between 0 and 6),
  cancellation_hours integer not null default 24 check (cancellation_hours >= 0),
  pickup_options jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tour_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  experience_id uuid not null references public.tour_experiences(id),
  booking_date date not null,
  guest_count integer not null check (guest_count between 1 and 12),
  customer_name text,
  customer_email text,
  customer_phone text,
  pickup_area text,
  amount_total numeric(10,2) not null check (amount_total > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending_payment' check (status in ('pending_payment','confirmed','cancelled','expired','refunded','payment_failed')),
  paypal_order_id text unique,
  paypal_capture_id text unique,
  approval_url text,
  payer_email text,
  provider_payload jsonb not null default '{}'::jsonb,
  hold_expires_at timestamptz not null default (now() + interval '20 minutes'),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tour_bookings_experience_date_idx on public.tour_bookings(experience_id, booking_date);
create index if not exists tour_bookings_status_idx on public.tour_bookings(status);
alter table public.tour_experiences enable row level security;
alter table public.tour_bookings enable row level security;
revoke all on public.tour_experiences from anon, authenticated;
revoke all on public.tour_bookings from anon, authenticated;
grant all on public.tour_experiences to service_role;
grant all on public.tour_bookings to service_role;

create or replace function public.create_tour_booking_hold(
  p_slug text,
  p_booking_date date,
  p_guest_count integer,
  p_customer_name text default null,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_pickup_area text default null
) returns public.tour_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  exp public.tour_experiences;
  booked integer;
  result public.tour_bookings;
  ref text;
begin
  if p_booking_date < current_date then raise exception 'Booking date must be today or later.'; end if;
  if p_guest_count < 1 or p_guest_count > 12 then raise exception 'Invalid guest count.'; end if;
  select * into exp from public.tour_experiences where slug = p_slug and active = true for update;
  if not found then raise exception 'Experience not found.'; end if;
  if not exp.payment_enabled or exp.price_per_guest is null then raise exception 'Direct payment is not enabled for this experience yet.'; end if;
  if exp.weekday is not null and extract(dow from p_booking_date)::smallint <> exp.weekday then raise exception 'This experience is not available on that day.'; end if;
  perform pg_advisory_xact_lock(hashtext(exp.id::text || ':' || p_booking_date::text));
  update public.tour_bookings set status='expired', updated_at=now()
    where experience_id=exp.id and booking_date=p_booking_date and status='pending_payment' and hold_expires_at < now();
  select coalesce(sum(guest_count),0)::integer into booked from public.tour_bookings
    where experience_id=exp.id and booking_date=p_booking_date
      and (status='confirmed' or (status='pending_payment' and hold_expires_at >= now()));
  if booked + p_guest_count > exp.capacity_per_date then raise exception 'Not enough availability for that date.'; end if;
  ref := 'ILK-' || to_char(p_booking_date,'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into public.tour_bookings(booking_reference,experience_id,booking_date,guest_count,customer_name,customer_email,customer_phone,pickup_area,amount_total,currency)
  values(ref,exp.id,p_booking_date,p_guest_count,nullif(trim(coalesce(p_customer_name,'')),''),nullif(lower(trim(coalesce(p_customer_email,''))),''),nullif(trim(coalesce(p_customer_phone,'')),''),nullif(trim(coalesce(p_pickup_area,'')),''),round(exp.price_per_guest*p_guest_count,2),exp.currency)
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_tour_booking_hold(text,date,integer,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_tour_booking_hold(text,date,integer,text,text,text,text) to service_role;

insert into public.tour_experiences(slug,title,active,payment_enabled,currency,price_per_guest,duration_minutes,capacity_per_date,weekday,cancellation_hours,pickup_options,metadata)
values
('judgement-yard','Judgement Yard',true,true,'USD',50.00,120,6,null,24,'["Kingston","Half Way Tree","New Kingston","Papine","Other Kingston area"]'::jsonb,'{"location":"August Town, Kingston"}'::jsonb),
('kingston-dub-club','Kingston Dub Club — Sunday Night',true,false,'USD',null,240,6,0,24,'["Kingston / New Kingston pickup","Meet at Dub Club","Other Kingston area"]'::jsonb,'{"location":"7B Skyline Drive, Jacks Hill","start_time":"20:00"}'::jsonb)
on conflict (slug) do update set title=excluded.title, active=excluded.active, duration_minutes=excluded.duration_minutes, weekday=excluded.weekday, pickup_options=excluded.pickup_options, metadata=excluded.metadata, updated_at=now();