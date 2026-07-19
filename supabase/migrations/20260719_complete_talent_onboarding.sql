alter table public.talent_applications
  add column if not exists media_consent boolean not null default false,
  add column if not exists rights_confirmation boolean not null default false,
  add column if not exists age_confirmation boolean not null default false,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists commission_rate numeric(5,2) not null default 15;

comment on column public.talent_applications.commission_rate is
  'White Line standard agency commission percentage accepted with the application. Current standard: 15%.';

create or replace function public.approve_talent_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application public.talent_applications%rowtype;
  profile_id uuid;
  base_slug text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.whiteline_admins where user_id = auth.uid()
  ) then
    raise exception 'White Line administrator access required';
  end if;

  select * into application
  from public.talent_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Talent application not found';
  end if;

  if coalesce(application.consent_to_store_data, false) is not true
     or coalesce(application.consent_to_contact, false) is not true
     or coalesce(application.media_consent, false) is not true
     or coalesce(application.rights_confirmation, false) is not true
     or coalesce(application.age_confirmation, false) is not true
     or application.terms_accepted_at is null
     or coalesce(application.commission_rate, 0) <> 15 then
    raise exception 'Application is missing required consent or current 15%% terms acceptance';
  end if;

  base_slug := lower(regexp_replace(coalesce(nullif(application.stage_name, ''), application.full_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  select id into profile_id
  from public.talent_profiles
  where source_application_id = application.id
  limit 1;

  if profile_id is null then
    insert into public.talent_profiles (
      full_name, stage_name, slug, category, secondary_categories,
      short_bio, full_bio, city, parish, country,
      instagram_url, tiktok_url, youtube_url, facebook_url, x_url,
      website_url, portfolio_url, skills, available_for_travel,
      featured, status, display_order, source_application_id,
      contact_email, portal_enabled, availability_status
    ) values (
      application.full_name,
      application.stage_name,
      base_slug || '-' || substr(application.id::text, 1, 8),
      application.category,
      application.secondary_categories,
      left(application.biography, 320),
      application.biography,
      application.city,
      application.parish,
      coalesce(application.country, 'Jamaica'),
      application.instagram_url,
      application.tiktok_url,
      application.youtube_url,
      application.facebook_url,
      application.x_url,
      application.website_url,
      application.portfolio_url,
      case when nullif(application.skills, '') is null then array[]::text[] else regexp_split_to_array(application.skills, '\s*,\s*') end,
      application.available_for_travel,
      false,
      'approved',
      1000,
      application.id,
      lower(application.email),
      true,
      'available'
    ) returning id into profile_id;
  else
    update public.talent_profiles
    set full_name = application.full_name,
        stage_name = application.stage_name,
        category = application.category,
        secondary_categories = application.secondary_categories,
        short_bio = left(application.biography, 320),
        full_bio = application.biography,
        city = application.city,
        parish = application.parish,
        country = coalesce(application.country, 'Jamaica'),
        instagram_url = application.instagram_url,
        tiktok_url = application.tiktok_url,
        youtube_url = application.youtube_url,
        facebook_url = application.facebook_url,
        x_url = application.x_url,
        website_url = application.website_url,
        portfolio_url = application.portfolio_url,
        contact_email = lower(application.email),
        portal_enabled = true,
        status = 'approved',
        updated_at = now()
    where id = profile_id;
  end if;

  update public.talent_applications
  set status = 'approved', updated_at = now()
  where id = application.id;

  return profile_id;
end;
$$;

revoke all on function public.approve_talent_application(uuid) from public;
grant execute on function public.approve_talent_application(uuid) to authenticated;
