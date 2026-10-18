-- 004 — Remove the disease library (the Search tab is replaced by Ask).
-- Run once on an EXISTING database. Fresh installs never create the table. Re-runnable.

drop table if exists public.diseases cascade;
