-- 0002_reset_tracking.sql
-- Add tracking dates for daily reset, weekly review, and reminder cron jobs
alter table public.profiles add column if not exists last_reset_date date;
alter table public.profiles add column if not exists last_weekly_date date;
alter table public.profiles add column if not exists last_reminder_date date;
