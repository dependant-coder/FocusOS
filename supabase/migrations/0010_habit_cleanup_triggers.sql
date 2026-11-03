-- 0010_habit_cleanup_triggers.sql
-- Archiving a habit removes its undone Today/future todo (evaluated in the user's local day).
create or replace function public.cleanup_habit_todos_on_archive() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare tz text; local_today date;
begin
  if old.active is true and new.active is false then
    select coalesce(nullif(timezone, ''), 'UTC') into tz from public.profiles where id = new.user_id;
    begin
      local_today := (now() at time zone coalesce(tz, 'UTC'))::date;
    exception when others then
      local_today := (now() at time zone 'UTC')::date;
    end;
    delete from public.daily_todos
    where habit_id = new.id and done = false and date >= local_today;
  end if;
  return new;
end $$;

drop trigger if exists trg_habit_archive_cleanup on public.habits;
create trigger trg_habit_archive_cleanup after update of active on public.habits
  for each row execute function public.cleanup_habit_todos_on_archive();

-- Permanently deleting a habit removes ALL its daily_todos (the FK would otherwise leave orphan rows with habit_id = NULL).
create or replace function public.cleanup_habit_todos_on_delete() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  delete from public.daily_todos where habit_id = old.id;
  return old;
end $$;

drop trigger if exists trg_habit_delete_cleanup on public.habits;
create trigger trg_habit_delete_cleanup before delete on public.habits
  for each row execute function public.cleanup_habit_todos_on_delete();

revoke execute on function public.cleanup_habit_todos_on_archive() from public, anon, authenticated;
revoke execute on function public.cleanup_habit_todos_on_delete() from public, anon, authenticated;
