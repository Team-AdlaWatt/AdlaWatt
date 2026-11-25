begin;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.monitoring'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%Charging%'
      and pg_get_constraintdef(c.oid) ilike '%Discharging%'
      and pg_get_constraintdef(c.oid) ilike '%Idle%'
  loop
    execute format(
      'alter table public.monitoring drop constraint %I',
      v_constraint.conname
    );
  end loop;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring'
      and column_name = 'battery_status'
  ) then
    alter table public.monitoring
      add constraint monitoring_battery_status_check
      check (
        battery_status is null
        or battery_status in (
          'Charging',
          'Discharging',
          'Cycle',
          'Idle',
          'Reading Error'
        )
      ) not valid;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'monitoring'
      and column_name = 'INA219 Load Battery status'
  ) then
    alter table public.monitoring
      add constraint monitoring_ina219_load_battery_status_check
      check (
        "INA219 Load Battery status" is null
        or "INA219 Load Battery status" in (
          'Charging',
          'Discharging',
          'Cycle',
          'Idle',
          'Reading Error'
        )
      ) not valid;
  end if;
end $$;

commit;
