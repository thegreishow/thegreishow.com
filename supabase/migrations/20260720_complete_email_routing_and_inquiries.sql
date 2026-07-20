alter table public.whiteline_email_outbox
  add column if not exists reply_to_email text,
  add column if not exists email_category text;

create index if not exists whiteline_email_outbox_category_idx
  on public.whiteline_email_outbox (email_category, created_at desc);

create table if not exists public.whiteline_contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_type text not null check (inquiry_type in ('press','support','general')),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','resolved','closed')),
  source text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whiteline_contact_inquiries enable row level security;

drop policy if exists "public can submit contact inquiries" on public.whiteline_contact_inquiries;
create policy "public can submit contact inquiries"
on public.whiteline_contact_inquiries for insert
to anon, authenticated
with check (
  length(trim(name)) between 2 and 120
  and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  and length(trim(message)) between 10 and 5000
);

drop policy if exists "admins can read contact inquiries" on public.whiteline_contact_inquiries;
create policy "admins can read contact inquiries"
on public.whiteline_contact_inquiries for select
to authenticated
using (exists (select 1 from public.whiteline_admins a where a.user_id = auth.uid()));

drop policy if exists "admins can update contact inquiries" on public.whiteline_contact_inquiries;
create policy "admins can update contact inquiries"
on public.whiteline_contact_inquiries for update
to authenticated
using (exists (select 1 from public.whiteline_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.whiteline_admins a where a.user_id = auth.uid()));

create or replace function public.whiteline_queue_contact_inquiry_emails()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destination text;
  confirmation_template text;
begin
  destination := case new.inquiry_type
    when 'press' then 'press@thegreishow.com'
    when 'support' then 'support@thegreishow.com'
    else 'hello@thegreishow.com'
  end;
  confirmation_template := 'contact_' || new.inquiry_type || '_received';

  perform public.whiteline_queue_email(
    'contact:' || new.id || ':confirmation',
    confirmation_template,
    new.email,
    new.name,
    jsonb_build_object('name',new.name,'subject',new.subject,'message',new.message,'inquiry_type',new.inquiry_type,'inquiry_id',new.id)
  );

  perform public.whiteline_queue_email(
    'contact:' || new.id || ':admin',
    'admin_new_contact_inquiry',
    destination,
    'White Line Team',
    jsonb_build_object('name',new.name,'email',new.email,'subject',new.subject,'message',new.message,'inquiry_type',new.inquiry_type,'inquiry_id',new.id)
  );
  return new;
end;
$$;

revoke all on function public.whiteline_queue_contact_inquiry_emails() from public, anon, authenticated;

drop trigger if exists whiteline_contact_inquiry_email_trigger on public.whiteline_contact_inquiries;
create trigger whiteline_contact_inquiry_email_trigger
after insert on public.whiteline_contact_inquiries
for each row execute function public.whiteline_queue_contact_inquiry_emails();

drop function if exists public.whiteline_claim_email_batch(integer);
create function public.whiteline_claim_email_batch(p_limit integer default 20)
returns table (
  id uuid,
  template_key text,
  recipient_email text,
  recipient_name text,
  payload jsonb,
  attempts integer,
  reply_to_email text,
  email_category text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select o.id
    from public.whiteline_email_outbox o
    where o.status in ('pending','failed')
      and o.available_at <= now()
      and o.attempts < 6
    order by o.available_at, o.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,20),100))
  )
  update public.whiteline_email_outbox o
  set status='processing', attempts=o.attempts+1, locked_at=now(), updated_at=now()
  from claimed c
  where o.id=c.id
  returning o.id,o.template_key,o.recipient_email,o.recipient_name,o.payload,o.attempts,o.reply_to_email,o.email_category;
end;
$$;

revoke all on function public.whiteline_claim_email_batch(integer) from public, anon, authenticated;
