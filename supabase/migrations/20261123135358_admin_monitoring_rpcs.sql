create or replace function public.get_admin_fleet_overview()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with windowed as (
    select
      user_id,
      recorded_at,
      battery_level,
      device_status,
      current_load,
      energy_input_wh,
      energy_output_wh
    from public.monitoring_history
    where recorded_at >= now() - interval '24 hours'
  ),
  latest_per_user as (
    select distinct on (user_id)
      user_id,
      battery_level,
      device_status,
      recorded_at
    from windowed
    order by user_id, recorded_at desc
  )
  select case
    when exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
    then jsonb_build_object(
      'device_count', (select count(distinct user_id) from windowed),
      'online_count', (select count(*) from latest_per_user where device_status = 'Online'),
      'avg_battery', (select round(avg(battery_level)::numeric, 1) from latest_per_user where battery_level is not null),
      'low_battery_count', (select count(*) from latest_per_user where battery_level is not null and battery_level < 20),
      'solar_wh_24h', (select round(coalesce(sum(energy_input_wh), 0)::numeric, 1) from windowed),
      'load_w_avg', (select round(avg(current_load)::numeric, 1) from windowed where current_load is not null),
      'load_wh_24h', (select round(coalesce(sum(energy_output_wh), 0)::numeric, 1) from windowed),
      'last_updated', (select max(recorded_at) from windowed)
    )
    else null::jsonb
  end;
$$;

create or replace function public.get_admin_fleet_history(p_hours integer default 24)
returns table (
  bucket_start timestamptz,
  avg_battery numeric,
  solar_wh numeric,
  avg_load_w numeric,
  load_wh numeric,
  sample_count bigint
)
language sql
security definer
set search_path = ''
as $$
  with bounds as (
    select
      least(greatest(coalesce(p_hours, 24), 1), 720) as hours,
      case
        when coalesce(p_hours, 24) <= 24 then interval '1 hour'
        when coalesce(p_hours, 24) <= 168 then interval '6 hours'
        else interval '1 day'
      end as bucket_size
  ),
  filtered as (
    select
      date_bin(b.bucket_size, m.recorded_at, date_trunc('day', now())) as bucket_start,
      m.user_id,
      m.battery_level,
      m.energy_input_wh,
      m.current_load,
      m.energy_output_wh
    from public.monitoring_history m
    cross join bounds b
    where exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
      and m.recorded_at >= now() - make_interval(hours => b.hours)
  ),
  series as (
    select generate_series(
      date_bin(b.bucket_size, now() - make_interval(hours => b.hours), date_trunc('day', now())),
      date_bin(b.bucket_size, now(), date_trunc('day', now())),
      b.bucket_size
    ) as bucket_start
    from bounds b
  )
  select
    s.bucket_start,
    coalesce(round(avg(f.battery_level)::numeric, 1), 0) as avg_battery,
    coalesce(round(sum(f.energy_input_wh)::numeric, 1), 0) as solar_wh,
    coalesce(round(avg(f.current_load)::numeric, 1), 0) as avg_load_w,
    coalesce(round(sum(f.energy_output_wh)::numeric, 1), 0) as load_wh,
    count(f.user_id) as sample_count
  from series s
  left join filtered f on f.bucket_start = s.bucket_start
  where exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
  group by s.bucket_start
  order by s.bucket_start;
$$;

revoke all on function public.get_admin_fleet_overview() from public, anon, authenticated;
grant execute on function public.get_admin_fleet_overview() to authenticated;

revoke all on function public.get_admin_fleet_history(integer) from public, anon, authenticated;
grant execute on function public.get_admin_fleet_history(integer) to authenticated;
