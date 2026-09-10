-- Production Visual Reference System
-- Controlled schema, RLS, private storage, audit trail, and Quality workflow.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('production_operator','quality','engineering','document_control','administrator');
create type public.product_status as enum ('active','inactive','obsolete');
create type public.revision_status as enum ('draft','awaiting_approval','approved','rejected','obsolete');
create type public.image_approval_status as enum ('draft','approved','rejected');
create type public.photo_category as enum ('Overall','Front','Rear','Left','Right','Top','Bottom','Label','Connector','Cable Routing','Hardware','Critical Inspection Area','Packaging','Correct Example','Incorrect Example','Other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'production_operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_families (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  part_number citext not null unique,
  description text not null,
  product_family_id uuid references public.product_families(id),
  current_engineering_revision text,
  current_approved_visual_revision text,
  work_instruction_number text,
  status public.product_status not null default 'active',
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(part_number::text)) > 0)
);

create table public.product_revisions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  revision_code text not null,
  ecn_number text,
  status public.revision_status not null default 'draft',
  critical_quality_notes text,
  created_by uuid not null references public.profiles(id),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, revision_code),
  check (char_length(trim(revision_code)) > 0)
);

create table public.visual_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  revision_id uuid not null references public.product_revisions(id) on delete restrict,
  storage_path text not null unique,
  category public.photo_category not null,
  description text,
  sort_order integer not null default 0,
  approval_status public.image_approval_status not null default 'draft',
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejection_reason text,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  previous_value jsonb,
  new_value jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_family_idx on public.products(product_family_id);
create index revisions_product_idx on public.product_revisions(product_id, created_at desc);
create index revisions_status_idx on public.product_revisions(status);
create index assets_revision_idx on public.visual_assets(revision_id, sort_order);
create index audit_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger product_families_updated_at before update on public.product_families for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_revisions_updated_at before update on public.product_revisions for each row execute function public.set_updated_at();
create trigger visual_assets_updated_at before update on public.visual_assets for each row execute function public.set_updated_at();

create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=auth.uid() and active=true
$$;
revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

create or replace function public.role_in(allowed public.app_role[]) returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce(public.current_app_role() = any(allowed), false)
$$;
revoke all on function public.role_in(public.app_role[]) from public;
grant execute on function public.role_in(public.app_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.product_families enable row level security;
alter table public.products enable row level security;
alter table public.product_revisions enable row level security;
alter table public.visual_assets enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles read self or controlled roles" on public.profiles for select to authenticated using (
  id=auth.uid() or public.role_in(array['quality','engineering','document_control','administrator']::public.app_role[])
);
create policy "profiles admin update" on public.profiles for update to authenticated
using (public.role_in(array['administrator']::public.app_role[]))
with check (public.role_in(array['administrator']::public.app_role[]));

create policy "families authenticated read" on public.product_families for select to authenticated using (true);
create policy "families controlled write" on public.product_families for all to authenticated
using (public.role_in(array['engineering','document_control','administrator']::public.app_role[]))
with check (public.role_in(array['engineering','document_control','administrator']::public.app_role[]));

create policy "products authenticated read" on public.products for select to authenticated using (true);
create policy "products controlled insert" on public.products for insert to authenticated
with check (public.role_in(array['engineering','document_control','administrator']::public.app_role[]));
create policy "products controlled update" on public.products for update to authenticated
using (public.role_in(array['engineering','document_control','administrator']::public.app_role[]))
with check (public.role_in(array['engineering','document_control','administrator']::public.app_role[]));

create policy "revisions controlled or current approved read" on public.product_revisions for select to authenticated using (
  public.role_in(array['quality','engineering','document_control','administrator']::public.app_role[])
  or (status='approved' and exists(select 1 from public.products p where p.id=product_id and p.current_approved_visual_revision=revision_code))
);
create policy "revisions engineering insert" on public.product_revisions for insert to authenticated with check (
  public.role_in(array['engineering','administrator']::public.app_role[]) and created_by=auth.uid() and status='draft'
);
create policy "revisions engineering draft update" on public.product_revisions for update to authenticated
using (public.role_in(array['engineering','administrator']::public.app_role[]) and status in ('draft','rejected'))
with check (public.role_in(array['engineering','administrator']::public.app_role[]) and status in ('draft','rejected'));

