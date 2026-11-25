# Battery temperature cleanup

```sql
begin;

do $$
declare
  constraint_name text;
begin
  if to_regclass('public.monitoring') is null then
    return;
  end if;

  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'monitoring'
      and con.conkey is not null
      and exists (
        select 1
        from pg_attribute att
        where att.attrelid = con.conrelid
          and att.attnum = any (con.conkey)
          and att.attname in (
            'DS18B20 1 Battery Temp',
            'DS18B20 1 Battery Temp Status',
            'battery_temperature',
            'battery_temperature_status'
          )
      )
  loop
    execute format('alter table public.monitoring drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.monitoring
  drop column if exists "DS18B20 1 Battery Temp",
  drop column if exists "DS18B20 1 Battery Temp Status",
  drop column if exists battery_temperature,
  drop column if exists battery_temperature_status;

do $$
declare
  clauses text[] := '{}';
  solar_column text;
  interior_column text;
begin
  if to_regclass('public.monitoring') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring'
      and column_name = 'solar_temperature_status'
  ) then
    solar_column := 'solar_temperature_status';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring'
      and column_name = 'DS18B20 2 Solar Temp Status'
  ) then
    solar_column := '"DS18B20 2 Solar Temp Status"';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring'
      and column_name = 'interior_temp_status'
  ) then
    interior_column := 'interior_temp_status';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring'
      and column_name = 'DHT22 Interior Temp Status'
  ) then
    interior_column := '"DHT22 Interior Temp Status"';
  end if;

  if solar_column is not null then
    clauses := clauses || format(
      '(%1$s is null or %1$s in (''Nominal'', ''Elevated'', ''High'', ''Critical'', ''Critical (rapid rise)'', ''Critical (sensor fault)''))',
      solar_column
    );
  end if;

  if interior_column is not null then
    clauses := clauses || format(
      '(%1$s is null or %1$s in (''Nominal'', ''Elevated'', ''High'', ''Critical'', ''Critical (rapid rise)'', ''Critical (sensor fault)''))',
      interior_column
    );
  end if;

  if array_length(clauses, 1) > 0
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.monitoring'::regclass
         and conname = 'monitoring_temperature_status_check'
     ) then
    execute format(
      'alter table public.monitoring add constraint monitoring_temperature_status_check check (%s) not valid',
      array_to_string(clauses, ' and ')
    );
  end if;
end $$;

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
      and con.conkey is not null
      and exists (
        select 1
        from pg_attribute att
        where att.attrelid = con.conrelid
          and att.attnum = any (con.conkey)
          and att.attname in (
            'DS18B20 1 Battery Temp',
            'DS18B20 1 Battery Temp Status',
            'battery_temperature',
            'battery_temperature_status'
          )
      )
  loop
    execute format('alter table public.monitoring_history drop constraint %I', constraint_name);
  end loop;
end $$;

alter table if exists public.monitoring_history
  drop column if exists "DS18B20 1 Battery Temp",
  drop column if exists "DS18B20 1 Battery Temp Status",
  drop column if exists battery_temperature,
  drop column if exists battery_temperature_status;

do $$
declare
  solar_column text;
  interior_column text;
begin
  if to_regclass('public.monitoring_history') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'solar_temperature_status'
  ) then
    solar_column := 'solar_temperature_status';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'DS18B20 2 Solar Temp Status'
  ) then
    solar_column := '"DS18B20 2 Solar Temp Status"';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'interior_temp_status'
  ) then
    interior_column := 'interior_temp_status';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring_history'
      and column_name = 'DHT22 Interior Temp Status'
  ) then
    interior_column := '"DHT22 Interior Temp Status"';
  end if;

  if solar_column is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.monitoring_history'::regclass
         and conname = 'monitoring_history_solar_temperature_status_check'
     ) then
    execute format(
      'alter table public.monitoring_history add constraint monitoring_history_solar_temperature_status_check check (%1$s is null or %1$s in (''Nominal'', ''Elevated'', ''High'', ''Critical'', ''Critical (rapid rise)'', ''Critical (sensor fault)'')) not valid',
      solar_column
    );
  end if;

  if interior_column is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.monitoring_history'::regclass
         and conname = 'monitoring_history_interior_temp_status_check'
     ) then
    execute format(
      'alter table public.monitoring_history add constraint monitoring_history_interior_temp_status_check check (%1$s is null or %1$s in (''Nominal'', ''Elevated'', ''High'', ''Critical'', ''Critical (rapid rise)'', ''Critical (sensor fault)'')) not valid',
      interior_column
    );
  end if;
end $$;

commit;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('monitoring', 'monitoring_history')
  and column_name in (
    'DS18B20 1 Battery Temp',
    'DS18B20 1 Battery Temp Status',
    'battery_temperature',
    'battery_temperature_status'
  )
order by table_name, column_name;

select rel.relname as table_name, con.conname as constraint_name, att.attname as column_name
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
cross join lateral unnest(con.conkey) as k(attnum)
join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
where ns.nspname = 'public'
  and rel.relname in ('monitoring', 'monitoring_history')
  and att.attname in (
    'DS18B20 1 Battery Temp',
    'DS18B20 1 Battery Temp Status',
    'battery_temperature',
    'battery_temperature_status'
  )
order by table_name, constraint_name, column_name;
```
