-- 002 — Cat redesign: birthday instead of age, weight-unit preference, archiving, photo gallery.
-- Run once on an EXISTING database (Supabase → SQL Editor). Fresh installs get all of this from schema.sql.
-- Safe to re-run.

begin;

-- ---------------------------------------------------------------- cats: new columns
alter table public.cats add column if not exists birth_date           date;
alter table public.cats add column if not exists birth_date_estimated boolean not null default false;
alter table public.cats add column if not exists weight_unit          text    not null default 'kg';
alter table public.cats add column if not exists archived_at          timestamptz;

-- Backfill: the old app stored a static `age` (years) at creation time. Turn it into an estimated
-- birthday relative to when the cat was added, so the age keeps counting up from here on.
update public.cats
set birth_date = (created_at - make_interval(months => round(age * 12)::int))::date,
    birth_date_estimated = true
where birth_date is null;

alter table public.cats alter column birth_date set not null;

-- `age` is now derived from birth_date by the API. Keep the column (nullable) so a rollback is possible;
-- drop it in a later migration once nothing reads it.
alter table public.cats alter column age drop not null;

-- Adopted date is a calendar date, not an instant (timestamptz shifted it a day for some time zones).
alter table public.cats alter column adopted_date type date using (adopted_date at time zone 'UTC')::date;
alter table public.cats alter column adopted_date set default current_date;

-- Constraints (drop first so the migration is re-runnable)
alter table public.cats drop constraint if exists cats_weight_unit_check;
alter table public.cats add  constraint cats_weight_unit_check check (weight_unit in ('kg','lb'));

alter table public.cats drop constraint if exists cats_birth_date_check;
alter table public.cats add  constraint cats_birth_date_check check (birth_date <= current_date + 1);

-- Microchips are 9–15 digits (ISO 11784/11785 = 15; older AVID/FECAVA = 9–10). Stored digits-only.
update public.cats set microchip_id = nullif(regexp_replace(coalesce(microchip_id, ''), '\D', '', 'g'), '');
alter table public.cats drop constraint if exists cats_microchip_check;
alter table public.cats add  constraint cats_microchip_check check (microchip_id is null or microchip_id ~ '^\d{9,15}$');

create index if not exists cats_user_active_idx on public.cats (user_id) where archived_at is null;

-- ---------------------------------------------------------------- cat photo gallery
create table if not exists public.cat_photos (
  photo_id    uuid primary key default gen_random_uuid(),
  cat_id      uuid not null references public.cats(cat_id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  path        text not null unique,                 -- path inside the cat-photos bucket
  taken_on    date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists cat_photos_cat_idx  on public.cat_photos (cat_id,  taken_on desc, created_at desc);
create index if not exists cat_photos_user_idx on public.cat_photos (user_id, taken_on desc, created_at desc);
alter table public.cat_photos enable row level security;

-- ---------------------------------------------------------------- reminders skip archived cats
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
    select 1 from public.logs l where l.cat_id = a.cat_id and l.log_date = day
  )
  order by a.user_id, a.created_at;
$$;
revoke all on function public.cats_missing_log(date) from public, anon, authenticated;
grant execute on function public.cats_missing_log(date) to service_role;

commit;
