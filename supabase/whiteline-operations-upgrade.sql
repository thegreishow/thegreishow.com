begin;

alter table public.talent_profiles
  add column if not exists source_application_id uuid,
  add column if not exists internal_notes text,
  add column if not exists updated_at timestamptz default now();

alter table public.client_requests
  add column if not exists requested_talent_name text,
  add column if not exists booking_stage text not null default 'new',
  add column if not exists internal_notes text,
  add column if not exists assigned_talent_ids uuid[] not null default '{}',
  add column if not exists quoted_amount numeric,
  add column if not exists updated_at timestamptz default now();

create index if not exists client_requests_booking_stage_idx
  on public.client_requests (booking_stage);

create index if not exists talent_profiles_source_application_idx
  on public.talent_profiles (source_application_id);

create or replace function public.set_whiteline_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists talent_profiles_set_updated_at on public.talent_profiles;
create trigger talent_profiles_set_updated_at
before update on public.talent_profiles
for each row execute function public.set_whiteline_updated_at();

drop trigger if exists client_requests_set_updated_at on public.client_requests;
create trigger client_requests_set_updated_at
before update on public.client_requests
for each row execute function public.set_whiteline_updated_at();

commit;

select 'White Line operations upgrade installed.' as status;
