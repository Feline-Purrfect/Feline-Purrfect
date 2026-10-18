-- Feline Purrfect — Supabase schema
-- Run once in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Replaces: DynamoDB tables (cats, logs, diseases, device_tokens), the S3 photo bucket,
-- and the Cognito user store (Supabase Auth manages users in auth.users).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- cats
create table if not exists public.cats (
  cat_id                uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null check (char_length(name) between 1 and 100),
  age                   double precision check (age >= 0),   -- deprecated: derived from birth_date by the API
  birth_date            date not null check (birth_date <= current_date + 1),
  birth_date_estimated  boolean not null default false,
  sex                   text not null default 'female' check (sex in ('male','female')),
  adopted_date          date not null default current_date,
  weight                double precision check (weight is null or weight >= 0),   -- always kilograms
  weight_unit           text not null default 'kg' check (weight_unit in ('kg','lb')), -- display preference
  breed                 text,
  color                 text,
  microchip_id          text check (microchip_id is null or microchip_id ~ '^\d{9,15}$'),
  photo_path            text,                       -- profile/cover photo path in the storage bucket
  archived_at           timestamptz,                -- set when a cat has passed away; reminders stop
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists cats_user_id_idx on public.cats (user_id);
create index if not exists cats_user_active_idx on public.cats (user_id) where archived_at is null;
drop trigger if exists cats_set_updated_at on public.cats;
create trigger cats_set_updated_at before update on public.cats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- cat photo gallery
create table if not exists public.cat_photos (
  photo_id    uuid primary key default gen_random_uuid(),
  cat_id      uuid not null references public.cats(cat_id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  path        text not null unique,
  taken_on    date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists cat_photos_cat_idx  on public.cat_photos (cat_id,  taken_on desc, created_at desc);
create index if not exists cat_photos_user_idx on public.cat_photos (user_id, taken_on desc, created_at desc);

-- ---------------------------------------------------------------- logs
-- One row per cat per day (same as the DynamoDB catId + date key).
create table if not exists public.logs (
  cat_id         uuid not null references public.cats(cat_id) on delete cascade,
  log_date       date not null,
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- daily essentials (a log is "complete" once food and water are filled in)
  food_amount    numeric(7,2),
  food_unit      text,
  water_amount   numeric(7,2),
  water_unit     text,
  poo_count      integer not null default 0 check (poo_count between 0 and 1000),
  pee_count      integer not null default 0 check (pee_count between 0 and 1000),
  -- optional
  symptoms       jsonb not null default '[]'::jsonb,   -- [{ "name": "Vomiting", "count": 2 }]
  teeth_brushed  boolean,
  medications    jsonb not null default '[]'::jsonb,   -- [{ "name": "Probiotic", "dose": 1, "unit": "pill" }]
  weight         double precision,                     -- kg
  temperature    double precision,                     -- °C
  notes          text,
  -- deprecated (kept for old rows / rollback)
  food_count     integer not null default 0,
  water_count    integer not null default 0,
  appetite       smallint check (appetite between 1 and 5),
  energy         smallint check (energy   between 1 and 5),
  vomiting       boolean,
  diarrhea       boolean,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (cat_id, log_date),
  constraint logs_food_check check (
    (food_amount is null and food_unit is null) or
    (food_amount between 0 and 5000 and food_unit in ('g','cups','portions'))),
  constraint logs_water_check check (
    (water_amount is null and water_unit is null) or
    (water_amount between 0 and 10000 and water_unit in ('ml','bowls'))),
  constraint logs_json_check check (jsonb_typeof(symptoms) = 'array' and jsonb_typeof(medications) = 'array')
);
create index if not exists logs_user_date_idx on public.logs (user_id, log_date desc);
create index if not exists logs_date_idx      on public.logs (log_date);
drop trigger if exists logs_set_updated_at on public.logs;
create trigger logs_set_updated_at before update on public.logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- ask (AI chat)
-- A thread is one conversation: about one cat (cat_id set) or General (cat_id null).
-- Deleting a cat deletes its chats; deleting the account deletes everything.
create table if not exists public.ask_threads (
  thread_id   uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  cat_id      uuid references public.cats(cat_id) on delete cascade,
  title       text not null default '' check (char_length(title) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ask_threads_user_idx on public.ask_threads (user_id, updated_at desc);
create index if not exists ask_threads_cat_idx  on public.ask_threads (cat_id, updated_at desc);
drop trigger if exists ask_threads_set_updated_at on public.ask_threads;
create trigger ask_threads_set_updated_at before update on public.ask_threads
  for each row execute function public.set_updated_at();

create table if not exists public.ask_messages (
  message_id     uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.ask_threads(thread_id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  role           text not null check (role in ('user','assistant')),
  content        text not null check (char_length(content) <= 20000),
  emergency      boolean not null default false,   -- the hard-coded emergency check matched the question
  context        jsonb,                            -- { catId, catName, from, to, loggedDays } for cat chats
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  reported_at    timestamptz,                      -- the owner flagged this answer
  report_reason  text check (report_reason is null or char_length(report_reason) <= 500),
  created_at     timestamptz not null default now()
);
create index if not exists ask_messages_thread_idx on public.ask_messages (thread_id, created_at);
create index if not exists ask_messages_quota_idx  on public.ask_messages (user_id, created_at desc) where role = 'user';
create index if not exists ask_messages_reported_idx on public.ask_messages (reported_at) where reported_at is not null;

-- ---------------------------------------------------------------- device tokens (Expo push)
create table if not exists public.device_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens (user_id);
drop trigger if exists device_tokens_set_updated_at on public.device_tokens;
create trigger device_tokens_set_updated_at before update on public.device_tokens
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- notification settings
-- Daily log reminder: one row per user, created when the app first registers a device or the user
-- opens the setting. Sent at most once a day at `remind_at` in the user's own time zone.
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

-- ---------------------------------------------------------------- reminder query (used by the cron job)
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

-- ---------------------------------------------------------------- security
-- The API server talks to Postgres with the service-role key (bypasses RLS) and enforces
-- ownership itself. Enabling RLS with NO policies means the public anon key can never read
-- or write these tables directly through Supabase's auto-generated REST API.
alter table public.cats          enable row level security;
alter table public.cat_photos    enable row level security;
alter table public.logs          enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notification_settings enable row level security;
alter table public.ask_threads   enable row level security;
alter table public.ask_messages  enable row level security;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', false)
on conflict (id) do nothing;
