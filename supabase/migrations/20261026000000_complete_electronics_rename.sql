-- ============================================================
-- COMPLETE "appliances" -> "electronics" RENAME
-- ============================================================
-- Follow-up to 20261022000000_rename_appliances_to_electronics.sql.
--
-- That migration renamed the table and column but deliberately
-- kept the old RPC names, the appliance-images bucket and the
-- "Appliance not found." message. This migration finishes the
-- rename:
--
--   * adds electronics-named RPCs with corrected bodies
--   * keeps old RPC names as temporary wrappers for older OTA
--     clients until the updated app has rolled out
--   * drops the orphan usage RPCs (their table never existed)
--   * replaces appliance-named RLS policies with electronics
--     policies
--   * creates the electronics-images bucket and its policies
--
-- The old appliance-images bucket and its policies are kept
-- during the transition. They are dropped after the OTA has
-- been verified.
-- ============================================================

begin;


-- ============================================================
-- 1. DROP ORPHAN / DEAD FUNCTIONS
-- ============================================================
-- record_appliance_usage and get_appliance_usage_report point
-- at public.appliance_usage_history, which does not exist and
-- is not part of the current scope. set_appliance_archive was
-- used by a trigger that v7 removed.

drop function if exists public.record_appliance_usage(
    uuid,
    bigint,
    text,
    text,
    numeric,
    integer,
    numeric
);

drop function if exists public.get_appliance_usage_report(
    timestamp with time zone,
    timestamp with time zone,
    text,
    text
);

drop function if exists public.set_appliance_archive();


-- ============================================================
-- 2. ELECTRONICS RPCS
-- ============================================================

