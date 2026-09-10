alter function public.set_updated_at() set search_path = public;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.audit_controlled_change() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.current_app_role() from public, anon;
revoke all on function public.role_in(public.app_role[]) from public, anon;
revoke all on function public.submit_revision_for_quality(uuid) from public, anon;
revoke all on function public.approve_visual_revision(uuid) from public, anon;
revoke all on function public.reject_visual_revision(uuid,text) from public, anon;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.role_in(public.app_role[]) to authenticated;
grant execute on function public.submit_revision_for_quality(uuid) to authenticated;
grant execute on function public.approve_visual_revision(uuid) to authenticated;
grant execute on function public.reject_visual_revision(uuid,text) to authenticated;
