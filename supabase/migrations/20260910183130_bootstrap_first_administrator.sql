create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;

create table if not exists app_private.bootstrap_admin_emails (
  email_hash text primary key,
  created_at timestamptz not null default now()
);

revoke all on table app_private.bootstrap_admin_emails from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public,app_private as $$
declare
  should_bootstrap boolean;
begin
  select exists(
    select 1
    from app_private.bootstrap_admin_emails b
    where b.email_hash = encode(digest(lower(new.email), 'sha256'), 'hex')
  ) into should_bootstrap;

  insert into public.profiles(id,display_name,role)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name',new.email),
    case when should_bootstrap then 'administrator'::public.app_role else 'production_operator'::public.app_role end
  )
  on conflict(id) do nothing;

  if should_bootstrap then
    delete from app_private.bootstrap_admin_emails
    where email_hash = encode(digest(lower(new.email), 'sha256'), 'hex');
  end if;

  return new;
end; $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
