alter table public.music_support_payments
  add column if not exists payer_name text;

create or replace function public.whiteline_email_music_support_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin text;
  v_template text;
  v_tracks jsonb := '[]'::jsonb;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('paid','denied','reversed','refunded') then
    return new;
  end if;

  v_admin := public.whiteline_admin_email();
  v_template := case when new.status = 'paid' then 'admin_music_support_received' else 'admin_music_support_issue' end;

  if new.status = 'paid' then
    select coalesce(r.tracks, '[]'::jsonb)
      into v_tracks
      from public.owner_releases r
     where r.slug = new.release_slug
       and r.status = 'published'
     limit 1;
  end if;

  perform public.whiteline_queue_email(
    'admin-music-support-' || new.status || ':' || new.id,
    v_template,
    v_admin,
    'The Grei Show',
    jsonb_build_object('release_slug',new.release_slug,'release_title',new.release_title,'amount',new.amount,'currency',new.currency,'status',new.status,'payment_id',new.id)
  );

  if new.status = 'paid'
     and new.payer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    perform public.whiteline_queue_email(
      'music-support-buyer-receipt:' || new.id,
      'music_support_buyer_receipt',
      new.payer_email,
      nullif(trim(new.payer_name), ''),
      jsonb_build_object('release_slug',new.release_slug,'release_title',new.release_title,'amount',new.amount,'currency',new.currency,'tracks',v_tracks,'payment_id',new.id)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.whiteline_email_music_support_trigger() from public, anon, authenticated;
grant execute on function public.whiteline_email_music_support_trigger() to service_role;

comment on column public.music_support_payments.payer_name is
  'Buyer name returned by PayPal and used only to personalize the transactional download receipt.';

comment on function public.whiteline_email_music_support_trigger() is
  'Queues idempotent owner alerts and buyer download receipts for music-support payments.';
