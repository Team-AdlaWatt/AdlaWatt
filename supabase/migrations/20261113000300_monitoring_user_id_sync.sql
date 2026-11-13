-- ============================================================
-- Monitoring user_id / monitor_id sync (backfill + trigger)
-- ============================================================
--
-- Problem: public.users is empty, so getMonitorIdForUser() returns
-- null for every account and the dashboard monitoring fetch never
-- runs. Data IS in public.monitoring; the identity bridge is missing.
--
-- This migration:
--   1. Backfills public.users from auth.users for every account
--      that lacks a profile row.
--   2. Sets users.monitor_id from the matching monitoring row.
--   3. Creates a trigger on public.monitoring (AFTER INSERT OR
--      UPDATE) that keeps users.monitor_id in sync going forward,
--      covering every existing and future monitor_id.
--
-- Safe to run more than once.

begin;

-- ------------------------------------------------------------
-- 1. Preconditions
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.users') is null then
    raise exception 'public.users does not exist';
  end if;

  if to_regclass('public.monitoring') is null then
    raise exception 'public.monitoring does not exist';
  end if;

  if to_regclass('auth.users') is null then
    raise exception 'auth.users does not exist';
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Backfill: create public.users rows for auth.users accounts
--    that have no profile yet.
-- ------------------------------------------------------------
insert into public.users (id, username, email, terms_agreed, role, created_at)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'username',
           split_part(lower(au.email), '@', 1),
           'user_' || substr(au.id::text, 1, 8)),
  lower(au.email),
  true,
  'authenticated',
  au.created_at
from auth.users au
left join public.users u on u.id = au.id
where u.id is null
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. Backfill: set users.monitor_id from the matching monitoring
--    row. Creates a monitoring row first if the account has none.
-- ------------------------------------------------------------
insert into public.monitoring (user_id, device_status)
select u.id, 'Offline'
from public.users u
left join public.monitoring m on m.user_id = u.id
where m.user_id is null
on conflict (user_id) do nothing;

update public.users u
set monitor_id = m.monitor_id
from public.monitoring m
where m.user_id = u.id
  and u.monitor_id is distinct from m.monitor_id;

-- ------------------------------------------------------------
-- 4. Trigger: keep users.monitor_id in sync when monitoring rows
--    are inserted or updated (covers firmware PATCHes by monitor_id
--    and any future monitor_id assignments).
-- ------------------------------------------------------------
create or replace function public.sync_users_monitor_id_from_monitoring()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.users
  set monitor_id = new.monitor_id
  where id = new.user_id
    and monitor_id is distinct from new.monitor_id;

  return new;
exception
  when others then
    -- Never block monitoring writes if the profile sync fails.
    raise warning 'sync_users_monitor_id_from_monitoring failed for %: %',
      new.user_id, sqlerrm;
    return new;
end;
$function$;

revoke all on function public.sync_users_monitor_id_from_monitoring()
  from public, anon, authenticated;

drop trigger if exists on_monitoring_sync_users_monitor_id
  on public.monitoring;

create trigger on_monitoring_sync_users_monitor_id
after insert or update of monitor_id, user_id
on public.monitoring
for each row execute function public.sync_users_monitor_id_from_monitoring();

-- ------------------------------------------------------------
-- 5. In-transaction checks. Any failure rolls everything back.
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from auth.users au
    left join public.users u on u.id = au.id
    where u.id is null
  ) then
    raise exception
      'Backfill incomplete: some auth.accounts have no public.users profile';
  end if;

  if exists (
    select 1
    from public.users u
    left join public.monitoring m on m.user_id = u.id
    where m.user_id is null
  ) then
    raise exception
      'Backfill incomplete: some accounts still have no monitoring row';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.monitoring'::regclass
      and tgname = 'on_monitoring_sync_users_monitor_id'
      and not tgisinternal
  ) then
    raise exception
      'Monitoring -> users sync trigger was not created';
  end if;
end $$;

commit;
