-- 0001_timezone.sql
-- Add timezone column to profiles with default UTC
alter table public.profiles add column if not exists timezone text not null default 'UTC';
