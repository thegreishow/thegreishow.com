do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'whiteline_email_cron_token'
  ) then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'whiteline_email_cron_token',
      'Authenticates the scheduled White Line email dispatcher'
    );
  end if;
end
$$;

create or replace function public.whiteline_authorize_email_cron(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public, vault, extensions
as $$
  select coalesce(
    encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex') =
    encode(digest(convert_to(decrypted_secret, 'UTF8'), 'sha256'), 'hex'),
    false
  )
  from vault.decrypted_secrets
  where name = 'whiteline_email_cron_token'
$$;

revoke all on function public.whiteline_authorize_email_cron(text) from public, anon, authenticated;
grant execute on function public.whiteline_authorize_email_cron(text) to service_role;
