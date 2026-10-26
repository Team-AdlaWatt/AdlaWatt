-- ============================================================
-- DROP LEGACY "appliance" COMPATIBILITY LAYER
-- ============================================================
-- The electronics rename OTA has been verified on-device.
-- The app no longer calls the old RPC names or reads the old
-- storage bucket, so this migration removes only the temporary
-- compatibility layer.
--
-- Storage objects must be removed through the Storage API
-- before this migration runs. The guard below aborts the whole
-- transaction if the old bucket still has objects, so no
-- partial cleanup can happen.
-- ============================================================

begin;


-- ============================================================
-- 1. DROP OLD RPC WRAPPERS
-- ============================================================

drop function if exists public.save_appliance_selection(
    jsonb,
    uuid[]
);

drop function if exists public.reset_appliance_selection();

drop function if exists public.archive_appliance(uuid);

drop function if exists public.unarchive_appliance(uuid);


-- ============================================================
-- 2. DROP OLD STORAGE POLICIES
-- ============================================================

drop policy if exists "Public read appliance images"
on storage.objects;

drop policy if exists "Users upload own appliance images"
on storage.objects;

drop policy if exists "Users update own appliance images"
on storage.objects;

drop policy if exists "Users delete own appliance images"
on storage.objects;


-- ============================================================
-- 3. VERIFY OLD BUCKET IS EMPTY
-- ============================================================
-- Supabase blocks direct deletes from storage tables. The
-- bucket itself is removed through the Storage API immediately
-- after this migration. This guard ensures no objects are
-- orphaned when the old policies are dropped.

do $$
begin

    if exists (
        select 1
        from storage.objects
        where bucket_id = 'appliance-images'
    ) then

        raise exception
            'appliance-images still contains objects. Remove them with the Storage API before applying this migration.';

    end if;

end $$;


-- ============================================================
-- 4. VERIFY
-- ============================================================

select
    p.proname,
    pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.proname in (
      'save_appliance_selection',
      'reset_appliance_selection',
      'archive_appliance',
      'unarchive_appliance'
  )
order by p.proname;


select
    id,
    name
from storage.buckets
where id = 'appliance-images';


select
    policyname
from pg_policies
where schemaname = 'storage'
  and policyname ilike '%appliance images%'
order by policyname;


commit;
