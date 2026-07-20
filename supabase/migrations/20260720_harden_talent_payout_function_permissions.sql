revoke all on function public.set_my_payout_details(text,text) from public, anon, authenticated;
grant execute on function public.set_my_payout_details(text,text) to authenticated;

revoke all on function public.refresh_talent_payout_for_booking(uuid) from public, anon, authenticated;
grant execute on function public.refresh_talent_payout_for_booking(uuid) to service_role;

revoke all on function public.refresh_talent_payout_payment_trigger() from public, anon, authenticated;
revoke all on function public.refresh_talent_payout_booking_trigger() from public, anon, authenticated;
