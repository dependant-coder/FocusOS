-- 0009_overdue_flag_reset.sql
-- is_overdue was only ever set to true (by detect_overdue_tasks). Clear it when a task is completed
-- or its due date moves, evaluated in the user's local day.
create or replace function public.reset_overdue_flag() returns trigger
language plpgsql set search_path to 'public' as $$
declare tz text; local_today date;
begin
  if new.status = 'done' then
    new.is_overdue := false;
  elsif new.due_date is distinct from old.due_date then
    select coalesce(nullif(timezone, ''), 'UTC') into tz from public.profiles where id = new.user_id;
    begin
      local_today := (now() at time zone coalesce(tz, 'UTC'))::date;
    exception when others then
      local_today := (now() at time zone 'UTC')::date;
    end;
    new.is_overdue := (new.due_date is not null and new.due_date < local_today);
  end if;
  return new;
end $$;

drop trigger if exists trg_reset_overdue_flag on public.tasks;
create trigger trg_reset_overdue_flag before update of status, due_date on public.tasks
  for each row execute function public.reset_overdue_flag();

revoke execute on function public.reset_overdue_flag() from public, anon, authenticated;
