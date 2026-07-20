-- Keep public roster media directly accessible without allowing file listings.
drop policy if exists "Public reads talent media" on storage.objects;

-- Trigger helper is not API-callable and must have a fixed schema lookup path.
alter function public.set_whiteline_updated_at() set search_path = public;

-- These functions are intentionally available only to signed-in users. Their
-- function bodies enforce the additional admin or profile ownership checks.
revoke all on function public.approve_talent_application(uuid) from public, anon;
grant execute on function public.approve_talent_application(uuid) to authenticated;

revoke all on function public.claim_talent_portal() from public, anon;
grant execute on function public.claim_talent_portal() to authenticated;

revoke all on function public.current_talent_profile_id() from public, anon;
grant execute on function public.current_talent_profile_id() to authenticated;

revoke all on function public.is_whiteline_admin() from public, anon;
grant execute on function public.is_whiteline_admin() to authenticated;

-- This is an internal RLS event-trigger helper, never an RPC endpoint.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
