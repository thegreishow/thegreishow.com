-- WHITE LINE ENTERTAINMENT DATABASE
-- Run this entire file once in Supabase > SQL Editor.
-- The public website uses only the anon key. Row Level Security protects private submissions.

create extension if not exists pgcrypto;

create table if not exists public.talent_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  professional_name text not null,
  legal_name text,
  disciplines text[] not null default '{}',
  location text default 'Jamaica',
  image_url text,
  bio text not null,
  credits text[] not null default '{}',
  instagram_url text,
  reel_url text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.casting_calls (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  project_type text not null,
  location text not null,
  project_date date,
  deadline date,
  compensation text,
  summary text not null,
  requirements text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','open','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.talent_applications (
  id uuid primary key default gen_random_uuid(),
  application_type text not null default 'General talent profile',
  full_name text not null,
  professional_name text,
  email text not null,
  phone text not null,
  location text not null,
  years_experience integer not null default 0 check (years_experience >= 0),
  disciplines text[] not null default '{}',
  portfolio_links text not null,
  bio text not null,
  credits text,
  consent boolean not null default false,
  status text not null default 'new' check (status in ('new','reviewing','approved','declined','archived')),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  company text,
  email text not null,
  phone text not null,
  project_type text not null,
  talent_requested text not null,
  project_date date,
  location text not null,
  budget text not null,
  usage text not null,
  brief text not null,
  consent boolean not null default false,
  status text not null default 'new' check (status in ('new','contacted','quoted','confirmed','completed','declined','archived')),
  source text not null default 'website',
  created_at timestamptz not null default now()
);

create index if not exists talent_profiles_status_idx on public.talent_profiles(status);
create index if not exists casting_calls_status_deadline_idx on public.casting_calls(status, deadline);
create index if not exists talent_applications_created_idx on public.talent_applications(created_at desc);
create index if not exists client_requests_created_idx on public.client_requests(created_at desc);

alter table public.talent_profiles enable row level security;
alter table public.casting_calls enable row level security;
alter table public.talent_applications enable row level security;
alter table public.client_requests enable row level security;

-- Anyone can see only approved talent.
drop policy if exists "Public reads approved talent" on public.talent_profiles;
create policy "Public reads approved talent"
on public.talent_profiles for select
to anon, authenticated
using (status = 'approved');

-- Anyone can see only active, non-expired casting calls.
drop policy if exists "Public reads open casting calls" on public.casting_calls;
create policy "Public reads open casting calls"
on public.casting_calls for select
to anon, authenticated
using (status = 'open' and (deadline is null or deadline >= current_date));

-- Website visitors may submit, but cannot read, update or delete applications.
drop policy if exists "Public submits talent applications" on public.talent_applications;
create policy "Public submits talent applications"
on public.talent_applications for insert
to anon, authenticated
with check (consent = true and status = 'new' and source = 'website');

drop policy if exists "Public submits client requests" on public.client_requests;
create policy "Public submits client requests"
on public.client_requests for insert
to anon, authenticated
with check (consent = true and status = 'new' and source = 'website');

-- Automatically maintain updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists talent_profiles_set_updated_at on public.talent_profiles;
create trigger talent_profiles_set_updated_at
before update on public.talent_profiles
for each row execute function public.set_updated_at();

drop trigger if exists casting_calls_set_updated_at on public.casting_calls;
create trigger casting_calls_set_updated_at
before update on public.casting_calls
for each row execute function public.set_updated_at();

-- Optional starter records. Uncomment and customize after the schema is installed.
-- insert into public.talent_profiles
-- (slug, professional_name, disciplines, location, bio, featured, status)
-- values ('sample-talent','Sample Talent',array['Dancer'],'Kingston, Jamaica','Client-facing biography.',true,'approved');

-- insert into public.casting_calls
-- (slug,title,project_type,location,project_date,deadline,compensation,summary,requirements,status)
-- values ('sample-casting','Dancers Needed','Music video','Kingston',current_date + 20,current_date + 10,'Paid','Short public brief.',array['Dancehall experience'],'open');
