-- 0004_timezone_triggers.sql
-- Timezone-aware triggers for task pinning, daily sync, overdue detection, and priority escalation

-- 1. Timezone-aware handle_pin_to_today
create or replace function public.handle_pin_to_today() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare
  user_tz text;
  user_local_date date;
begin
  select coalesce(timezone, 'UTC') into user_tz
  from public.profiles
  where id = new.user_id;

  begin
    user_local_date := (now() at time zone coalesce(nullif(user_tz, ''), 'UTC'))::date;
  exception when others then
    user_local_date := (now() at time zone 'UTC')::date;
  end;

  if new.pin_to_today = true and (old.pin_to_today is distinct from true) then
    insert into public.daily_todos (user_id, task_id, title, type, done, date, priority, category)
    values (new.user_id, new.id, new.title, 'pinned', false, user_local_date, new.priority, new.category)
    on conflict (user_id, task_id, date) do nothing;
  end if;

  if new.pin_to_today = false and old.pin_to_today = true then
    delete from public.daily_todos
    where task_id = new.id and date = user_local_date and done = false and type = 'pinned';
  end if;

  return new;
end; $$;

-- 2. Timezone-aware sync_task_changes_to_daily
create or replace function public.sync_task_changes_to_daily() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare
  user_tz text;
  user_local_date date;
begin
  if new.title <> old.title or new.priority <> old.priority then
    select coalesce(timezone, 'UTC') into user_tz
    from public.profiles
    where id = new.user_id;

    begin
      user_local_date := (now() at time zone coalesce(nullif(user_tz, ''), 'UTC'))::date;
    exception when others then
      user_local_date := (now() at time zone 'UTC')::date;
    end;

    update public.daily_todos
    set title = new.title, priority = new.priority
    where task_id = new.id and date = user_local_date and done = false;
  end if;
  return new;
end; $$;

-- 3. Timezone-aware helper procedures for overdue detection and escalation
create or replace function public.detect_overdue_tasks() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  rows_updated integer;
begin
  update public.tasks t
  set is_overdue = true, updated_at = now()
  from public.profiles p
  where t.user_id = p.id
    and t.status <> 'done'
    and t.is_overdue = false
    and t.due_date is not null
    and t.due_date < (now() at time zone coalesce(nullif(p.timezone, ''), 'UTC'))::date;

  get diagnostics rows_updated = row_count;
  return rows_updated;
end; $$;

create or replace function public.escalate_priority_tasks() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  rows_updated integer;
begin
  update public.tasks t
  set priority = 'critical', updated_at = now()
  from public.profiles p
  where t.user_id = p.id
    and t.priority = 'high'
    and t.status <> 'done'
    and t.auto_escalate = true
    and t.due_date is not null
    and t.due_date <= ((now() at time zone coalesce(nullif(p.timezone, ''), 'UTC'))::date + 2);

  get diagnostics rows_updated = row_count;
  return rows_updated;
end; $$;
