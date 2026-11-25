begin;

set local lock_timeout = '5s';

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_username text;
  v_base text;
  v_email text;
  v_terms boolean;
begin
  v_email := lower(trim(NEW.email));

  v_base := lower(trim(coalesce(NEW.raw_user_meta_data ->> 'username', '')));
  if v_base is null or v_base = '' then
    v_base := split_part(v_email, '@', 1);
  end if;

  if v_base !~ '^[a-zA-Z0-9_]+$' then
    v_base := 'user_' || substr(NEW.id::text, 1, 8);
  end if;
  if char_length(v_base) < 3 then
    v_base := v_base || '_' || substr(NEW.id::text, 1, 8);
  end if;
  if char_length(v_base) > 30 then
    v_base := substr(v_base, 1, 30);
  end if;

  v_username := v_base;
  if exists (select 1 from public.users where username = v_username) then
    v_username := substr(v_base, 1, 21) || '_' || substr(NEW.id::text, 1, 8);
  end if;

  begin
    v_terms := coalesce((NEW.raw_user_meta_data ->> 'terms_agreed')::boolean, true);
  exception when others then
    v_terms := true;
  end;
  if v_terms is not true then
    v_terms := true;
  end if;

  begin
    insert into public.users (id, username, email, terms_agreed)
    values (NEW.id, v_username, v_email, v_terms)
    on conflict (id) do update set
      username = excluded.username,
      email = excluded.email,
      terms_agreed = excluded.terms_agreed;
  exception when unique_violation then
    v_username := substr(v_base, 1, 21) || '_' || substr(NEW.id::text, 1, 8);
    begin
      insert into public.users (id, username, email, terms_agreed)
      values (NEW.id, v_username, v_email, v_terms)
      on conflict (id) do update set
        username = excluded.username,
        email = excluded.email,
        terms_agreed = excluded.terms_agreed;
    exception when others then
      raise warning 'handle_new_auth_user_profile retry failed for %: %', NEW.id, SQLERRM;
    end;
  end;

  return NEW;
exception when others then
  raise warning 'handle_new_auth_user_profile outer failed for %: %', NEW.id, SQLERRM;
  return NEW;
end;
$function$;

revoke execute on function public.handle_new_auth_user_profile()
  from anon, authenticated, public;

drop trigger if exists on_user_created_assign_tft_pin on public.users;

drop function if exists public.assign_new_user_tft_pin();
drop function if exists public.generate_tft_pin();
drop function if exists public.verify_tft_pin(bigint, text);

alter table public.users drop column if exists tft_pin cascade;

update auth.users
set raw_user_meta_data = raw_user_meta_data - 'tft_pin'
where raw_user_meta_data ? 'tft_pin';

commit;
