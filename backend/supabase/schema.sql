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
  cat_id        uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 100),
  age           double precision not null default 0 check (age >= 0),
  sex           text not null default 'female' check (sex in ('male','female')),
  adopted_date  timestamptz not null default now(),
  weight        double precision check (weight is null or weight >= 0),
  breed         text,
  color         text,
  microchip_id  text,
  photo_path    text,                       -- path inside the storage bucket (signed on read)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cats_user_id_idx on public.cats (user_id);
drop trigger if exists cats_set_updated_at on public.cats;
create trigger cats_set_updated_at before update on public.cats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- logs
-- One row per cat per day (same as the DynamoDB catId + date key).
create table if not exists public.logs (
  cat_id       uuid not null references public.cats(cat_id) on delete cascade,
  log_date     date not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  poo_count    integer not null default 0 check (poo_count   between 0 and 1000),
  pee_count    integer not null default 0 check (pee_count   between 0 and 1000),
  food_count   integer not null default 0 check (food_count  between 0 and 1000),
  water_count  integer not null default 0 check (water_count between 0 and 1000),
  weight       double precision,
  temperature  double precision,
  notes        text,
  -- optional fields the old dashboard-analytics Lambda already read but nothing ever wrote
  appetite     smallint check (appetite between 1 and 5),
  energy       smallint check (energy   between 1 and 5),
  vomiting     boolean,
  diarrhea     boolean,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (cat_id, log_date)
);
create index if not exists logs_user_date_idx on public.logs (user_id, log_date desc);
create index if not exists logs_date_idx      on public.logs (log_date);
drop trigger if exists logs_set_updated_at on public.logs;
create trigger logs_set_updated_at before update on public.logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- diseases
create table if not exists public.diseases (
  disease_id   uuid primary key default gen_random_uuid(),
  name         text not null unique,        -- unique so re-running the seed never duplicates
  category     text not null,
  symptoms     text[] not null default '{}',
  description  text not null default '',
  prevention   text[] not null default '{}',
  severity     text not null check (severity in ('mild','mild-moderate','moderate','moderate-severe','severe')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists diseases_set_updated_at on public.diseases;
create trigger diseases_set_updated_at before update on public.diseases
  for each row execute function public.set_updated_at();

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

-- ---------------------------------------------------------------- reminder query (used by the cron job)
create or replace function public.cats_missing_log(day date)
returns table (user_id uuid, cat_id uuid, name text, total_cats integer)
language sql stable security definer set search_path = public as $$
  with totals as (
    select c.user_id, count(*)::int as total from public.cats c group by c.user_id
  )
  select c.user_id, c.cat_id, c.name, t.total
  from public.cats c
  join totals t on t.user_id = c.user_id
  where not exists (
    select 1 from public.logs l where l.cat_id = c.cat_id and l.log_date = day
  )
  order by c.user_id, c.created_at;
$$;
revoke all on function public.cats_missing_log(date) from public, anon, authenticated;
grant execute on function public.cats_missing_log(date) to service_role;

-- ---------------------------------------------------------------- security
-- The API server talks to Postgres with the service-role key (bypasses RLS) and enforces
-- ownership itself. Enabling RLS with NO policies means the public anon key can never read
-- or write these tables directly through Supabase's auto-generated REST API.
alter table public.cats          enable row level security;
alter table public.logs          enable row level security;
alter table public.diseases      enable row level security;
alter table public.device_tokens enable row level security;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', false)
on conflict (id) do nothing;
