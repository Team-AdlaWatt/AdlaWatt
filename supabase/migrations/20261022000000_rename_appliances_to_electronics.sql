-- ============================================================
-- RENAME public.appliances -> public.electronics
-- ============================================================
-- The live table was renamed by hand on 2026-10-22:
--   public.appliances        -> public.electronics
--   appliance_name           -> electronics_name
--   appliances_pkey          -> electronics_pkey
--   appliances_user_catalog_key_uidx
--                              -> electronics_user_catalog_key_uidx
--   appliance_date_created_trigger
--                              -> electronics_date_created_trigger
--   set_appliance_date_created()
--                              -> set_electronics_date_created()
--
-- This file records that rename for fresh installs and repairs
-- the PL/pgSQL bodies. ALTER TABLE ... RENAME does NOT rewrite
-- function bodies, so archive_appliance, unarchive_appliance,
-- save_appliance_selection and reset_appliance_selection kept
-- pointing at public.appliances / appliance_name and started
-- failing against the renamed table.
--
-- The body repair re-runs each definition through
-- CREATE OR REPLACE, so the name, the signature, the
-- parameter names, the OID and the grants all survive.
-- Never drop these functions to rename them: PostgreSQL
-- refuses to rename a parameter on an existing function
-- (42P13) and dropping them would drop the grants.
--
-- Deliberately unchanged - this is the live contract the app
-- calls and it did not move with the table:
--   * RPC names: archive_appliance, unarchive_appliance,
--     save_appliance_selection, reset_appliance_selection
--   * the "appliance-images" storage bucket
--   * the "Appliance not found." raise text
-- ============================================================


-- ============================================================
-- 1. TABLE AND COLUMN
-- No-op on the live database, where this is already done.
-- ============================================================

do $$
begin

    if to_regclass('public.appliances') is not null
       and to_regclass('public.electronics') is null
    then
        execute 'alter table public.appliances rename to electronics';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'electronics'
          and column_name = 'appliance_name'
    )
    then
        execute 'alter table public.electronics '
             || 'rename column appliance_name to electronics_name';
    end if;

end $$;


-- ============================================================
-- 2. TRIGGER AND TRIGGER FUNCTION
-- The trigger keeps pointing at the same function OID, so
-- renaming the function is enough. The trigger is renamed
-- through its own table so this works on a fresh install too.
-- ============================================================

do $$
declare
    r record;
begin

    for r in
        select c.relname as table_name,
               t.tgname as trigger_name
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and not t.tgisinternal
          and t.tgname = 'appliance_date_created_trigger'
    loop
        execute format(
            'alter trigger %I on public.%I rename to electronics_date_created_trigger',
            r.trigger_name,
            r.table_name
        );
    end loop;

    for r in
        select p.proname as function_name,
               pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'set_appliance_date_created'
    loop
        execute format(
            'alter function public.%I(%s) rename to set_electronics_date_created',
            r.function_name,
            r.args
        );
    end loop;

end $$;


-- ============================================================
-- 3. FUNCTION BODIES
-- Rewrite public.appliances -> public.electronics and
-- appliance_name -> electronics_name inside the bodies of the
-- four RPCs the app calls.
-- ============================================================

do $$
declare
    r record;
    v_definition text;
    v_header text;
    v_body text;
    v_rewritten text;
    v_marker constant text := 'AS $function$';
begin

    for r in
        select p.proname as function_name,
               pg_get_functiondef(p.oid) as definition
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in (
              'archive_appliance',
              'unarchive_appliance',
              'save_appliance_selection',
              'reset_appliance_selection'
          )
    loop
        v_definition := r.definition;

        if position(v_marker in v_definition) = 0 then
            raise notice
                'skipping public.%: body is not a $function$ block',
                r.function_name;
            continue;
        end if;

        v_header := split_part(v_definition, v_marker, 1);
        v_body := split_part(v_definition, v_marker, 2);

        v_rewritten := v_body;
        v_rewritten := replace(v_rewritten, 'public.appliances', 'public.electronics');
        v_rewritten := replace(v_rewritten, 'appliance_name', 'electronics_name');
        v_rewritten := regexp_replace(
            v_rewritten, '\mappliances\M', 'electronics', 'g'
        );

        if v_rewritten = v_body then
            raise notice
                'public.% already targets public.electronics, left as is',
                r.function_name;
            continue;
        end if;

        execute v_header || v_marker || v_rewritten;

        raise notice 'replaced body of public.%', r.function_name;
    end loop;

end $$;


-- ============================================================
-- 4. VERIFY
-- Any function still mentioning the old table or column shows
-- up here and has to be handled by hand.
-- ============================================================

do $$
declare
    r record;
    v_stale integer := 0;
begin

    for r in
        select p.proname as function_name,
               pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and (
              pg_get_functiondef(p.oid) ilike '%appliances%'
              or pg_get_functiondef(p.oid) ilike '%appliance_name%'
          )
    loop
        v_stale := v_stale + 1;
        raise notice
            'still on the old table: public.%(%',
            r.function_name,
            r.args;
    end loop;

    if v_stale = 0 then
        raise notice 'no function is left on public.appliances';
    end if;

end $$;


-- ============================================================
-- 5. WHAT THE APP NOW SEES
-- ============================================================

select
    to_regclass('public.electronics') as table_name,
    (
        select string_agg(column_name, ', ' order by ordinal_position)
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'electronics'
    ) as columns;
