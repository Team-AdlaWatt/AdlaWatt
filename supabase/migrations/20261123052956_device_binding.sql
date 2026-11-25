begin;

create table if not exists public.devices (
  device_id text primary key,
  monitor_id bigint unique,
  owner_id uuid references auth.users(id),
  status text not null check (
    status in ('binding', 'active', 'release_pending', 'released')
  ),
  key_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists devices_active_monitor_id_key
  on public.devices (monitor_id) where status <> 'released';

create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.devices(device_id) on delete cascade,
  action text not null check (action = 'release'),
  payload jsonb not null,
  nonce text not null,
  expires_at timestamptz not null,
  acked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.device_secrets (
  key_id text primary key,
  device_id text not null,
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists device_secrets_active_device_id_key
  on public.device_secrets (device_id) where active;

create table if not exists public.device_command_nonces (
  nonce text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists devices_owner_id_idx
  on public.devices (owner_id);

create index if not exists device_commands_device_id_acked_at_expires_at_idx
  on public.device_commands (device_id, acked_at, expires_at);

alter table public.devices enable row level security;
alter table public.device_commands enable row level security;
alter table public.device_secrets enable row level security;
alter table public.device_command_nonces enable row level security;

revoke all on table public.devices from anon, authenticated;
revoke all on table public.device_commands from anon, authenticated;
revoke all on table public.device_secrets from anon, authenticated;
revoke all on table public.device_command_nonces from anon, authenticated;

grant select on table public.devices to authenticated;

grant all on table public.devices to service_role;
grant all on table public.device_commands to service_role;
grant all on table public.device_secrets to service_role;
grant all on table public.device_command_nonces to service_role;

drop policy if exists "Users can view own devices" on public.devices;

create policy "Users can view own devices"
  on public.devices
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'devices',
    'device_commands',
    'device_secrets',
    'device_command_nonces'
  ] loop
    if to_regclass('public.' || v_table) is null then
      raise exception 'public.% does not exist', v_table;
    end if;

    if not exists (
      select 1
      from pg_class c
      where c.oid = ('public.' || v_table)::regclass
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', v_table;
    end if;

    if not has_table_privilege('service_role', 'public.' || v_table, 'SELECT')
      or not has_table_privilege('service_role', 'public.' || v_table, 'INSERT')
      or not has_table_privilege('service_role', 'public.' || v_table, 'UPDATE')
      or not has_table_privilege('service_role', 'public.' || v_table, 'DELETE')
    then
      raise exception 'service_role privileges are missing on public.%', v_table;
    end if;

    if has_table_privilege('anon', 'public.' || v_table, 'SELECT')
      or has_table_privilege('anon', 'public.' || v_table, 'INSERT')
      or has_table_privilege('anon', 'public.' || v_table, 'UPDATE')
      or has_table_privilege('anon', 'public.' || v_table, 'DELETE')
    then
      raise exception 'anon privileges are present on public.%', v_table;
    end if;

    if has_table_privilege('authenticated', 'public.' || v_table, 'INSERT')
      or has_table_privilege('authenticated', 'public.' || v_table, 'UPDATE')
      or has_table_privilege('authenticated', 'public.' || v_table, 'DELETE')
    then
      raise exception 'authenticated write privileges are present on public.%', v_table;
    end if;

    if v_table <> 'devices'
      and has_table_privilege('authenticated', 'public.' || v_table, 'SELECT')
    then
      raise exception 'authenticated SELECT privilege is present on public.%', v_table;
    end if;
  end loop;

  if not has_table_privilege('authenticated', 'public.devices', 'SELECT') then
    raise exception 'authenticated SELECT privilege is missing on public.devices';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'devices'
      and policyname = 'Users can view own devices'
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
      and polqual is not null
  ) then
    raise exception 'Select RLS policy was not created on public.devices';
  end if;
end $$;

commit;
