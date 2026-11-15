-- ============================================================
-- Monitoring access by monitor_id
-- ============================================================
--
-- Keeps one monitoring row per account, but makes monitor_id
-- the key used by the app and firmware. user_id remains the
-- account mapping and is still maintained by the signup
-- triggers.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Add monitor_id to each account profile.
-- ------------------------------------------------------------
alter table public.users
  add column if not exists monitor_id bigint;

update public.users u
set monitor_id = m.monitor_id
from public.monitoring m
where m.user_id = u.id
  and u.monitor_id is distinct from m.monitor_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_monitor_id_fkey'
  ) then
    alter table public.users
      add constraint users_monitor_id_fkey
      foreign key (monitor_id)
      references public.monitoring (monitor_id)
      on delete set null;
  end if;
end $$;

create unique index if not exists users_monitor_id_key
  on public.users (monitor_id)
  where monitor_id is not null;

-- ------------------------------------------------------------
-- 2. Keep monitor_id populated for future accounts.
-- ------------------------------------------------------------
create or replace function public.handle_new_user_monitoring()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  insert into public.monitoring (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  update public.users
  set monitor_id = (
    select m.monitor_id
    from public.monitoring m
    where m.user_id = new.id
  )
  where id = new.id;

  return new;
exception
  when others then
    raise warning 'handle_new_user_monitoring failed for %: %',
      new.id, sqlerrm;
    return new;
end;
$function$;

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

  update public.users
  set monitor_id = (
    select m.monitor_id
    from public.monitoring m
    where m.user_id = new.id
  )
  where id = new.id;

  return new;
exception
  when others then
    raise warning 'ensure_monitoring_row_for_user failed for %: %',
      new.id, sqlerrm;
    return new;
end;
$function$;

revoke all on function public.ensure_monitoring_row_for_user()
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. RLS: authenticated access follows monitor_id.
-- ------------------------------------------------------------
drop policy if exists "Users can view own monitoring"
  on public.monitoring;

drop policy if exists "Users can update own monitoring"
  on public.monitoring;

create policy "Users can view own monitoring"
  on public.monitoring
  for select
  to authenticated
  using (
    monitor_id = (
      select u.monitor_id
      from public.users u
      where u.id = auth.uid()
    )
  );

create policy "Users can update own monitoring"
  on public.monitoring
  for update
  to authenticated
  using (
    monitor_id = (
      select u.monitor_id
      from public.users u
      where u.id = auth.uid()
    )
  )
  with check (
    monitor_id = (
      select u.monitor_id
      from public.users u
      where u.id = auth.uid()
    )
  );

commit;
