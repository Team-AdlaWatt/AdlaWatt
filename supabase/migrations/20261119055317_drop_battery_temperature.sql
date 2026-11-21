alter table public.monitoring
  drop constraint if exists monitoring_temperature_status_check;

alter table public.monitoring
  add constraint monitoring_temperature_status_check
  check (
    (
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
  );

alter table public.monitoring
  drop column if exists "DS18B20 1 Battery Temp",
  drop column if exists "DS18B20 1 Battery Temp Status";

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

  alter table public.monitoring_history
    drop column if exists battery_temperature,
    drop column if exists battery_temperature_status;

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
