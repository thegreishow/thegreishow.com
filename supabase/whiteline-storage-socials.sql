-- WHITE LINE ENTERTAINMENT
-- Storage + expanded social links migration
-- Run once in Supabase SQL Editor.

begin;

alter table public.talent_profiles
  add column if not exists facebook_url text,
  add column if not exists x_url text;

-- Public roster images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'talent-media',
  'talent-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Private applicant files, prepared for headshots, resumes and comp cards.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'talent-submissions',
  'talent-submissions',
  false,
  15728640,
  array[
    'image/jpeg','image/png','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads talent media" on storage.objects;
drop policy if exists "WhiteLine admins upload talent media" on storage.objects;
drop policy if exists "WhiteLine admins update talent media" on storage.objects;
drop policy if exists "WhiteLine admins delete talent media" on storage.objects;
drop policy if exists "Public submits talent files" on storage.objects;
drop policy if exists "WhiteLine admins read talent submissions" on storage.objects;
drop policy if exists "WhiteLine admins delete talent submissions" on storage.objects;

create policy "Public reads talent media"
on storage.objects
for select
to public
using (bucket_id = 'talent-media');

create policy "WhiteLine admins upload talent media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'talent-media'
  and public.is_whiteline_admin()
);

create policy "WhiteLine admins update talent media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'talent-media'
  and public.is_whiteline_admin()
)
with check (
  bucket_id = 'talent-media'
  and public.is_whiteline_admin()
);

create policy "WhiteLine admins delete talent media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'talent-media'
  and public.is_whiteline_admin()
);

-- This permits visitors to upload into the private submissions bucket.
-- Files are not publicly readable.
create policy "Public submits talent files"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'talent-submissions'
  and (storage.foldername(name))[1] = 'applications'
);

create policy "WhiteLine admins read talent submissions"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'talent-submissions'
  and public.is_whiteline_admin()
);

create policy "WhiteLine admins delete talent submissions"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'talent-submissions'
  and public.is_whiteline_admin()
);

commit;

select 'White Line storage and social links installed.' as status;
