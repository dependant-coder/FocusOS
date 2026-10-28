-- 0003_daily_extras.sql
-- Add carry_count, must_do to daily_todos
alter table public.daily_todos add column if not exists carry_count int not null default 0;
alter table public.daily_todos add column if not exists must_do boolean not null default false;

-- tasks: completed_at, time, estimate
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists due_time time;
alter table public.tasks add column if not exists estimate_min int check (estimate_min is null or estimate_min > 0);
update public.tasks set completed_at = updated_at where status = 'done' and completed_at is null;

create or replace function public.set_task_completed_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'done' and (old.status is null or old.status is distinct from 'done') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_task_completed_at on public.tasks;
create trigger trg_task_completed_at before update on public.tasks
  for each row execute function public.set_task_completed_at();

-- weekly_reviews additions
alter table public.weekly_reviews
  add column if not exists habits_due int default 0,
  add column if not exists habits_done int default 0,
  add column if not exists habit_completion_rate int default 0,
  add column if not exists focus_minutes int default 0,
  add column if not exists carried_over_count int default 0;

-- Partial unique index for ad-hoc carry-over idempotency
create unique index if not exists daily_todos_user_adhoc_carry_uidx
  on public.daily_todos(user_id, date, title)
  where task_id is null and habit_id is null and carry_over is true;
