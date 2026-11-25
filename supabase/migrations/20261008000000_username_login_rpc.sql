-- Username login lookup for loginUser().
--
-- Context: src/services/auth.ts calls
--   supabase.rpc("get_email_by_username", { lookup_username: identifier })
-- but no migration defined this function, so every username login
-- (including the dev test admin `admin`) failed with
-- invalidCredentials. Email login kept working, which is why this
-- went unnoticed.
--
-- Design: SECURITY DEFINER lookup returning only the email (no ids,
-- no roles). Case-insensitive on trimmed input. Returns NULL when
-- not found so the caller maps miss + error to the same generic
-- message (see auth.ts anti-enumeration contract). Callable by anon
-- (login screen has no session yet) and authenticated.

create or replace function public.get_email_by_username(lookup_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_email text;
begin
  if lookup_username is null or trim(lookup_username) = '' then
    return null;
  end if;

  select u.email into v_email
  from public.users as u
  where lower(u.username) = lower(trim(lookup_username))
  limit 1;

  return v_email;
end;
$function$;

revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated;
