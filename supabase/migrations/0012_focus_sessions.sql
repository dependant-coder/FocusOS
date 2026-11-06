-- 0012_focus_sessions.sql  (P4-1 Focus sessions)
-- Already applied to the live database; this file only syncs the repo.
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  task_id uuid references public.tasks(id) on delete set null,
  kind text not null default 'focus' check (kind in ('focus', 'break')),
  planned_seconds int not null check (planned_seconds > 0 and planned_seconds <= 86400),
  actual_seconds int check (actual_seconds is null or actual_seconds >= 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Pause bookkeeping so ANY device can reconstruct the remaining time from the row alone:
  --   remaining = planned_seconds - (now - started_at) + paused_seconds + (now - paused_at, only while paused)
  paused_at timestamptz,
  paused_seconds int not null default 0 check (paused_seconds >= 0),
  status text not null default 'running' check (status in ('running', 'paused', 'completed', 'stopped')),
  interruptions int not null default 0 check (interruptions >= 0),
  note text check (note is null or char_length(note) <= 500),
  constraint focus_sessions_ended_consistent check (
    status in ('running', 'paused') or ended_at is not null
  ),
  constraint focus_sessions_end_after_start check (ended_at is null or ended_at >= started_at)
);

create index if not exists focus_sessions_user_started
  on public.focus_sessions (user_id, started_at desc);
create index if not exists focus_sessions_task_id_idx
  on public.focus_sessions (task_id) where task_id is not null;

-- At most ONE unfinished (running/paused) session per user. Starts on a second device fail fast (23505)
-- and the client shows "Session running on another device" instead of creating a duplicate.
create unique index if not exists focus_sessions_one_active_per_user
  on public.focus_sessions (user_id) where status in ('running', 'paused');

alter table public.focus_sessions enable row level security;

create policy focus_sessions_select on public.focus_sessions
  for select using ((select auth.uid()) = user_id);
create policy focus_sessions_insert on public.focus_sessions
  for insert with check ((select auth.uid()) = user_id);
create policy focus_sessions_update on public.focus_sessions
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy focus_sessions_delete on public.focus_sessions
  for delete using ((select auth.uid()) = user_id);

-- Least privilege (same model as the other tables)
revoke all on public.focus_sessions from anon;
revoke truncate, trigger, references on public.focus_sessions from authenticated;
grant select, insert, update, delete on public.focus_sessions to authenticated;
grant all on public.focus_sessions to service_role;

alter publication supabase_realtime add table public.focus_sessions;