create policy "visual assets controlled or current approved read" on public.visual_assets for select to authenticated using (
  public.role_in(array['quality','engineering','document_control','administrator']::public.app_role[])
  or (approval_status='approved' and exists(
    select 1 from public.product_revisions r join public.products p on p.id=r.product_id
    where r.id=revision_id and r.status='approved' and p.current_approved_visual_revision=r.revision_code
  ))
);
create policy "visual assets engineering insert" on public.visual_assets for insert to authenticated with check (
  public.role_in(array['engineering','administrator']::public.app_role[]) and uploaded_by=auth.uid() and approval_status='draft'
  and exists(select 1 from public.product_revisions r where r.id=revision_id and r.product_id=product_id and r.status in ('draft','rejected'))
);
create policy "visual assets engineering draft update" on public.visual_assets for update to authenticated
using (public.role_in(array['engineering','administrator']::public.app_role[]) and approval_status in ('draft','rejected'))
with check (public.role_in(array['engineering','administrator']::public.app_role[]) and approval_status in ('draft','rejected'));
create policy "visual assets engineering draft delete" on public.visual_assets for delete to authenticated using (
  public.role_in(array['engineering','administrator']::public.app_role[])
  and exists(select 1 from public.product_revisions r where r.id=revision_id and r.status in ('draft','rejected'))
);
create policy "audit controlled read" on public.audit_events for select to authenticated using (
  public.role_in(array['quality','engineering','document_control','administrator']::public.app_role[])
);

create or replace function public.submit_revision_for_quality(target_revision uuid) returns void
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); before_row jsonb; after_row jsonb;
begin
  if actor is null or not public.role_in(array['engineering','administrator']::public.app_role[]) then raise exception 'not authorized'; end if;
  select to_jsonb(r) into before_row from public.product_revisions r where r.id=target_revision for update;
  if before_row is null then raise exception 'revision not found'; end if;
  if (before_row->>'status') not in ('draft','rejected') then raise exception 'revision cannot be submitted from current status'; end if;
  if not exists(select 1 from public.visual_assets where revision_id=target_revision) then raise exception 'at least one visual asset is required'; end if;
  update public.visual_assets set approval_status='draft',approved_by=null,approved_at=null,rejected_by=null,rejected_at=null,rejection_reason=null where revision_id=target_revision;
  update public.product_revisions set status='awaiting_approval',submitted_by=actor,submitted_at=now(),rejected_by=null,rejected_at=null,rejection_reason=null
    where id=target_revision returning to_jsonb(product_revisions.*) into after_row;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,previous_value,new_value)
    values(actor,'REVISION_SUBMITTED','product_revision',target_revision::text,before_row,after_row);
end; $$;

create or replace function public.approve_visual_revision(target_revision uuid) returns void
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); rev public.product_revisions%rowtype; prod public.products%rowtype; before_product jsonb; after_product jsonb;
begin
  if actor is null or not public.role_in(array['quality','administrator']::public.app_role[]) then raise exception 'not authorized'; end if;
  select * into rev from public.product_revisions where id=target_revision for update;
  if rev.id is null then raise exception 'revision not found'; end if;
  if rev.status<>'awaiting_approval' then raise exception 'revision is not awaiting approval'; end if;
  select * into prod from public.products where id=rev.product_id for update;
  before_product:=to_jsonb(prod);
  update public.product_revisions set status='obsolete'
    where product_id=prod.id and revision_code=prod.current_approved_visual_revision and status='approved' and id<>rev.id;
  update public.product_revisions set status='approved',approved_by=actor,approved_at=now(),rejected_by=null,rejected_at=null,rejection_reason=null where id=rev.id;
  update public.visual_assets set approval_status='approved',approved_by=actor,approved_at=now(),rejected_by=null,rejected_at=null,rejection_reason=null where revision_id=rev.id;
  update public.products set current_approved_visual_revision=rev.revision_code,approved_by=actor,approved_at=now()
    where id=prod.id returning to_jsonb(products.*) into after_product;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,previous_value,new_value)
    values(actor,'VISUAL_REVISION_APPROVED','product',prod.id::text,before_product,after_product);
end; $$;

