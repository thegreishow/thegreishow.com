create or replace function public.whiteline_claim_email_batch(p_limit integer default 20)
returns setof public.whiteline_email_outbox
language plpgsql security definer set search_path=public as $$
begin
  return query
  with candidates as (
    select id from public.whiteline_email_outbox
    where status in ('pending','failed') and available_at <= now() and attempts < 5
    order by created_at
    for update skip locked
    limit greatest(1,least(coalesce(p_limit,20),100))
  ), claimed as (
    update public.whiteline_email_outbox o
    set status='processing',attempts=o.attempts+1,locked_at=now(),updated_at=now(),last_error=null
    from candidates c where o.id=c.id
    returning o.*
  ) select * from claimed;
end; $$;
revoke all on function public.whiteline_claim_email_batch(integer) from public,anon,authenticated;
grant execute on function public.whiteline_claim_email_batch(integer) to service_role;

create or replace function public.whiteline_recover_stale_emails() returns integer
language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  update public.whiteline_email_outbox set status='failed',available_at=now(),last_error='Recovered stale processing lock',locked_at=null,updated_at=now()
  where status='processing' and locked_at < now()-interval '15 minutes';
  get diagnostics v_count=row_count;
  return v_count;
end; $$;
revoke all on function public.whiteline_recover_stale_emails() from public,anon,authenticated;
grant execute on function public.whiteline_recover_stale_emails() to service_role;