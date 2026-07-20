begin;

alter table public.talent_profiles
  add column if not exists contact_email text,
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists availability_status text not null default 'available';

create table if not exists public.talent_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  talent_profile_id uuid not null unique references public.talent_profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.talent_profile_changes (
  id uuid primary key default gen_random_uuid(),
  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  proposed_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.talent_casting_applications (
  id uuid primary key default gen_random_uuid(),
  casting_call_id uuid not null references public.casting_calls(id) on delete cascade,
  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'submitted' check (status in ('submitted','reviewing','shortlisted','selected','declined','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(casting_call_id, talent_profile_id)
);

create table if not exists public.talent_booking_responses (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null references public.client_requests(id) on delete cascade,
  talent_profile_id uuid not null references public.talent_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','available','unavailable','tentative')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_request_id, talent_profile_id)
);

create index if not exists talent_profile_changes_profile_idx on public.talent_profile_changes(talent_profile_id, created_at desc);
create index if not exists talent_casting_applications_profile_idx on public.talent_casting_applications(talent_profile_id, created_at desc);
create index if not exists talent_booking_responses_profile_idx on public.talent_booking_responses(talent_profile_id, created_at desc);

create or replace function public.current_talent_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select talent_profile_id
  from public.talent_accounts
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.claim_talent_portal()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  matched_profile uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into matched_profile
  from public.talent_profiles
  where portal_enabled = true
    and contact_email is not null
    and lower(contact_email) = lower(coalesce(auth.jwt()->>'email',''))
  limit 1;

  if matched_profile is null then
    raise exception 'No portal-enabled talent profile matches this email address';
  end if;

  insert into public.talent_accounts(user_id, talent_profile_id, status)
  values(auth.uid(), matched_profile, 'active')
  on conflict (user_id) do update
    set talent_profile_id = excluded.talent_profile_id,
        status = 'active',
        updated_at = now();

  return matched_profile;
end;
$$;

revoke all on function public.current_talent_profile_id() from public, anon;
grant execute on function public.current_talent_profile_id() to authenticated;
revoke all on function public.claim_talent_portal() from public, anon;
grant execute on function public.claim_talent_portal() to authenticated;

alter table public.talent_accounts enable row level security;
alter table public.talent_profile_changes enable row level security;
alter table public.talent_casting_applications enable row level security;
alter table public.talent_booking_responses enable row level security;

-- Talent account access
create policy "Talent reads own account" on public.talent_accounts
for select to authenticated
using (user_id = auth.uid() or public.is_whiteline_admin());

create policy "Admins manage talent accounts" on public.talent_accounts
for all to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

-- Profile access: talent may read only their linked profile; public approved policy can coexist.
create policy "Talent reads own linked profile" on public.talent_profiles
for select to authenticated
using (id = public.current_talent_profile_id() or public.is_whiteline_admin());

-- Pending profile changes
create policy "Talent reads own profile changes" on public.talent_profile_changes
for select to authenticated
using (submitted_by = auth.uid() or public.is_whiteline_admin());

create policy "Talent submits own profile changes" on public.talent_profile_changes
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and talent_profile_id = public.current_talent_profile_id()
  and status = 'pending'
);

create policy "Admins manage profile changes" on public.talent_profile_changes
for all to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

-- Casting applications
create policy "Talent reads own casting applications" on public.talent_casting_applications
for select to authenticated
using (user_id = auth.uid() or public.is_whiteline_admin());

create policy "Talent submits casting applications" on public.talent_casting_applications
for insert to authenticated
with check (
  user_id = auth.uid()
  and talent_profile_id = public.current_talent_profile_id()
);

create policy "Talent updates own casting applications" on public.talent_casting_applications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and talent_profile_id = public.current_talent_profile_id());

create policy "Admins manage casting applications" on public.talent_casting_applications
for all to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

-- Assigned bookings are read through client_requests only when assigned.
create policy "Talent reads assigned client requests" on public.client_requests
for select to authenticated
using (
  public.current_talent_profile_id() = any(coalesce(assigned_talent_ids, '{}'::uuid[]))
  or public.is_whiteline_admin()
);

create policy "Talent reads own booking responses" on public.talent_booking_responses
for select to authenticated
using (user_id = auth.uid() or public.is_whiteline_admin());

create policy "Talent creates own booking responses" on public.talent_booking_responses
for insert to authenticated
with check (
  user_id = auth.uid()
  and talent_profile_id = public.current_talent_profile_id()
);

create policy "Talent updates own booking responses" on public.talent_booking_responses
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and talent_profile_id = public.current_talent_profile_id());

create policy "Admins manage booking responses" on public.talent_booking_responses
for all to authenticated
using (public.is_whiteline_admin())
with check (public.is_whiteline_admin());

-- Talent may upload proposed media only to their own private folder.
create policy "Talent uploads portal media" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'talent-submissions'
  and (storage.foldername(name))[1] = 'portal'
  and (storage.foldername(name))[2] = auth.uid()::text
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','pdf','doc','docx')
);

create policy "Talent reads own portal media" on storage.objects
for select to authenticated
using (
  bucket_id = 'talent-submissions'
  and (storage.foldername(name))[1] = 'portal'
  and (storage.foldername(name))[2] = auth.uid()::text
);

commit;

select 'White Line talent portal installed.' as status;
