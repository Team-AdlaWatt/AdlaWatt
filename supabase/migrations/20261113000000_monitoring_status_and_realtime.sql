-- ============================================================
-- MONITORING: temperature status variants + Realtime
-- ============================================================
--
-- Matches the app contract in src/services/monitoringSchema.ts:
--
--   battery_temperature_status:
--     Nominal | Elevated | High | Critical |
--     Critical (sensor fault)
--
--   solar_temperature_status / interior_temp_status:
--     Nominal | Elevated | High | Critical |
--     Critical (rapid rise) | Critical (sensor fault)
--
-- Also makes user_id nullable (every monitoring column except
-- monitor_id is nullable) and adds the table to the default
-- Realtime publication so postgres_changes reaches the app.
--
-- RLS is intentionally untouched: the live project already has
-- the anon/authenticated policies the app depends on.
-- ============================================================

-- ------------------------------------------------------------
-- 1. user_id is nullable
-- ------------------------------------------------------------

alter table public.monitoring
  alter column user_id drop not null;

-- ------------------------------------------------------------
-- 2. Widen monitoring temperature status checks
-- ------------------------------------------------------------

alter table public.monitoring
  drop constraint if exists monitoring_temperature_status_check;

alter table public.monitoring
  add constraint monitoring_temperature_status_check
  check (
    (
      battery_temperature_status is null
      or battery_temperature_status in (
        'Nominal',
        'Elevated',
        'High',
        'Critical',
        'Critical (sensor fault)'
      )
    )
    and (
      solar_temperature_status is null
      or solar_temperature_status in (
        'Nominal',
        'Elevated',
        'High',
        'Critical',
        'Critical (rapid rise)',
        'Critical (sensor fault)'
      )
    )
    and (
      interior_temp_status is null
      or interior_temp_status in (
        'Nominal',
        'Elevated',
        'High',
        'Critical',
        'Critical (rapid rise)',
        'Critical (sensor fault)'
      )
    )
  ) not valid;

alter table public.monitoring
  validate constraint monitoring_temperature_status_check;

-- ------------------------------------------------------------
-- 3. Widen monitoring_history checks (snapshot destination)
-- ------------------------------------------------------------
--
-- monitoring_history is populated from monitoring by the
-- snapshot function, so a stale status CHECK there would reject
-- the new values. The table and its constraint names are not
-- owned by this repo, so drop any CHECK that touches the three
-- status columns, then add the widened constraints only for
-- columns that actually exist.

do $$
declare
  constraint_name text;
begin
  if to_regclass('public.monitoring_history') is null then
    return;
  end if;

  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'monitoring_history'
      and con.contype = 'c'
      and con.conkey is not null
      and exists (
        select 1
        from pg_attribute att
        where att.attrelid = con.conrelid
          and att.attnum = any (con.conkey)
          and att.attname in (
            'battery_temperature_status',
            'solar_temperature_status',
            'interior_temp_status'
          )
      )
  loop
    execute format(
      'alter table public.monitoring_history drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

do $$
begin
  if to_regclass('public.monitoring_history') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'battery_temperature_status'
  ) then
    alter table public.monitoring_history
      add constraint monitoring_history_battery_temperature_status_check
      check (
        battery_temperature_status is null
        or battery_temperature_status in (
          'Nominal',
          'Elevated',
          'High',
          'Critical',
          'Critical (sensor fault)'
        )
      );
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'solar_temperature_status'
  ) then
    alter table public.monitoring_history
      add constraint monitoring_history_solar_temperature_status_check
      check (
        solar_temperature_status is null
        or solar_temperature_status in (
          'Nominal',
          'Elevated',
          'High',
          'Critical',
          'Critical (rapid rise)',
          'Critical (sensor fault)'
        )
      );
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'interior_temp_status'
  ) then
    alter table public.monitoring_history
      add constraint monitoring_history_interior_temp_status_check
      check (
        interior_temp_status is null
        or interior_temp_status in (
          'Nominal',
          'Elevated',
          'High',
          'Critical',
          'Critical (rapid rise)',
          'Critical (sensor fault)'
        )
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- 4. Realtime publication
-- ------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'monitoring'
  ) then
    alter publication supabase_realtime
      add table public.monitoring;
  end if;
end $$;
