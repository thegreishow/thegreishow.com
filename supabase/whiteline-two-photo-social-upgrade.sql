begin;

alter table public.talent_profiles
  add column if not exists body_image_url text,
  add column if not exists facebook_url text,
  add column if not exists x_url text;

alter table public.talent_applications
  add column if not exists facebook_url text,
  add column if not exists x_url text;

-- Keep applicant media private. Public visitors may upload only into
-- the applications folder; approved admins may read those files.
drop policy if exists "Public submits talent files" on storage.objects;
create policy "Public submits talent files"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'talent-submissions'
  and (storage.foldername(name))[1] = 'applications'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp','pdf','doc','docx')
);

drop policy if exists "WhiteLine admins read talent submissions" on storage.objects;
create policy "WhiteLine admins read talent submissions"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'talent-submissions'
  and public.is_whiteline_admin()
);

commit;

select 'White Line two-photo and social upgrade installed.' as status;