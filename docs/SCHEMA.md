# FocusOS — Database Schema & Architecture (`docs/SCHEMA.md`)

**Status**: Verified against the live FocusOS database (project `otmobyfcckxdoxkoohzl`) on 2026-10-28.
Generated from `pg_catalog` / `information_schema`.

---

## 1. Verified Core Tables & Constraints

### `public.profiles`
- Primary Key: `id uuid references auth.users(id) on delete cascade`
- Columns:
  - `name text`
  - `theme text default 'system' check (theme in ('light','dark','system'))`
  - `notif_time time default '08:00:00'`
  - `notif_on boolean default true`
  - `push_subscription jsonb`
  - `created_at timestamptz default now()`
- RLS Policies:
  - `profiles_select_own`: `select using (auth.uid() = id)`
  - `profiles_update_own`: `update using (auth.uid() = id)`
  - *(No insert/delete policy: profile rows are created exclusively by trigger `on_auth_user_created`)*

### `public.tasks`
- Primary Key: `id uuid default gen_random_uuid()`
- Columns:
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `title text not null`
  - `category text not null default 'personal' check (category in ('college','personal','skill'))`
  - `priority text not null default 'medium' check (priority in ('critical','high','medium','low'))`
  - `status text not null default 'not_started' check (status in ('not_started','in_progress','done'))`
  - `due_date date`
  - `description text`
  - `resources_url text`
  - `energy_level text check (energy_level in ('deep_work','quick_task'))`
  - `pin_to_today boolean not null default false`
  - `is_overdue boolean not null default false`
  - `auto_escalate boolean not null default true`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- Indexes:
  - `tasks_user_id_idx on public.tasks (user_id)`
  - `tasks_due_date_idx on public.tasks (due_date)`
  - `tasks_overdue_idx on public.tasks (is_overdue) where is_overdue = true`
  - `tasks_pin_today_idx on public.tasks (pin_to_today) where pin_to_today = true`
- RLS Policies:
  - `tasks_select`, `tasks_insert`, `tasks_update`, `tasks_delete` restricted to `auth.uid() = user_id`.

### `public.habits`
- Primary Key: `id uuid default gen_random_uuid()`
- Columns:
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `name text not null`
  - `icon text default '✅'`
  - `frequency text not null default 'daily' check (frequency in ('daily','weekdays','weekends','custom'))`
  - `custom_days text[] default '{}'`
  - `active boolean not null default true`
  - `sort_order integer default 0`
  - `created_at timestamptz default now()`
- Indexes:
  - `habits_user_idx on public.habits (user_id)`
- RLS:
  - `habits_all using (auth.uid() = user_id)`

### `public.daily_todos`
- Primary Key: `id uuid default gen_random_uuid()`
- Columns:
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `task_id uuid references public.tasks(id) on delete set null` (Note: `on delete set null`, not cascade)
  - `habit_id uuid references public.habits(id) on delete set null` (Note: `on delete set null`)
  - `title text not null`
  - `type text not null check (type in ('pinned','due_today','habit','adhoc'))`
  - `done boolean not null default false`
  - `date date not null default current_date`
  - `priority text check (priority in ('critical','high','medium','low'))`
  - `category text check (category in ('college','personal','skill'))`
  - `carry_over boolean not null default false`
  - `created_at timestamptz default now()`
- Plain Unique Constraints:
  - `constraint daily_todos_user_id_task_id_date_key unique (user_id, task_id, date)`
  - `constraint daily_todos_unique_habit_per_day unique (user_id, habit_id, date)`
- Indexes:
  - `daily_task_id_idx on public.daily_todos (task_id)`
  - `daily_user_date_idx on public.daily_todos (user_id, date)`
- RLS:
  - `daily_select`, `daily_insert`, `daily_update`, `daily_delete` restricted to `auth.uid() = user_id`.

### `public.habit_logs`
- Primary Key: `id uuid default gen_random_uuid()`
- Columns:
  - `habit_id uuid not null references public.habits(id) on delete cascade`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `date date not null default current_date`
  - `completed boolean not null default false`
- Plain Unique Constraint:
  - `constraint habit_logs_habit_id_date_key unique (habit_id, date)`
- Indexes:
  - `habit_logs_user_date on public.habit_logs (user_id, date)`
- RLS:
  - `habit_logs_all using (auth.uid() = user_id)`

### `public.weekly_reviews`
- Primary Key: `id uuid default gen_random_uuid()`
- Columns:
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `week_start date not null`
  - `completion_rate numeric`
  - `tasks_completed integer default 0`
  - `tasks_missed integer default 0`
  - `wins text`
  - `blockers text`
  - `next_priorities text`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- Unique Constraint:
  - `constraint weekly_reviews_user_id_week_start_key unique (user_id, week_start)`
- RLS:
  - `weekly_all using (auth.uid() = user_id)`

---

## 2. Verified Database Functions & Triggers

All functions run with `SECURITY DEFINER` and `set search_path to 'public'`:
1. `public.handle_new_user()`:
   - Trigger `on_auth_user_created` after insert on `auth.users`. Inserts matching `public.profiles` row with user's full name.
2. `public.handle_pin_to_today()`:
   - Trigger `on_task_pin_change` after update on `public.tasks`. Inserts or deletes pinned daily todo.
3. `public.sync_task_changes_to_daily()`:
   - Trigger `on_task_title_priority_change` after update on `public.tasks`. Updates daily todo title and priority when uncompleted.
4. `public.handle_daily_todo_complete()`:
   - Trigger `on_daily_todo_done` after update on `public.daily_todos`.
   - When `new.done = true`:
     - If `task_id` is set: updates `tasks.status = 'done'`, `pin_to_today = false`, `updated_at = now()`.
     - If `type = 'habit'` and `habit_id` is set: updates `habit_logs set completed = true where habit_id = new.habit_id and date = new.date`.
   - When `new.done = false`:
     - If `task_id` is set: updates `tasks.status = 'in_progress'`, `updated_at = now()`.
   - **Crucial Note**: The database trigger sync is **one-way only** (`daily_todos` -> `habit_logs`). There is no reverse database trigger from `habit_logs` to `daily_todos`.

---

## 3. Realtime Publication
Verified live publication:
```sql
alter publication supabase_realtime add table public.tasks, public.daily_todos, public.habits, public.habit_logs;
```
*(Note: `weekly_reviews` is NOT part of the live realtime publication.)*

---

## 4. Live Cron Jobs
- `focusos-overdue-detection` (`0 7 * * *`):
  `update tasks set is_overdue = true where due_date < current_date and status != 'done' and is_overdue = false;`
- `focusos-priority-escalation` (`0 8 * * *`):
  `update tasks set priority = 'critical' where priority = 'high' and status != 'done' and due_date <= current_date + interval '2 days' and auto_escalate = true;`
- `focusos-daily-reset` (`1 0 * * *`):
  Calls `/functions/v1/daily-reset` via `net.http_post`.
- `focusos-weekly-review` (`0 20 * * 0`):
  Calls `/functions/v1/weekly-review` via `net.http_post`.
