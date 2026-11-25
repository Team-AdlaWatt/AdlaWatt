begin;

create or replace function
public.save_electronics_selection(
    p_catalog jsonb,
    p_custom_selected uuid[] default '{}'::uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare

    uid uuid := (select auth.uid());

    selected_ids uuid[] :=
        coalesce(p_custom_selected, '{}'::uuid[]);

    catalog_count integer;
    custom_count integer;
    pick_count integer;

begin

    if uid is null then

        raise exception 'Not authenticated.';

    end if;


    if p_catalog is null
       or jsonb_typeof(p_catalog) <> 'array'
    then

        raise exception 'p_catalog must be a JSON array.';

    end if;


    if jsonb_array_length(p_catalog) > 200 then

        raise exception 'p_catalog is too large.';

    end if;


    select count(distinct i->>'key')
    into catalog_count
    from jsonb_array_elements(p_catalog) i
    where i->>'key' like 'catalog:%';


    select count(distinct id)
    into custom_count
    from unnest(selected_ids) as id
    where id is not null;


    if catalog_count + custom_count > 3 then

        raise exception 'You can select up to 3 electronics.';

    end if;


    delete from public.electronics a
    where a.user_id = uid
      and a.type = 'given'
      and not exists (
          select 1
          from jsonb_array_elements(p_catalog) i
          where i->>'key' = a.catalog_key
      );


    insert into public.electronics (
        user_id,
        electronics_name,
        type,
        catalog_key,
        wattage_min,
        wattage_max,
        selection
    )
    select distinct on (p.item_key)
        uid,
        p.item_name,
        'given',
        p.item_key,
        p.watt_min,
        p.watt_max,
        true
    from (

        select
            i->>'key' as item_key,

            btrim(i->>'name') as item_name,

            case
                when (i->>'wattMin') ~ '^[0-9]+(\.[0-9]+)?$'
                then (i->>'wattMin')::numeric
            end as watt_min,

            case
                when (i->>'wattMax') ~ '^[0-9]+(\.[0-9]+)?$'
                then (i->>'wattMax')::numeric
            end as watt_max

        from jsonb_array_elements(p_catalog) i

    ) p
    where p.item_key like 'catalog:%'
      and char_length(coalesce(p.item_name, '')) between 1 and 120
      and p.watt_min > 0
      and p.watt_max >= p.watt_min
      and p.watt_max <= 720
    order by p.item_key
    on conflict (user_id, catalog_key)
    do nothing;


    update public.electronics a
    set selection = (a.app_id = any(selected_ids))
    where a.user_id = uid
      and a.type = 'custom'
      and a.selection is distinct from
          (a.app_id = any(selected_ids));


    select count(*)
    into pick_count
    from public.electronics a
    where a.user_id = uid
      and (a.type = 'given' or a.selection);


    return pick_count;

end;
$$;

revoke execute
on function public.save_electronics_selection(jsonb, uuid[])
from public, anon;

grant execute
on function public.save_electronics_selection(jsonb, uuid[])
to authenticated, service_role;

commit;
