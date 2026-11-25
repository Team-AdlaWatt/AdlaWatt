-- Admin role for hidden role-gated dashboard.
--
-- Context: all app tables are RLS-scoped to user_id = auth.uid()
-- and public.users had no role column, so every login landed on
-- /dashboard. This adds users.role ('household' default, 'admin'
-- for the hidden dashboard) without touching existing RLS:
-- self-select policies keep working and now also expose role.
--
-- The signup trigger (handle_new_auth_user_profile) inserts only
-- (id, username, email, terms_agreed) and its ON CONFLICT clause
-- updates only those columns, so role defaults to 'household'
-- for new signups and is never reset by re-signup. Admin
-- elevation is owner-only via SQL (never from the app client).
--
-- Test account (create via app Register or Dashboard Auth, then
-- confirm email; this UPDATE is a harmless no-op until it exists):
--   email:    admin_test@adlawatt.test
--   username: admin
--   password: (set at creation, never stored here)

alter table public.users
add column if not exists role text not null default 'household';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_role_check'
  ) then
    alter table public.users
    add constraint users_role_check
    check (role in ('household', 'admin'));
  end if;
end
$$;

-- Elevate the designated test admin (no-op if not yet created).
update public.users
set role = 'admin'
where email = 'admin_test@adlawatt.test';
