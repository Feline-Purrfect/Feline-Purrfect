-- 007 — Performance: the dashboard's "last 30 logs of every cat" in one round-trip.
-- Run once on an EXISTING database after 006. Fresh installs get this from schema.sql. Re-runnable.
-- Until it's run, the API falls back to one query per cat (slower, same result).

begin;

-- One LATERAL lookup per active cat on the logs primary key (cat_id, log_date): each cat reads only its
-- newest p_limit rows from the index, however many logs it has.
create or replace function public.recent_logs_per_cat(p_user_id uuid, p_limit integer default 30)
returns setof public.logs
language sql stable security definer set search_path = public as $$
  select l.*
  from public.cats c
  cross join lateral (
    select * from public.logs
    where logs.cat_id = c.cat_id
    order by logs.log_date desc
    limit greatest(1, least(p_limit, 400))
  ) l
  where c.user_id = p_user_id and c.archived_at is null;
$$;
revoke all on function public.recent_logs_per_cat(uuid, integer) from public, anon, authenticated;
grant execute on function public.recent_logs_per_cat(uuid, integer) to service_role;

commit;
