-- ============================================================
-- One monitoring row per account
-- ============================================================
--
-- The live table already has the 25 columns, the unique
-- monitoring_user_id_key index, nullable user_id, the value
-- checks, RLS policies, and Realtime. This migration only:
--
--   1. keeps the monitor_id identity sequence at/above max
--   2. backfills one Offline row for existing accounts
--   3. creates that row automatically for future accounts
--
-- Safe to run more than once. Existing rows and sensor values
-- are not changed. The trigger lives on public.users (not
-- auth.users) so the monitoring.user_id FK is already valid.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Preconditions
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.monitoring') is null then
    raise exception 'public.monitoring does not exist';
  end if;

  if to_regclass('public.users') is null then
    raise exception 'public.users does not exist';
  end if;

  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'monitoring_user_id_key'
      and i.indisunique
  ) then
    raise exception
      'Missing unique index monitoring_user_id_key on public.monitoring(user_id)';
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Keep monitor_id sequence at or above the current max.
-- Never moves the sequence backward.
-- ------------------------------------------------------------
do $$
declare
  seq_name text := pg_get_serial_sequence('public.monitoring', 'monitor_id');
  max_id bigint;
  seq_last bigint;
begin
  if seq_name is null then
    raise exception 'monitor_id sequence not found';
  end if;

  select coalesce(max(monitor_id), 0)
  into max_id
  from public.monitoring;

  execute format('select last_value from %s', seq_name)
  into seq_last;

  if max_id > seq_last then
    perform setval(seq_name::regclass, max_id, true);
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. Backfill: one Offline row for every existing account
--    that does not already have one.
-- ------------------------------------------------------------
insert into public.monitoring (user_id, device_status)
select u.id, 'Offline'
from public.users u
left join public.monitoring m on m.user_id = u.id
where m.user_id is null
on conflict (user_id) do nothing;

-- ------------------------------------------------------------
-- 4. Auto-create the row for future accounts.
-- ------------------------------------------------------------
create or replace function public.ensure_monitoring_row_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.monitoring (user_id, device_status)
  values (new.id, 'Offline')
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    -- Never block signup/profile creation if provisioning fails.
    raise warning 'ensure_monitoring_row_for_user failed for %: %',
      new.id, sqlerrm;
    return new;
end;
$function$;

revoke all on function public.ensure_monitoring_row_for_user()
  from public, anon, authenticated;

drop trigger if exists on_user_created_ensure_monitoring
  on public.users;

create trigger on_user_created_ensure_monitoring
after insert on public.users
for each row execute function public.ensure_monitoring_row_for_user();

-- ------------------------------------------------------------
-- 5. In-transaction checks. Any failure rolls everything back.
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.users u
    left join public.monitoring m on m.user_id = u.id
    where m.user_id is null
  ) then
    raise exception
      'Backfill incomplete: some accounts still have no monitoring row';
  end if;

  if exists (
    select 1
    from public.monitoring
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise exception
      'Duplicate monitoring rows exist for an account';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.users'::regclass
      and tgname = 'on_user_created_ensure_monitoring'
      and not tgisinternal
  ) then
    raise exception
      'Monitoring signup trigger was not created';
  end if;
end $$;

commit;
