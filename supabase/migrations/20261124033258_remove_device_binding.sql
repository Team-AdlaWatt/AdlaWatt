begin;

do $$
begin
  if to_regclass('public.devices') is not null then
    drop policy if exists "Users can view own devices" on public.devices;
  end if;
end $$;

drop table if exists public.device_commands;
drop table if exists public.device_secrets;
drop table if exists public.device_command_nonces;
drop table if exists public.devices;

commit;
