-- WHITE LINE ENTERTAINMENT: ADMIN SECURITY MIGRATION
-- Run this once in Supabase SQL Editor after creating your admin user.
--
-- Before running the final bootstrap statement at the bottom:
-- 1. Supabase Dashboard > Authentication > Users > Add user.
-- 2. Replace YOUR_ADMIN_EMAIL@example.com with that user's email.

create table if not exists public.whiteline_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.whiteline_admins enable row level security;

create or replace function public.is_whiteline_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.whiteline_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_whiteline_admin() from public;
grant execute on function public.is_whiteline_admin() to authenticated;

-- Remove the broad policies from the original setup.
drop policy if exists "Authenticated users can manage talent profiles" on public.talent_profiles;
drop policy if exists "Authenticated users can manage casting calls" on public.casting_calls;
drop policy if exists "Authenticated users can view talent applications" on public.talent_applications;
drop policy if exists "Authenticated users can update talent applications" on public.talent_applications;
drop policy if exists "Authenticated users can delete talent applications" on public.talent_applications;
drop policy if exists "Authenticated users can view client requests" on public.client_requests;
drop policy if exists "Authenticated users can update client requests" on public.client_requests;
drop policy if exists "Authenticated users can delete client requests" on public.client_requests;

-- Admin-only management policies.
create policy "White Line admins manage talent profiles"
on public.talent_profiles
for all
to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

create policy "White Line admins manage casting calls"
on public.casting_calls
for all
to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

create policy "White Line admins view talent applications"
on public.talent_applications
for select
to authenticated
using (public.is_whiteline_admin());

create policy "White Line admins update talent applications"
on public.talent_applications
for update
to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

create policy "White Line admins delete talent applications"
on public.talent_applications
for delete
to authenticated
using (public.is_whiteline_admin());

create policy "White Line admins view client requests"
on public.client_requests
for select
to authenticated
using (public.is_whiteline_admin());

create policy "White Line admins update client requests"
on public.client_requests
for update
to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

create policy "White Line admins delete client requests"
on public.client_requests
for delete
to authenticated
using (public.is_whiteline_admin());

-- Admins may read their own admin record, but cannot add themselves.
drop policy if exists "Admins view own membership" on public.whiteline_admins;
create policy "Admins view own membership"
on public.whiteline_admins
for select
to authenticated
using (user_id = auth.uid());

grant select on public.whiteline_admins to authenticated;

-- BOOTSTRAP YOUR FIRST ADMIN
-- Replace the email below, remove the leading --, and run that statement.
-- insert into public.whiteline_admins (user_id, email)
-- select id, email from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
-- on conflict (user_id) do update set email = excluded.email;
