begin;

create temp table if not exists affected_components_users
on commit drop as
select distinct user_id
from public.components
where false;

create temp table if not exists alias_rank
on commit drop as
select
  component_id,
  user_id,
  false::boolean as any_active,
  0::bigint as rn
from public.components
where false;

insert into affected_components_users (user_id)
select distinct user_id
from public.components
where user_id is not null;

delete from public.components
where lower(btrim(component_name)) in (
  'buck converter',
  'ina228',
  'ds18b20 (battery)',
  'ds18b20(battery)',
  'ds18b20 battery',
  'ds18b20 1 battery',
  'ds18b20 1 battery temp'
);

do $$
declare
  alias_group record;
begin
  for alias_group in
    select *
    from (values
      (
        'ESP32-S3',
        array['esp32', 'esp32-s3']::text[]
      ),
      (
        'INA219',
        array['voltage sensor', 'ina219']::text[]
      ),
      (
        'DS18B20',
        array[
          'ds18b20',
          'ds18b20 (solar)',
          'ds18b20(solar)',
          'ds18b20 solar',
          'ds18b20 2 solar',
          'ds18b20 2 solar temp'
        ]::text[]
      )
    ) as component_groups(canonical, aliases)
  loop
    truncate table alias_rank;

    insert into alias_rank (
      component_id,
      user_id,
      any_active,
      rn
    )
    select
      component_id,
      user_id,
      bool_or(coalesce(status, false)) over (
        partition by user_id
      ) as any_active,
      row_number() over (
        partition by user_id
        order by
          (lower(btrim(component_name)) = lower(alias_group.canonical)) desc,
          coalesce(status, false) desc,
          component_id::text
      ) as rn
    from public.components
    where lower(btrim(component_name)) = any(alias_group.aliases);

    delete from public.components c
    using alias_rank r
    where c.component_id = r.component_id
      and r.rn > 1;

    update public.components c
    set
      component_name = alias_group.canonical,
      status = r.any_active
    from alias_rank r
    where c.component_id = r.component_id
      and r.rn = 1
      and (
        c.component_name is distinct from alias_group.canonical
        or coalesce(c.status, false) is distinct from r.any_active
      );
  end loop;
end $$;

with ranked as (
  select
    component_id,
    row_number() over (
      partition by user_id, component_name
      order by coalesce(status, false) desc, component_id::text
    ) as rn,
    bool_or(coalesce(status, false)) over (
      partition by user_id, component_name
    ) as any_active
  from public.components
  where component_name = any(array[
    'ESP32-S3',
    'INA219',
    'DS18B20',
    'DHT22',
    'Relay Module 5V 1 Channel',
    '5V DC Fan',
    'SPI TFT Display'
  ])
)
update public.components c
set status = ranked.any_active
from ranked
where c.component_id = ranked.component_id
  and ranked.rn = 1
  and coalesce(c.status, false) is distinct from ranked.any_active;

with ranked as (
  select
    component_id,
    row_number() over (
      partition by user_id, component_name
      order by coalesce(status, false) desc, component_id::text
    ) as rn
  from public.components
  where component_name = any(array[
    'ESP32-S3',
    'INA219',
    'DS18B20',
    'DHT22',
    'Relay Module 5V 1 Channel',
    '5V DC Fan',
    'SPI TFT Display'
  ])
)
delete from public.components c
using ranked
where c.component_id = ranked.component_id
  and ranked.rn > 1;

insert into public.components (
  user_id,
  component_name,
  status
)
select
  users.user_id,
  expected.component_name,
  false
from affected_components_users users
cross join unnest(array[
  'ESP32-S3',
  'INA219',
  'DS18B20',
  'DHT22',
  'Relay Module 5V 1 Channel',
  '5V DC Fan',
  'SPI TFT Display'
]) as expected(component_name)
where not exists (
  select 1
  from public.components existing
  where existing.user_id = users.user_id
    and existing.component_name = expected.component_name
);

select
  component_name,
  count(*) as row_count
from public.components
group by component_name
order by component_name;

commit;
