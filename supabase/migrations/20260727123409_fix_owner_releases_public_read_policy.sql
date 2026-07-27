drop policy if exists owner_releases_public_read on public.owner_releases;
drop policy if exists owner_releases_anon_read on public.owner_releases;
drop policy if exists owner_releases_authenticated_read on public.owner_releases;

create policy owner_releases_anon_read
on public.owner_releases
for select
to anon
using (status = 'published');

create policy owner_releases_authenticated_read
on public.owner_releases
for select
to authenticated
using (status = 'published' or public.owner_is_admin());
