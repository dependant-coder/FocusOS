# FocusOS — Architecture & Implementation Decisions (`docs/DECISIONS.md`)

This log records architectural decisions, schema considerations, and deviations or findings discovered during implementation.

---

## Decision Log

### 1. DEC-001: Offline Storage & Mock Fallback Architecture
- **Date**: 2026-10-25
- **Context**: FocusOS requires zero runtime errors when running in local development or standalone preview without configured Supabase environment credentials (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
- **Decision**: In `src/lib/supabase.ts`, implement a transparent in-memory & `localStorage` mock adapter when environment credentials are absent. If credentials are present, standard `createClient<Database>()` is instantiated.
- **Consequences**: Enables immediate local UI testing, automated tests, and offline demo functionality without breaking when live backend keys are added.

### 2. DEC-002: Dependency Pruning & Retention Strategy
- **Date**: 2026-10-25 (Task P0-1)
- **Context**: Unused packages needed triage: `@dnd-kit/*`, `react-hook-form`, `zod`, `@supabase/auth-ui-*`, `react-icons`, `clsx`, `tailwind-merge`, `zustand`, `react-is`.
- **Decision**:
  - Removed: `react-hook-form`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`, `react-icons`.
  - Replaced: Replaced `react-icons` with `lucide-react` (`Check`, `Trash2`) in `SwipeableItem.tsx`.
  - Retained:
    - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (retained for Task P3-6 habit reordering).
    - `clsx` and `tailwind-merge` (retained for `src/lib/cn.ts` design primitives in P0-2).
    - `zod` (retained for Task P4-3 quick-add parsing validation).
    - `zustand` (retained for Task P4-1 Focus sessions state store).
    - `react-is` (retained as peer dependency for `recharts`).

### 3. DEC-003: Baseline Schema & Foreign Key Constraints
- **Date**: 2026-10-25 (Task P0-3)
- **Context**: Answering architectural questions regarding triggers, foreign keys, and unique indexes.
- **Findings**:
  - No database-level bidirectional trigger exists between `daily_todos` and `habit_logs`. Mutations will orchestrate updates client-side or through planned schema functions.
  - `tasks.status` is the sole column updated when completing daily todos; `tasks.completed_at` is absent in baseline and will be added in Phase 1 via `0003_daily_extras.sql`.
  - `daily_todos.task_id` is nullable. Partial unique indexes `(user_id, task_id, date) WHERE task_id IS NOT NULL` and `(user_id, habit_id, date) WHERE habit_id IS NOT NULL` allow multiple ad-hoc items while preventing duplicate task/habit entries for the same date.
  - Enforce `ON DELETE CASCADE` on all user-owned tables referencing `auth.users(id)` to support clean account deletion.

### 4. DEC-004: Idempotent Daily Reset & Ad-Hoc Carry-Over Uniqueness
- **Date**: 2026-10-25 (Task P1-7)
- **Context**: In P1-7, the daily-reset edge function must run hourly via cron without creating duplicate entries or duplicating carries if run multiple times. Tasks and habits already have partial unique indexes `(user_id, task_id, date)` and `(user_id, habit_id, date)`. Ad-hoc todos (`task_id IS NULL AND habit_id IS NULL`) previously had no conflict target.
- **Decision**:
  - Added migration `0002_reset_tracking.sql` adding `profiles.last_reset_date date`. The edge function skips a user if `profiles.last_reset_date >= userLocalDate`.
  - Added migration `0003_daily_extras.sql` with a partial unique index:
    `CREATE UNIQUE INDEX daily_todos_user_adhoc_carry_uidx ON public.daily_todos(user_id, date, title) WHERE task_id IS NULL AND habit_id IS NULL AND carry_over IS TRUE;`
  - In `daily-reset/index.ts`, carry-overs are batched: task carries use `upsert({ onConflict: 'user_id,task_id,date' })` and ad-hoc carries use `upsert({ onConflict: 'user_id,date,title', ignoreDuplicates: true })`.
  - Edge function date calculations use pure functions in `supabase/functions/_shared/dates.ts` based on `Intl.DateTimeFormat(..., { timeZone })`.

### 5. DEC-005: Timezone-Aware Triggers and Overdue/Escalation Cron Jobs
- **Date**: 2026-10-28
- **Context**: In `0000_baseline.sql`, database triggers `handle_pin_to_today` and `sync_task_changes_to_daily` relied on `current_date` (server UTC). Additionally, live cron jobs for overdue detection (`focusos-overdue-detection`) and priority escalation (`focusos-priority-escalation`) compared `due_date < current_date` at 07:00 and 08:00 UTC. For users in non-UTC timezones (e.g. Asia/Kolkata UTC+5:30 or America/Los_Angeles UTC-7), this caused tasks to be pinned or marked overdue based on the wrong calendar day.
- **Decision**:
  - `handle_pin_to_today` and `sync_task_changes_to_daily` are updated in `0004_timezone_triggers.sql` to look up `profiles.timezone` and calculate `(now() at time zone coalesce(nullif(p.timezone, ''), 'UTC'))::date`.
  - For overdue detection and priority escalation, we created functions `public.detect_overdue_tasks()` and `public.escalate_priority_tasks()`. These join `tasks` with `profiles` to evaluate each task against the user's local date `(now() at time zone p.timezone)::date` rather than global UTC `current_date`.
  - The live pg_cron jobs should be updated to invoke these procedures hourly (or run with hourly daily-reset), ensuring users enter overdue and escalated states precisely when midnight passes in their respective local timezones.