create or replace function public.reject_visual_revision(target_revision uuid, reason text) returns void
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); before_row jsonb; after_row jsonb;
begin
  if actor is null or not public.role_in(array['quality','administrator']::public.app_role[]) then raise exception 'not authorized'; end if;
  if reason is null or char_length(trim(reason))<3 then raise exception 'rejection reason is required'; end if;
  select to_jsonb(r) into before_row from public.product_revisions r where r.id=target_revision for update;
  if before_row is null then raise exception 'revision not found'; end if;
  if (before_row->>'status')<>'awaiting_approval' then raise exception 'revision is not awaiting approval'; end if;
  update public.product_revisions set status='rejected',rejected_by=actor,rejected_at=now(),rejection_reason=trim(reason),approved_by=null,approved_at=null
    where id=target_revision returning to_jsonb(product_revisions.*) into after_row;
  update public.visual_assets set approval_status='rejected',rejected_by=actor,rejected_at=now(),rejection_reason=trim(reason),approved_by=null,approved_at=null where revision_id=target_revision;
  insert into public.audit_events(actor_user_id,action,entity_type,entity_id,previous_value,new_value)
    values(actor,'VISUAL_REVISION_REJECTED','product_revision',target_revision::text,before_row,after_row);
end; $$;

revoke all on function public.submit_revision_for_quality(uuid) from public;
revoke all on function public.approve_visual_revision(uuid) from public;
revoke all on function public.reject_visual_revision(uuid,text) from public;
grant execute on function public.submit_revision_for_quality(uuid) to authenticated;
grant execute on function public.approve_visual_revision(uuid) to authenticated;
grant execute on function public.reject_visual_revision(uuid,text) to authenticated;

create or replace function public.audit_controlled_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); old_row jsonb; new_row jsonb; entity_key text;
begin
  if tg_op='INSERT' then new_row:=to_jsonb(new); entity_key:=coalesce(new_row->>'id','unknown');
    insert into public.audit_events(actor_user_id,action,entity_type,entity_id,previous_value,new_value) values(actor,'ROW_INSERT',tg_table_name,entity_key,null,new_row); return new;
  elsif tg_op='UPDATE' then old_row:=to_jsonb(old); new_row:=to_jsonb(new); entity_key:=coalesce(new_row->>'id',old_row->>'id','unknown');
    if old_row is distinct from new_row then insert into public.audit_events(actor_user_id,action,entity_type,entity_id,previous_value,new_value) values(actor,'ROW_UPDATE',tg_table_name,entity_key,old_row,new_row); end if; return new;
  else old_row:=to_jsonb(old); entity_key:=coalesce(old_row->>'id','unknown');
    insert into public.audit_events(actor_user_id,action,entity_type,entity_id,previous_value,new_value) values(actor,'ROW_DELETE',tg_table_name,entity_key,old_row,null); return old;
  end if;
end; $$;
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_controlled_change();
create trigger audit_product_families after insert or update or delete on public.product_families for each row execute function public.audit_controlled_change();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_controlled_change();
create trigger audit_product_revisions after insert or update or delete on public.product_revisions for each row execute function public.audit_controlled_change();
create trigger audit_visual_assets after insert or update or delete on public.visual_assets for each row execute function public.audit_controlled_change();

insert into storage.buckets(id,name,public) values('visual-references','visual-references',false)
on conflict(id) do update set public=false;

create policy "controlled visual reference storage read" on storage.objects for select to authenticated using (
  bucket_id='visual-references' and exists(
    select 1 from public.visual_assets a join public.product_revisions r on r.id=a.revision_id
    where a.storage_path=storage.objects.name and (
      public.role_in(array['quality','engineering','document_control','administrator']::public.app_role[])
      or (a.approval_status='approved' and r.status='approved' and exists(select 1 from public.products p where p.id=r.product_id and p.current_approved_visual_revision=r.revision_code))
    )
  )
);
create policy "engineering visual reference storage insert" on storage.objects for insert to authenticated with check (
  bucket_id='visual-references' and public.role_in(array['engineering','administrator']::public.app_role[])
);
create policy "engineering visual reference storage update" on storage.objects for update to authenticated
using (bucket_id='visual-references' and public.role_in(array['engineering','administrator']::public.app_role[]))
with check (bucket_id='visual-references' and public.role_in(array['engineering','administrator']::public.app_role[]));
create policy "engineering draft visual reference storage delete" on storage.objects for delete to authenticated using (
  bucket_id='visual-references' and public.role_in(array['engineering','administrator']::public.app_role[])
  and exists(select 1 from public.visual_assets a join public.product_revisions r on r.id=a.revision_id where a.storage_path=storage.objects.name and r.status in ('draft','rejected'))
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.email)) on conflict(id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