create or replace function
public.save_electronics_selection(
    p_catalog jsonb,
    p_custom_selected uuid[] default '{}'::uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare

    uid uuid := (select auth.uid());

    selected_ids uuid[] :=
        coalesce(p_custom_selected, '{}'::uuid[]);

    pick_count integer;

begin

    if uid is null then

        raise exception 'Not authenticated.';

    end if;


    if p_catalog is null
       or jsonb_typeof(p_catalog) <> 'array'
    then

        raise exception 'p_catalog must be a JSON array.';

    end if;


    if jsonb_array_length(p_catalog) > 200 then

        raise exception 'p_catalog is too large.';

    end if;


    -- 1. Delete deselected catalog picks

    delete from public.electronics a
    where a.user_id = uid
      and a.type = 'given'
      and not exists (
          select 1
          from jsonb_array_elements(p_catalog) i
          where i->>'key' = a.catalog_key
      );


    -- 2. Insert newly selected catalog picks

    insert into public.electronics (
        user_id,
        electronics_name,
        type,
        catalog_key,
        wattage_min,
        wattage_max,
        selection
    )
    select distinct on (p.item_key)
        uid,
        p.item_name,
        'given',
        p.item_key,
        p.watt_min,
        p.watt_max,
        true
    from (

        select
            i->>'key' as item_key,

            btrim(i->>'name') as item_name,

            case
                when (i->>'wattMin') ~ '^[0-9]+(\.[0-9]+)?$'
                then (i->>'wattMin')::numeric
            end as watt_min,

            case
                when (i->>'wattMax') ~ '^[0-9]+(\.[0-9]+)?$'
                then (i->>'wattMax')::numeric
            end as watt_max

        from jsonb_array_elements(p_catalog) i

    ) p
    where p.item_key like 'catalog:%'
      and char_length(coalesce(p.item_name, '')) between 1 and 120
      and p.watt_min > 0
      and p.watt_max >= p.watt_min
      and p.watt_max <= 720
    order by p.item_key
    on conflict (user_id, catalog_key)
    do nothing;


    -- 3. Update selection of custom electronics (archive untouched)

    update public.electronics a
    set selection = (a.app_id = any(selected_ids))
    where a.user_id = uid
      and a.type = 'custom'
      and a.selection is distinct from
          (a.app_id = any(selected_ids));


    -- 4. Count selected electronics

    select count(*)
    into pick_count
    from public.electronics a
    where a.user_id = uid
      and (a.type = 'given' or a.selection);


    return pick_count;

end;
$$;

revoke execute
on function public.save_electronics_selection(jsonb, uuid[])
from public, anon;

grant execute
on function public.save_electronics_selection(jsonb, uuid[])
to authenticated, service_role;


create or replace function
public.reset_electronics_selection()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare

    uid uuid := (select auth.uid());

begin

    if uid is null then

        raise exception 'Not authenticated.';

    end if;


    delete from public.electronics a
    where a.user_id = uid
      and a.type = 'given';


    update public.electronics a
    set selection = false
    where a.user_id = uid
      and a.type = 'custom'
      and a.selection is distinct from false;

end;
$$;

revoke execute
on function public.reset_electronics_selection()
from public, anon;

grant execute
on function public.reset_electronics_selection()
to authenticated, service_role;


create or replace function
public.archive_electronics(p_app_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare

    uid uuid := (select auth.uid());

begin

    if uid is null then

        raise exception 'Not authenticated.';

    end if;


    if p_app_id is null then

        raise exception 'p_app_id is required.';

    end if;


    update public.electronics a
    set
        selection = false,
        archive = true
    where a.app_id = p_app_id
      and a.user_id = uid
      and a.type = 'custom';


    if not found then

        raise exception 'Electronics item not found.';

    end if;

end;
$$;

revoke execute
on function public.archive_electronics(uuid)
from public, anon;

grant execute
on function public.archive_electronics(uuid)
to authenticated, service_role;


create or replace function
public.unarchive_electronics(p_app_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare

    uid uuid := (select auth.uid());

begin

    if uid is null then

        raise exception 'Not authenticated.';

    end if;


    if p_app_id is null then

        raise exception 'p_app_id is required.';

    end if;


    update public.electronics a
    set
        archive = false,
        selection = false
    where a.app_id = p_app_id
      and a.user_id = uid
      and a.type = 'custom';


    if not found then

        raise exception 'Electronics item not found.';

    end if;

end;
$$;

revoke execute
on function public.unarchive_electronics(uuid)
from public, anon;

grant execute
on function public.unarchive_electronics(uuid)
to authenticated, service_role;


-- ============================================================
-- 3. TEMPORARY BACKWARD-COMPATIBLE RPC WRAPPERS
-- ============================================================
-- OTA clients that still call the old names keep working until
-- the old functions are dropped after the updated OTA is live.

create or replace function
public.save_appliance_selection(
    p_catalog jsonb,
    p_custom_selected uuid[] default '{}'::uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
begin

    return public.save_electronics_selection(
        p_catalog,
        p_custom_selected
    );

end;
$$;


create or replace function
public.reset_appliance_selection()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin

    perform public.reset_electronics_selection();

end;
$$;


create or replace function
public.archive_appliance(p_app_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin

    perform public.archive_electronics(p_app_id);

end;
$$;


create or replace function
public.unarchive_appliance(p_app_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin

    perform public.unarchive_electronics(p_app_id);

end;
$$;


-- ============================================================
-- 4. RLS POLICIES ON public.electronics
-- ============================================================
-- Remove every old appliance-named policy (including the
-- duplicate variants) and install one canonical set.

do $$
declare
    r record;
begin

    for r in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'electronics'
          and policyname ilike '%appliance%'
    loop

        execute format(
            'drop policy if exists %I on public.electronics',
            r.policyname
        );

    end loop;

end $$;


drop policy if exists "Users can view own electronics"
on public.electronics;

drop policy if exists "Users can add own electronics"
on public.electronics;

drop policy if exists "Users can update own custom electronics"
on public.electronics;

drop policy if exists "Users can delete own electronics"
on public.electronics;


create policy "Users can view own electronics"
on public.electronics
for select
to authenticated
using (
    user_id = (select auth.uid())
);


create policy "Users can add own electronics"
on public.electronics
for insert
to authenticated
with check (
    user_id = (select auth.uid())
);


create policy "Users can update own custom electronics"
on public.electronics
for update
to authenticated
using (
    type = 'custom'
    and user_id = (select auth.uid())
)
with check (
    type = 'custom'
    and user_id = (select auth.uid())
);


create policy "Users can delete own electronics"
on public.electronics
for delete
to authenticated
using (
    user_id = (select auth.uid())
);


-- ============================================================
-- 5. ELECTRONICS IMAGES BUCKET
-- ============================================================
-- Objects are copied from appliance-images separately with
-- the Storage API, then public.electronics.image_url is
-- rewritten. The old bucket stays until the OTA is verified.

insert into storage.buckets (
    id,
    name,
    public
)
values (
    'electronics-images',
    'electronics-images',
    true
)
on conflict (id) do update
set public = excluded.public;


drop policy if exists "Public read electronics images"
on storage.objects;

create policy "Public read electronics images"
on storage.objects
for select
to public
using (
    bucket_id = 'electronics-images'
);


drop policy if exists "Users upload own electronics images"
on storage.objects;

create policy "Users upload own electronics images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'electronics-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);


drop policy if exists "Users update own electronics images"
on storage.objects;

create policy "Users update own electronics images"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'electronics-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
    bucket_id = 'electronics-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);


drop policy if exists "Users delete own electronics images"
on storage.objects;

create policy "Users delete own electronics images"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'electronics-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);


-- ============================================================
-- 6. VERIFY
-- ============================================================

select
    p.proname,
    pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.proname in (
      'save_electronics_selection',
      'reset_electronics_selection',
      'archive_electronics',
      'unarchive_electronics',
      'save_appliance_selection',
      'reset_appliance_selection',
      'archive_appliance',
      'unarchive_appliance'
  )
order by p.proname;

select
    policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'electronics'
order by policyname;

select
    id,
    name,
    public
from storage.buckets
where id in ('electronics-images', 'appliance-images')
order by id;


commit;
