-- ============================================================
-- Monitoring RLS: direct user_id policy (monitoring table only)
-- ============================================================
--
-- Problem: the existing select/update policies resolve access through
-- public.users.monitor_id, but public.users is empty, so the subquery
-- returns NULL and authenticated users can read NO monitoring rows.
--
-- Fix: base RLS directly on monitoring.user_id = auth.uid(). This does
-- not depend on the users table at all and covers every existing and
-- future monitor_id row owned by the signed-in account.
--
-- Safe to run more than once. Only touches public.monitoring policies.

begin;

-- ------------------------------------------------------------
-- 1. Preconditions
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.monitoring') is null then
    raise exception 'public.monitoring does not exist';
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. Enable RLS (idempotent)
-- ------------------------------------------------------------
alter table public.monitoring enable row level security;

-- ------------------------------------------------------------
-- 3. Replace users-dependent policies with direct user_id policies
-- ------------------------------------------------------------
drop policy if exists "Users can view own monitoring"
  on public.monitoring;

create policy "Users can view own monitoring"
  on public.monitoring
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can update own monitoring"
  on public.monitoring;

create policy "Users can update own monitoring"
  on public.monitoring
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. In-transaction checks
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring'
      and policyname = 'Users can view own monitoring'
  ) then
    raise exception 'Select RLS policy was not created';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'monitoring'
      and policyname = 'Users can update own monitoring'
  ) then
    raise exception 'Update RLS policy was not created';
  end if;
end $$;

commit;
