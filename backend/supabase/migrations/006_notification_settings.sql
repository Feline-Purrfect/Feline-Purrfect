-- 006 — Daily log reminder: per-user time and time zone, sent at most once a day.
-- Run once on an EXISTING database after 005. Fresh installs get this from schema.sql. Re-runnable.

begin;

-- ---------------------------------------------------------------- notification settings
-- One row per user, created when the app first registers a device or the user opens the setting.
create table if not exists public.notification_settings (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  daily_reminder    boolean not null default true,
  remind_at         time not null default '23:00',          -- wall-clock time in `timezone`
  timezone          text not null default 'UTC' check (char_length(timezone) between 1 and 64), -- IANA name
  last_reminded_on  date,                                   -- local day of the last reminder the job handled
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists notification_settings_enabled_idx on public.notification_settings (user_id) where daily_reminder;
drop trigger if exists notification_settings_set_updated_at on public.notification_settings;
create trigger notification_settings_set_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();
alter table public.notification_settings enable row level security;

-- ---------------------------------------------------------------- reminder query (used by the cron job)
-- Each user's "today" now follows their own time zone, so the job asks per day for a set of users.
create or replace function public.cats_missing_log_for(day date, user_ids uuid[])
returns table (user_id uuid, cat_id uuid, name text, total_cats integer)
language sql stable security definer set search_path = public as $$
  with active as (
    select * from public.cats where archived_at is null and user_id = any(user_ids)
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
revoke all on function public.cats_missing_log_for(date, uuid[]) from public, anon, authenticated;
grant execute on function public.cats_missing_log_for(date, uuid[]) to service_role;

-- The single-day UTC version is no longer used.
drop function if exists public.cats_missing_log(date);

commit;
