-- 0000_baseline.sql
-- VERIFIED against the live FocusOS database (project otmobyfcckxdoxkoohzl) on 2026-10-28.
-- Generated from pg_catalog / information_schema, not inferred from app code.
-- This is the state BEFORE any of the plan's migrations (0001+).
-- The live DB already has this applied: mark it with `supabase migration repair --status applied 0000`,
-- never run it against the live project.

create extension if not exists pg_cron;
create extension if not exists pg_net;   -- NOTE: live DB has it in schema public (advisor warning); fix in a later migration

-- ---------- shared trigger function ----------
create or replace function public.update_updated_at() returns trigger
language plpgsql set search_path to 'public' as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  theme text default 'system' check (theme in ('light','dark','system')),
  notif_time time default '08:00:00',
  notif_on boolean default true,
  push_subscription jsonb,
  created_at timestamptz default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'personal' check (category in ('college','personal','skill')),
  priority text not null default 'medium' check (priority in ('critical','high','medium','low')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  due_date date,
  description text,
  resources_url text,
  energy_level text check (energy_level in ('deep_work','quick_task')),
  pin_to_today boolean not null default false,
  is_overdue boolean not null default false,
  auto_escalate boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_due_date_idx on public.tasks (due_date);
create index tasks_overdue_idx on public.tasks (is_overdue) where is_overdue = true;
create index tasks_pin_today_idx on public.tasks (pin_to_today) where pin_to_today = true;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text default '✅',
  frequency text not null default 'daily' check (frequency in ('daily','weekdays','weekends','custom')),
  custom_days text[] default '{}',
  active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index habits_user_idx on public.habits (user_id);

create table public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,      -- SET NULL, not cascade
  habit_id uuid,                                                    -- FK added below (SET NULL)
  title text not null,
  type text not null check (type in ('pinned','due_today','habit','adhoc')),
  done boolean not null default false,
  date date not null default current_date,                          -- current_date = UTC
  priority text check (priority in ('critical','high','medium','low')),
  category text check (category in ('college','personal','skill')),
  carry_over boolean not null default false,
  created_at timestamptz default now(),
  constraint daily_todos_user_id_task_id_date_key unique (user_id, task_id, date),      -- PLAIN unique, not partial
  constraint daily_todos_unique_habit_per_day unique (user_id, habit_id, date)          -- PLAIN unique, not partial
);
create index daily_task_id_idx on public.daily_todos (task_id);
create index daily_user_date_idx on public.daily_todos (user_id, date);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  completed boolean not null default false,
  constraint habit_logs_habit_id_date_key unique (habit_id, date)
);
create index habit_logs_user_date on public.habit_logs (user_id, date);

alter table public.daily_todos
  add constraint daily_todos_habit_fk foreign key (habit_id) references public.habits(id) on delete set null;

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  completion_rate numeric,
  tasks_completed integer default 0,
  tasks_missed integer default 0,
  wins text,
  blockers text,
  next_priorities text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint weekly_reviews_user_id_week_start_key unique (user_id, week_start)
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.daily_todos enable row level security;
alter table public.habit_logs enable row level security;
alter table public.weekly_reviews enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);
-- (no insert/delete policy on profiles: rows are created by handle_new_user)

create policy tasks_select on public.tasks for select using (auth.uid() = user_id);
create policy tasks_insert on public.tasks for insert with check (auth.uid() = user_id);
create policy tasks_update on public.tasks for update using (auth.uid() = user_id);
create policy tasks_delete on public.tasks for delete using (auth.uid() = user_id);

create policy daily_select on public.daily_todos for select using (auth.uid() = user_id);
create policy daily_insert on public.daily_todos for insert with check (auth.uid() = user_id);
create policy daily_update on public.daily_todos for update using (auth.uid() = user_id);
create policy daily_delete on public.daily_todos for delete using (auth.uid() = user_id);

create policy habits_all on public.habits for all using (auth.uid() = user_id);
create policy habit_logs_all on public.habit_logs for all using (auth.uid() = user_id);
create policy weekly_all on public.weekly_reviews for all using (auth.uid() = user_id);

-- ---------- functions (all SECURITY DEFINER, search_path = public) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.handle_pin_to_today() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.pin_to_today = true and old.pin_to_today = false then
    insert into public.daily_todos (user_id, task_id, title, type, done, date, priority, category)
    values (new.user_id, new.id, new.title, 'pinned', false, current_date, new.priority, new.category)
    on conflict (user_id, task_id, date) do nothing;
  end if;
  if new.pin_to_today = false and old.pin_to_today = true then
    delete from public.daily_todos
    where task_id = new.id and date = current_date and done = false and type = 'pinned';
  end if;
  return new;
end; $$;

create or replace function public.handle_daily_todo_complete() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.done = true and old.done = false then
    if new.task_id is not null then
      update public.tasks set status = 'done', pin_to_today = false, updated_at = now()
      where id = new.task_id;
    end if;
    if new.type = 'habit' and new.habit_id is not null then
      update public.habit_logs set completed = true
      where habit_id = new.habit_id and date = new.date;
    end if;
  end if;
  if new.done = false and old.done = true then
    if new.task_id is not null then
      update public.tasks set status = 'in_progress', updated_at = now()
      where id = new.task_id;
    end if;
  end if;
  return new;
end; $$;

create or replace function public.sync_task_changes_to_daily() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.title <> old.title or new.priority <> old.priority then
    update public.daily_todos set title = new.title, priority = new.priority
    where task_id = new.id and date = current_date and done = false;
  end if;
  return new;
end; $$;

-- ---------- triggers (timing/event verified; assumed FOR EACH ROW) ----------
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.update_updated_at();
create trigger weekly_reviews_updated_at before update on public.weekly_reviews
  for each row execute function public.update_updated_at();
create trigger on_task_pin_change after update on public.tasks
  for each row execute function public.handle_pin_to_today();
create trigger on_task_title_priority_change after update on public.tasks
  for each row execute function public.sync_task_changes_to_daily();
create trigger on_daily_todo_done after update on public.daily_todos
  for each row execute function public.handle_daily_todo_complete();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- realtime ----------
alter publication supabase_realtime add table public.tasks, public.daily_todos, public.habits, public.habit_logs;
-- weekly_reviews is NOT in the publication.

-- ---------- cron jobs that exist live (documented, do not duplicate) ----------
-- focusos-overdue-detection   0 7 * * *   update tasks set is_overdue = true
--                                         where due_date < current_date and status != 'done' and is_overdue = false;
-- focusos-priority-escalation 0 8 * * *   update tasks set priority = 'critical'
--                                         where priority = 'high' and status != 'done'
--                                           and due_date <= current_date + interval '2 days' and auto_escalate = true;
-- focusos-daily-reset         1 0 * * *   net.http_post -> /functions/v1/daily-reset (service-role key hard-coded in cron.job: to be replaced)
-- focusos-weekly-review       0 20 * * 0  net.http_post -> /functions/v1/weekly-review
--                                         BROKEN: uses current_setting('app.settings.supabase_url'), which is not set; fails every run.
-- Not recreated here because they hold project URLs/keys. Phase 1 replaces the two http jobs.
