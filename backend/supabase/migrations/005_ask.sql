-- 005 — Ask (AI chat): conversation threads and messages.
-- Run once on an EXISTING database after 004. Fresh installs get this from schema.sql. Re-runnable.

begin;

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

alter table public.ask_threads  enable row level security;
alter table public.ask_messages enable row level security;

commit;
