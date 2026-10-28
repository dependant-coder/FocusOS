-- 0006_hardening.sql
-- Review fixes for 0001-0005.

-- 1. Functions created in 0003/0004 inherit default EXECUTE for PUBLIC, so anon/authenticated could call
--    them through /rest/v1/rpc. detect_overdue_tasks()/escalate_priority_tasks() are SECURITY DEFINER and
--    touch EVERY user's tasks, so lock them down (cron runs as postgres; service_role keeps access).
revoke execute on function public.detect_overdue_tasks() from public, anon, authenticated;
revoke execute on function public.escalate_priority_tasks() from public, anon, authenticated;
revoke execute on function public.set_task_completed_at() from public, anon, authenticated;
grant execute on function public.detect_overdue_tasks() to service_role;
grant execute on function public.escalate_priority_tasks() to service_role;

-- 2. An invalid IANA zone in profiles.timezone makes `AT TIME ZONE` throw, which would abort the whole
--    hourly overdue/escalation run for every user. Coerce invalid values to 'UTC' on write.
create or replace function public.normalize_profile_timezone() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if new.timezone is null or new.timezone = ''
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    new.timezone := 'UTC';
  end if;
  return new;
end $$;

drop trigger if exists trg_profile_timezone on public.profiles;
create trigger trg_profile_timezone before insert or update of timezone on public.profiles
  for each row execute function public.normalize_profile_timezone();
revoke execute on function public.normalize_profile_timezone() from public, anon, authenticated;
