revoke all on function public.whiteline_admin_email() from public,anon,authenticated;
revoke all on function public.whiteline_email_talent_application_trigger() from public,anon,authenticated;
revoke all on function public.whiteline_email_client_request_trigger() from public,anon,authenticated;
revoke all on function public.whiteline_email_payout_trigger() from public,anon,authenticated;

grant select on table public.whiteline_email_settings to authenticated;
grant select,update on table public.whiteline_email_outbox to authenticated;

comment on function public.whiteline_admin_email() is 'Internal trigger helper. Execution is revoked from API roles.';
comment on function public.whiteline_email_talent_application_trigger() is 'Internal trigger function. Execution is revoked from API roles.';
comment on function public.whiteline_email_client_request_trigger() is 'Internal trigger function. Execution is revoked from API roles.';
comment on function public.whiteline_email_payout_trigger() is 'Internal trigger function. Execution is revoked from API roles.';