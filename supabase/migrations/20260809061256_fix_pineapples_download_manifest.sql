create or replace function public.log_owner_cms_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(tg_op);
  v_row jsonb;
  v_id text;
  v_label text;
  v_details jsonb;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_details := jsonb_build_object('old', v_row);
  else
    v_row := to_jsonb(new);
    v_details := case
      when tg_op = 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', v_row)
      else jsonb_build_object('new', v_row)
    end;
  end if;

  v_id := coalesce(v_row->>'id', v_row->>'key', v_row->>'page_key');
  v_label := coalesce(v_row->>'title', v_row->>'label', v_row->>'page_key', v_row->>'key');

  insert into public.owner_activity_log(entity_type, entity_id, action, label, changed_by, details)
  values (tg_table_name, v_id, v_action, v_label, auth.uid(), v_details);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.log_owner_cms_change() from public, anon, authenticated;
grant execute on function public.log_owner_cms_change() to service_role;

update public.owner_releases
set audio_url = 'https://drive.google.com/file/d/1LJLmeuz3rTiGgUXRZmsjbEv6vWCN5Ncg/view',
    tracks = jsonb_build_array(
      jsonb_build_object(
        'title', 'Pineapples',
        'url', 'https://drive.google.com/file/d/1LJLmeuz3rTiGgUXRZmsjbEv6vWCN5Ncg/view'
      ),
      jsonb_build_object(
        'title', 'Hot Sauce',
        'url', 'https://drive.google.com/file/d/1Y1-SD9D3ku_wlnLMb5pG-9VIaXU5oSX5/view'
      )
    ),
    updated_at = now()
where slug = 'pineapples-and-hot-sauce'
  and status = 'published';
