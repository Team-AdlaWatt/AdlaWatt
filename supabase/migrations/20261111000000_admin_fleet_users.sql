-- Admin fleet users: pseudonymized per-household aggregates.
--
-- Context: the admin Users tab lists each household under a
-- sequential pseudonym (Household 01, 02, ...). Same privacy
-- contract as get_admin_fleet_health() (see
-- 20261010000000_admin_fleet_health.sql): SECURITY DEFINER runs
-- server-side, verifies the caller is role='admin', and never
-- returns user_ids, emails, or usernames. Pseudonyms are assigned
-- by first-seen order within the 24h window (min(recorded_at)),
-- so labels may renumber between windows; group-by keys never
-- leave the server.

create or replace function public.get_admin_fleet_users()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_is_admin boolean;
begin
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ) into v_is_admin;

  if not coalesce(v_is_admin, false) then
    raise exception 'admin only';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'pseudonym', 'Household ' || to_char(
            row_number() over (
              order by min(recorded_at), user_id
            ),
            'FM00'
          ),
          'is_online', count(*) filter (
            where device_status = 'Online'
              and recorded_at >= now() - interval '10 minutes'
          ) > 0,
          'avg_battery', round(avg(battery_level)::numeric, 1),
          'avg_voltage', round(avg(voltage)::numeric, 2),
          'solar_wh_24h', coalesce(sum(energy_input_wh), 0),
          'low_battery_count', count(*) filter (
            where battery_level < 20
          ),
          'last_updated', max(recorded_at)
        )
        order by min(recorded_at), user_id
      )
      from public.monitoring_history
      where recorded_at >= now() - interval '24 hours'
      group by user_id
    ),
    '[]'::jsonb
  );
end;
$function$;

revoke all on function public.get_admin_fleet_users() from public;
grant execute on function public.get_admin_fleet_users() to authenticated;
