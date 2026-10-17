-- 003 — Log redesign: food/water as amounts with units, symptoms, teeth brushing, medication.
-- Run once on an EXISTING database after 002. Fresh installs get all of this from schema.sql. Re-runnable.

begin;

alter table public.logs add column if not exists food_amount   numeric(7,2);
alter table public.logs add column if not exists food_unit     text;
alter table public.logs add column if not exists water_amount  numeric(7,2);
alter table public.logs add column if not exists water_unit    text;
alter table public.logs add column if not exists symptoms      jsonb   not null default '[]'::jsonb; -- [{ "name": "Vomiting", "count": 2 }]
alter table public.logs add column if not exists teeth_brushed boolean;
alter table public.logs add column if not exists medications   jsonb   not null default '[]'::jsonb; -- [{ "name": "Probiotic", "dose": 1, "unit": "pill" }]

-- Backfill: old logs only had tap counts. Keep the numbers, labelled with the closest unit.
update public.logs
set food_amount = food_count, food_unit = 'portions'
where food_amount is null and food_count is not null;
update public.logs
set water_amount = water_count, water_unit = 'bowls'
where water_amount is null and water_count is not null;

-- Old vomiting/diarrhea flags become symptoms.
update public.logs
set symptoms = (
  select coalesce(jsonb_agg(s), '[]'::jsonb) from (
    select jsonb_build_object('name', 'Vomiting', 'count', 1) as s where vomiting
    union all
    select jsonb_build_object('name', 'Diarrhea', 'count', 1) where diarrhea
  ) x
)
where symptoms = '[]'::jsonb and (vomiting or diarrhea);

-- food_count / water_count are deprecated (the API stops writing them); allow defaults to carry on.
alter table public.logs alter column food_count  set default 0;
alter table public.logs alter column water_count set default 0;

alter table public.logs drop constraint if exists logs_food_check;
alter table public.logs add  constraint logs_food_check check (
  (food_amount is null and food_unit is null) or
  (food_amount between 0 and 5000 and food_unit in ('g','cups','portions'))
);
alter table public.logs drop constraint if exists logs_water_check;
alter table public.logs add  constraint logs_water_check check (
  (water_amount is null and water_unit is null) or
  (water_amount between 0 and 10000 and water_unit in ('ml','bowls'))
);
alter table public.logs drop constraint if exists logs_json_check;
alter table public.logs add  constraint logs_json_check check (
  jsonb_typeof(symptoms) = 'array' and jsonb_typeof(medications) = 'array'
);

-- Reminders: a log only counts as done once food and water are filled in
-- (a log can exist with just a symptom noted earlier in the day).
create or replace function public.cats_missing_log(day date)
returns table (user_id uuid, cat_id uuid, name text, total_cats integer)
language sql stable security definer set search_path = public as $$
  with active as (
    select * from public.cats where archived_at is null
  ), totals as (
    select a.user_id, count(*)::int as total from active a group by a.user_id
  )
  select a.user_id, a.cat_id, a.name, t.total
  from active a
  join totals t on t.user_id = a.user_id
  where not exists (
    select 1 from public.logs l
    where l.cat_id = a.cat_id and l.log_date = day
      and l.food_amount is not null and l.water_amount is not null
  )
  order by a.user_id, a.created_at;
$$;
revoke all on function public.cats_missing_log(date) from public, anon, authenticated;
grant execute on function public.cats_missing_log(date) to service_role;

commit;
