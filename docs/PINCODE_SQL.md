# PINCODE SQL

Assumption: the TFT display needs to show the PIN, so `public.users.tft_pin` stores it as plain `text`.

Run the introspection query first. Its output contains sensitive user data.

## 1. Inspect `public.users`

```sql
select jsonb_pretty(jsonb_build_object(
  'columns', (
    select jsonb_agg(jsonb_build_object(
      'name', column_name,
      'type', data_type,
      'nullable', is_nullable,
      'default', column_default
    ) order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
  ),
  'constraints', (
    select jsonb_agg(jsonb_build_object(
      'name', conname,
      'type', contype,
      'definition', pg_get_constraintdef(oid)
    ))
    from pg_constraint
    where conrelid = 'public.users'::regclass
  ),
  'triggers', (
    select jsonb_agg(jsonb_build_object(
      'name', tgname,
      'enabled', tgenabled,
      'definition', pg_get_triggerdef(oid)
    ))
    from pg_trigger
    where tgrelid = 'public.users'::regclass and not tgisinternal
  ),
  'trigger_functions', (
    select jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'code', pg_get_functiondef(p.oid)
    ))
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'public.users'::regclass and not tgisinternal
  ),
  'indexes', (
    select jsonb_agg(jsonb_build_object(
      'name', indexname,
      'definition', indexdef
    ))
    from pg_indexes
    where schemaname = 'public' and tablename = 'users'
  ),
  'rls_enabled', (
    select relrowsecurity
    from pg_class
    where oid = 'public.users'::regclass
  ),
  'policies', (
    select jsonb_agg(jsonb_build_object(
      'name', policyname,
      'command', cmd,
      'roles', roles,
      'using', qual,
      'with_check', with_check
    ))
    from pg_policies
    where schemaname = 'public' and tablename = 'users'
  ),
  'realtime_enabled', (
    select exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'users'
    )
  ),
  'row_count', (
    select count(*) from public.users
  ),
  'all_rows', (
    select jsonb_agg(to_jsonb(u) order by u.id)
    from public.users u
  )
)) as users_full_info;
```

## 2. Migration

Create with `supabase migration new add_users_tft_pin`, then paste:

```sql
begin;

set local lock_timeout = '5s';

alter table public.users
  add column if not exists tft_pin text;

create or replace function public.generate_tft_pin()
returns text
language plpgsql
set search_path = ''
as $function$
declare
  v_seed text;
  v_num bigint;
  v_pin text;
  v_attempt integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('adlawatt_tft_pin_allocation')::bigint
  );

  loop
    v_attempt := v_attempt + 1;

    begin
      execute 'select encode(extensions.gen_random_bytes(8), ''hex'')'
        into v_seed;
    exception when others then
      v_seed := md5(
        clock_timestamp()::text
        || random()::text
        || txid_current()::text
        || v_attempt::text
      );
    end;

    v_num := ('x' || substr(v_seed, 1, 8))::bit(32)::bigint;

    v_pin := lpad(
      floor(
        (v_num::numeric / 4294967296::numeric) * 10000::numeric
      )::integer::text,
      4,
      '0'
    );

    if v_pin not in (
      '0000','1111','2222','3333','4444',
      '5555','6666','7777','8888','9999',
      '0123','1234','2345','3456','4567','5678','6789',
      '3210','4321','5432','6543','7654','8765','9876'
    )
    and not exists (
      select 1
      from public.users
      where tft_pin = v_pin
    ) then
      return v_pin;
    end if;

    if v_attempt >= 1000 then
      raise exception 'Unable to allocate a unique TFT PIN';
    end if;
  end loop;
end;
$function$;

update public.users
set tft_pin = public.generate_tft_pin()
where tft_pin is null;

alter table public.users
  alter column tft_pin set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_tft_pin_format_check'
  ) then
    alter table public.users
      add constraint users_tft_pin_format_check
      check (tft_pin ~ '^[0-9]{4}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_tft_pin_not_weak_check'
  ) then
    alter table public.users
      add constraint users_tft_pin_not_weak_check
      check (
        tft_pin not in (
          '0000','1111','2222','3333','4444',
          '5555','6666','7777','8888','9999',
          '0123','1234','2345','3456','4567','5678','6789',
          '3210','4321','5432','6543','7654','8765','9876'
        )
      );
  end if;
end
$$;

create unique index if not exists users_tft_pin_key
  on public.users (tft_pin);

create or replace function public.assign_new_user_tft_pin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.tft_pin is null then
    new.tft_pin := public.generate_tft_pin();
  end if;

  return new;
end;
$function$;

drop trigger if exists on_user_created_assign_tft_pin on public.users;

create trigger on_user_created_assign_tft_pin
before insert on public.users
for each row execute function public.assign_new_user_tft_pin();

revoke all on function public.generate_tft_pin()
  from public, anon, authenticated;

revoke all on function public.assign_new_user_tft_pin()
  from public, anon, authenticated;

comment on column public.users.tft_pin is
  'Globally unique 4-digit TFT dashboard PIN. Repeated and sequential values are disallowed.';

do $$
begin
  if exists (
    select 1
    from public.users
    where tft_pin is null
       or tft_pin !~ '^[0-9]{4}$'
       or tft_pin in (
         '0000','1111','2222','3333','4444',
         '5555','6666','7777','8888','9999',
         '0123','1234','2345','3456','4567','5678','6789',
         '3210','4321','5432','6543','7654','8765','9876'
       )
  ) then
    raise exception 'TFT PIN backfill produced invalid values';
  end if;

  if exists (
    select 1
    from public.users
    group by tft_pin
    having count(*) > 1
  ) then
    raise exception 'TFT PIN backfill produced duplicate values';
  end if;
end
$$;

commit;
```

## 3. Verify

```sql
select
  count(*) as total_users,
  count(tft_pin) as assigned_pins,
  count(distinct tft_pin) as unique_pins,
  count(*) filter (
    where tft_pin is null
       or tft_pin !~ '^[0-9]{4}$'
       or tft_pin in (
         '0000','1111','2222','3333','4444',
         '5555','6666','7777','8888','9999',
         '0123','1234','2345','3456','4567','5678','6789',
         '3210','4321','5432','6543','7654','8765','9876'
       )
  ) as invalid_pins
from public.users;
```
