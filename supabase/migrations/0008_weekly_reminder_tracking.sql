-- 0008_weekly_reminder_tracking.sql
-- The daily reminder and the weekly-review reminder need independent "already sent today" markers.
alter table public.profiles add column if not exists last_weekly_reminder_date date;
