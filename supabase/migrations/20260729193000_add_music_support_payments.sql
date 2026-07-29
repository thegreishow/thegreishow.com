create table if not exists public.music_support_payments (
  id uuid primary key default gen_random_uuid(),
  release_slug text not null check (release_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  release_title text not null,
  amount numeric(10,2) not null check (amount >= 1 and amount <= 500),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending'
    check (status in ('pending','checkout_created','paid','denied','reversed','refunded','cancelled')),
  paypal_order_id text unique,
  paypal_capture_id text unique,
  payer_email text,
  request_fingerprint text,
  approval_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists music_support_payments_created_idx
  on public.music_support_payments (created_at desc);
create index if not exists music_support_payments_release_idx
  on public.music_support_payments (release_slug, status, created_at desc);
create index if not exists music_support_payments_fingerprint_idx
  on public.music_support_payments (request_fingerprint, created_at desc)
  where request_fingerprint is not null;

alter table public.music_support_payments enable row level security;
revoke all on table public.music_support_payments from anon, authenticated;

comment on table public.music_support_payments is
  'Optional name-your-price contributions attached to free music downloads.';
