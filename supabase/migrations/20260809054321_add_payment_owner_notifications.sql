create or replace function public.whiteline_email_client_request_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin text;
  v_stage text;
  v_payment text;
  v_template text;
begin
  v_admin := public.whiteline_admin_email();

  if tg_op = 'INSERT' then
    perform public.whiteline_queue_email(
      'client-request-received:' || new.id,
      'client_request_received',
      new.email,
      new.client_name,
      jsonb_build_object('name',new.client_name,'project_type',new.project_type,'event_date',new.event_date,'location',new.location,'request_id',new.id)
    );
    perform public.whiteline_queue_email(
      'admin-new-client-request:' || new.id,
      'admin_new_client_request',
      v_admin,
      'White Line Admin',
      jsonb_build_object('name',new.client_name,'company',new.company_name,'email',new.email,'project_type',new.project_type,'event_date',new.event_date,'location',new.location,'request_id',new.id)
    );
    return new;
  end if;

  v_stage := coalesce(new.booking_stage, new.status::text);
  if v_stage is distinct from coalesce(old.booking_stage, old.status::text)
     and v_stage in ('quoted','confirmed','completed','cancelled') then
    perform public.whiteline_queue_email(
      'client-booking-' || v_stage || ':' || new.id,
      'client_booking_' || v_stage,
      new.email,
      new.client_name,
      jsonb_build_object('name',new.client_name,'project_type',new.project_type,'event_date',new.event_date,'location',new.location,'quoted_amount',new.quoted_amount,'currency',new.currency,'request_id',new.id)
    );
  end if;

  v_payment := new.payment_status;
  if v_payment is distinct from old.payment_status
     and v_payment in ('deposit_paid','paid_in_full') then
    v_template := case when v_payment = 'paid_in_full' then 'client_payment_paid' else 'client_payment_deposit_paid' end;
    perform public.whiteline_queue_email(
      'client-payment-' || v_payment || ':' || new.id,
      v_template,
      new.email,
      new.client_name,
      jsonb_build_object('name',new.client_name,'project_type',new.project_type,'quoted_amount',new.quoted_amount,'amount_paid',new.amount_paid,'currency',new.currency,'payment_status',v_payment,'request_id',new.id)
    );
    perform public.whiteline_queue_email(
      'admin-booking-payment-' || v_payment || ':' || new.id,
      'admin_booking_payment_received',
      v_admin,
      'White Line Admin',
      jsonb_build_object('name',new.client_name,'email',new.email,'project_type',new.project_type,'quoted_amount',new.quoted_amount,'amount_paid',new.amount_paid,'currency',new.currency,'payment_status',v_payment,'request_id',new.id)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.whiteline_email_client_request_trigger() from public, anon, authenticated;
grant execute on function public.whiteline_email_client_request_trigger() to service_role;

create or replace function public.whiteline_email_music_support_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin text;
  v_template text;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  if new.status not in ('paid','denied','reversed','refunded') then
    return new;
  end if;

  v_admin := public.whiteline_admin_email();
  v_template := case when new.status = 'paid' then 'admin_music_support_received' else 'admin_music_support_issue' end;
  perform public.whiteline_queue_email(
    'admin-music-support-' || new.status || ':' || new.id,
    v_template,
    v_admin,
    'The Grei Show',
    jsonb_build_object('release_slug',new.release_slug,'release_title',new.release_title,'amount',new.amount,'currency',new.currency,'status',new.status,'payment_id',new.id)
  );
  return new;
end;
$$;

revoke all on function public.whiteline_email_music_support_trigger() from public, anon, authenticated;
grant execute on function public.whiteline_email_music_support_trigger() to service_role;

drop trigger if exists whiteline_email_music_support on public.music_support_payments;
create trigger whiteline_email_music_support
after update of status on public.music_support_payments
for each row execute function public.whiteline_email_music_support_trigger();

comment on function public.whiteline_email_music_support_trigger() is
  'Queues idempotent owner notifications for completed or problematic music-support payments.';
