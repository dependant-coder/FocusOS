# FocusOS — Complete Implementation Plan
> A mobile-first productivity web app for college students.
> Built with React + Supabase. The AI IDE has the **Supabase MCP connected**, so all database
> operations (tables, RLS, triggers, cron jobs, functions) are executed **directly by the AI
> via MCP** — no CLI migrations, no copy-pasting SQL into the dashboard.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [How the Supabase MCP Changes the Workflow](#2-how-the-supabase-mcp-changes-the-workflow)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Environment Variables](#5-environment-variables)
6. [Supabase Client Setup](#6-supabase-client-setup)
7. [Database Schema](#7-database-schema)
8. [Row Level Security (RLS) Policies](#8-row-level-security-rls-policies)
9. [Database Functions & Triggers](#9-database-functions--triggers)
10. [Scheduled Jobs (pg_cron)](#10-scheduled-jobs-pg_cron)
11. [Edge Functions](#11-edge-functions)
12. [Pages & Screens](#12-pages--screens)
13. [Components Library](#13-components-library)
14. [Automations & Business Logic](#14-automations--business-logic)
15. [React Query + Supabase Hooks](#15-react-query--supabase-hooks)
16. [Implementation Checklist](#16-implementation-checklist)

---

## 1. Project Overview

**App Name:** FocusOS
**Tagline:** Your daily command center — built for college life.
**Primary Target:** Mobile (375px–430px). Desktop is secondary.
**Stack:** React (Vite + TypeScript) + Supabase (Auth + DB + Realtime + Edge Functions)

**No separate backend server.** Supabase handles everything: auth, database, scheduled jobs,
and serverless functions. The React frontend calls Supabase directly.

### Core Problem Being Solved
Three things to track, all living in silos:
- **College tasks** — assignments, exams, projects with due dates
- **Personal goals** — skills to learn, side projects, reading
- **Daily habits** — exercise, reviewing notes, etc.

FocusOS makes one Master Task Vault the single source of truth. Toggling "Pin to Today" on any
task **automatically** creates a fully-populated entry in the Daily Command Center via a
PostgreSQL trigger. No retyping. Two-way sync. Everything automated.

### The Central Mechanic
```
Master Task Vault  →  user sets pin_to_today = TRUE
                              │
                   [DB Trigger fires instantly]
                              │
                              ▼
Daily Command Center  →  row auto-inserted (title, priority, category all copied)
                              │
                   [User checks it off]
                              │
                   [DB Trigger fires instantly]
                              │
                              ▼
Master Task Vault  →  status = 'done', pin_to_today = FALSE (synced back)
```

---

## 2. How the Supabase MCP Changes the Workflow

> **This section is critical for the AI building the app to understand.**

With the Supabase MCP connected to the IDE, the AI does **not** need to:
- Run `supabase init` or `supabase start`
- Write SQL files to a `supabase/migrations/` folder
- Run `supabase db push` from a terminal
- Ask the user to paste SQL into the Supabase dashboard
- Use the Supabase CLI for any database operation

Instead, the AI **directly executes** all SQL against the live Supabase project using MCP tools:

| Task | Old way (CLI) | New way (MCP) |
|---|---|---|
| Create a table | Write migration file → `supabase db push` | Execute `CREATE TABLE` SQL via MCP |
| Enable RLS | Write migration file → push | Execute `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` via MCP |
| Create trigger | Write migration file → push | Execute `CREATE TRIGGER` SQL via MCP |
| Enable pg_cron jobs | Write migration file → push | Execute `SELECT cron.schedule(...)` via MCP |
| Generate TS types | `supabase gen types typescript` CLI | Use MCP to introspect schema, or generate manually from schema |
| Check table exists | CLI or dashboard | Query `information_schema.tables` via MCP |

### What still uses the CLI
Edge Functions cannot be deployed via MCP — they still need the Supabase CLI:
```bash
supabase functions deploy daily-reset
supabase functions deploy weekly-review
supabase functions deploy send-notification
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```
Everything else is MCP-handled.

### MCP Workflow Pattern for the AI
When building each phase, the AI should follow this pattern:
```
1. Use MCP to check if the table/function already exists (query information_schema)
2. Use MCP to execute the CREATE TABLE / CREATE FUNCTION / CREATE POLICY SQL
3. Verify with MCP by querying the created object
4. Regenerate src/types/database.types.ts from the confirmed schema
5. Move on to the next step
```

---

## 3. Tech Stack

### Frontend
| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.x | UI framework |
| `react-dom` | ^18.x | DOM rendering |
| `react-router-dom` | ^6.x | Client-side routing |
| `vite` | ^5.x | Build tool |
| `tailwindcss` | ^3.x | Mobile-first utility CSS |
| `@tailwindcss/forms` | latest | Styled form elements |
| `tailwindcss-safe-area` | latest | iPhone notch/home-bar padding |
| `framer-motion` | ^11.x | Slide-up sheets, swipe gestures |
| `react-hot-toast` | ^2.x | Toast notifications |
| `date-fns` | ^3.x | Date formatting and comparisons |
| `react-icons` | ^5.x | Icons (use `ri` set throughout) |
| `zustand` | ^4.x | Auth + UI state |
| `@tanstack/react-query` | ^5.x | All server state and caching |
| `recharts` | ^2.x | Analytics charts |
| `react-hook-form` | ^7.x | Form state and validation |
| `zod` | ^3.x | Schema validation |
| `typescript` | ^5.x | Type safety |

### Supabase
| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.x | Client for auth + db + realtime |
| `@supabase/auth-ui-react` | ^0.4.x | Pre-built auth UI |
| `@supabase/auth-ui-shared` | ^0.1.x | Auth UI theming |

### Supabase Platform Services
| Service | Purpose |
|---|---|
| **Auth** | Email/password + Google OAuth, session management |
| **Database** | PostgreSQL — all data, triggers, functions, cron jobs |
| **Realtime** | Live sync across tabs and devices |
| **Edge Functions** | Daily reset + weekly review (Deno serverless) |
| **pg_cron** | Scheduled jobs (midnight reset, overdue detection, weekly build) |
| **pg_net** | HTTP calls from pg_cron to Edge Functions |

### Hosting
| Layer | Service |
|---|---|
| Frontend | Vercel (free) |
| Backend / DB / Auth | Supabase (free tier) |

---

## 4. Project Structure

```
focusos/
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Router + QueryClient + auth listener
│   │
│   ├── pages/
│   │   ├── Auth.tsx               # Login/signup (Supabase Auth UI)
│   │   ├── Home.tsx               # Daily snapshot dashboard
│   │   ├── Daily.tsx              # Daily Command Center (main working screen)
│   │   ├── Vault.tsx              # Master Task Vault
│   │   ├── Habits.tsx             # Habit Tracker
│   │   ├── Weekly.tsx             # Weekly Review
│   │   ├── Analytics.tsx          # Progress & stats charts
│   │   └── Settings.tsx           # User preferences
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx      # 5-tab nav bar — THE ONLY NAVIGATION
│   │   │   ├── TopBar.tsx         # Page title + optional action button
│   │   │   └── PageShell.tsx      # Wraps every page: TopBar + content + BottomNav
│   │   │
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx       # Priority-striped swipeable card
│   │   │   ├── TaskForm.tsx       # All-fields form inside BottomSheet
│   │   │   ├── TaskList.tsx       # Scrollable list with empty state
│   │   │   ├── PriorityBadge.tsx
│   │   │   ├── CategoryBadge.tsx
│   │   │   └── StatusBadge.tsx
│   │   │
│   │   ├── daily/
│   │   │   ├── DailyTodoItem.tsx  # Checkbox row, swipe-to-complete
│   │   │   ├── DailySection.tsx   # Labelled section wrapper
│   │   │   └── CarryOverBanner.tsx
│   │   │
│   │   ├── habits/
│   │   │   ├── HabitRow.tsx
│   │   │   ├── HabitForm.tsx
│   │   │   └── StreakDots.tsx     # 7-day completion dot row
│   │   │
│   │   ├── weekly/
│   │   │   ├── WeekSummaryCard.tsx
│   │   │   └── ReflectionForm.tsx
│   │   │
│   │   └── ui/
│   │       ├── BottomSheet.tsx    # framer-motion slide-up modal
│   │       ├── FAB.tsx            # Floating action button
│   │       ├── EmptyState.tsx     # Illustration + CTA for empty lists
│   │       ├── Skeleton.tsx       # Loading placeholders
│   │       ├── Toggle.tsx         # iOS-style checkbox toggle
│   │       ├── ProgressRing.tsx   # SVG circular progress indicator
│   │       └── DateChip.tsx       # "Today" / "Tomorrow" / "Overdue" pill
│   │
│   ├── hooks/
│   │   ├── useAuth.ts             # Supabase session state
│   │   ├── useTasks.ts            # React Query hooks: tasks CRUD + pin toggle
│   │   ├── useDaily.ts            # React Query hooks: daily todos
│   │   ├── useHabits.ts           # React Query hooks: habits + logs
│   │   ├── useWeekly.ts           # React Query hooks: weekly reviews
│   │   ├── useAnalytics.ts        # React Query hooks: chart data queries
│   │   └── useRealtime.ts         # Supabase Realtime channel subscriptions
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Typed Supabase client singleton
│   │   ├── dates.ts               # date-fns helpers (isToday, dayOfYear, etc.)
│   │   └── constants.ts           # Priority colors, categories, 30 daily quotes
│   │
│   └── types/
│       ├── database.types.ts      # Generated from Supabase schema (see below)
│       └── index.ts               # App-level types (Task, DailyTodo, Habit, etc.)
│
├── supabase/
│   └── functions/                 # Edge Functions — deployed via CLI only
│       ├── daily-reset/
│       │   └── index.ts
│       ├── weekly-review/
│       │   └── index.ts
│       └── send-notification/
│           └── index.ts
│
├── public/
│   ├── manifest.json              # PWA config
│   └── sw.js                      # Service worker
│
├── .env.local
├── .env.example
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

> **Note:** No `supabase/migrations/` folder is needed. The Supabase MCP executes all schema
> SQL directly. If you want version control of the schema, copy the executed SQL into a
> `supabase/schema-history/` folder as documentation — but it's optional.

---

## 5. Environment Variables

```env
# .env.local — frontend only (safe to expose, anon key is designed to be public)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Edge Function secrets — set via CLI, never in .env.local
# supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
# supabase secrets set VAPID_PUBLIC_KEY=...
# supabase secrets set VAPID_PRIVATE_KEY=...
```

Retrieve `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from:
Supabase Dashboard → Project → Settings → API → Project URL + anon/public key.

---

## 6. Supabase Client Setup

### `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,      // keeps session alive across page reloads
      detectSessionInUrl: true,  // handles OAuth redirect tokens
    },
  }
)
```

### `src/App.tsx` — Auth listener
```typescript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

// Inside App component:
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session)  navigate('/')
    if (event === 'SIGNED_OUT')            navigate('/auth')
  })
  return () => subscription.unsubscribe()
}, [navigate])
```

### TypeScript type generation
After each schema change, regenerate types using one of:
```bash
# Option A: Supabase CLI (if installed)
supabase gen types typescript --project-id YOUR_REF > src/types/database.types.ts

# Option B: Via MCP — AI introspects information_schema and writes the types file manually
# The AI should query: SELECT column_name, data_type, is_nullable
# FROM information_schema.columns WHERE table_schema = 'public'
# Then write the Database type interface to src/types/database.types.ts
```

---

## 7. Database Schema

> **For the AI:** Execute each SQL block via Supabase MCP in order.
> Before executing, check `information_schema.tables` to confirm the table doesn't already exist.
> After executing, verify the table exists and has the correct columns before moving on.

### Step 1 — Enable Required Extensions
```sql
-- Run once. pg_cron and pg_net are needed for scheduled jobs.
-- If already enabled, these are safe no-ops.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```
> **Note:** pg_cron and pg_net must also be enabled via the Supabase Dashboard under
> **Database → Extensions**. The SQL alone may not be sufficient — confirm in the dashboard.

### Step 2 — Shared Utility Function
```sql
-- Auto-updates updated_at on any row change. Used by tasks and weekly_reviews tables.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Step 3 — Profiles Table
```sql
-- Extends Supabase's built-in auth.users with app-specific preferences.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  theme       TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notif_time  TIME DEFAULT '08:00:00',
  notif_on    BOOLEAN DEFAULT TRUE,
  push_subscription JSONB,        -- web push subscription object
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 4 — Tasks Table (Master Vault)
```sql
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'personal'
                    CHECK (category IN ('college', 'personal', 'skill')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status          TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started', 'in_progress', 'done')),
  due_date        DATE,
  description     TEXT,
  resources_url   TEXT,
  energy_level    TEXT CHECK (energy_level IN ('deep_work', 'quick_task')),
  pin_to_today    BOOLEAN NOT NULL DEFAULT FALSE,
  is_overdue      BOOLEAN NOT NULL DEFAULT FALSE,
  auto_escalate   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS tasks_user_id_idx      ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx     ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_pin_today_idx    ON public.tasks(pin_to_today) WHERE pin_to_today = TRUE;
CREATE INDEX IF NOT EXISTS tasks_overdue_idx      ON public.tasks(is_overdue)   WHERE is_overdue = TRUE;
```

### Step 5 — Daily Todos Table
```sql
CREATE TABLE IF NOT EXISTS public.daily_todos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  habit_id    UUID,   -- FK to habits added after habits table is created (Step 7)
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('pinned', 'due_today', 'habit', 'adhoc')),
  done        BOOLEAN NOT NULL DEFAULT FALSE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  priority    TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  category    TEXT CHECK (category IN ('college', 'personal', 'skill')),
  carry_over  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate task entries per user per day
  UNIQUE (user_id, task_id, date)
);

CREATE INDEX IF NOT EXISTS daily_user_date_idx ON public.daily_todos(user_id, date);
CREATE INDEX IF NOT EXISTS daily_task_id_idx   ON public.daily_todos(task_id);
```

### Step 6 — Habits + Habit Logs Tables
```sql
CREATE TABLE IF NOT EXISTS public.habits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  icon         TEXT DEFAULT '✅',
  frequency    TEXT NOT NULL DEFAULT 'daily'
                 CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom')),
  custom_days  TEXT[] DEFAULT '{}',   -- e.g. ARRAY['mon', 'wed', 'fri']
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (habit_id, date)
);

CREATE INDEX IF NOT EXISTS habits_user_idx      ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS habit_logs_user_date ON public.habit_logs(user_id, date);
```

### Step 7 — Wire Habits FK + Unique Constraint to Daily Todos
```sql
-- Add the FK from daily_todos.habit_id → habits.id (couldn't do this in Step 5)
ALTER TABLE public.daily_todos
  ADD CONSTRAINT IF NOT EXISTS daily_todos_habit_fk
  FOREIGN KEY (habit_id) REFERENCES public.habits(id) ON DELETE SET NULL;

-- Unique constraint for habit deduplication per day
ALTER TABLE public.daily_todos
  ADD CONSTRAINT IF NOT EXISTS daily_todos_unique_habit_per_day
  UNIQUE (user_id, habit_id, date);
```

### Step 8 — Weekly Reviews Table
```sql
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start       DATE NOT NULL,     -- always the Monday of that week
  completion_rate  NUMERIC(5,2),
  tasks_completed  INTEGER DEFAULT 0,
  tasks_missed     INTEGER DEFAULT 0,
  wins             TEXT,
  blockers         TEXT,
  next_priorities  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE TRIGGER weekly_reviews_updated_at
  BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 8. Row Level Security (RLS) Policies

> **For the AI:** Execute these via MCP immediately after creating each table.
> Never skip RLS — without it any authenticated user can read everyone's data.
> The service role key used in Edge Functions bypasses RLS automatically.

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_todos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

-- profiles: only own row
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- tasks: full CRUD on own rows only
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- daily_todos: full CRUD on own rows only
CREATE POLICY "daily_select" ON public.daily_todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_insert" ON public.daily_todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_update" ON public.daily_todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "daily_delete" ON public.daily_todos FOR DELETE USING (auth.uid() = user_id);

-- habits, habit_logs, weekly_reviews: all-in-one policies
CREATE POLICY "habits_all"       ON public.habits       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "habit_logs_all"   ON public.habit_logs   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "weekly_all"       ON public.weekly_reviews FOR ALL USING (auth.uid() = user_id);
```

---

## 9. Database Functions & Triggers

> **For the AI:** Execute these via MCP after all tables and RLS are confirmed.
> These are the core automation engine — no client-side logic duplicates them.

### Trigger A — Pin to Today ↔ Daily Entry (create + remove)
```sql
CREATE OR REPLACE FUNCTION handle_pin_to_today()
RETURNS TRIGGER AS $$
BEGIN
  -- User toggled pin ON → create daily_todo entry for today
  IF NEW.pin_to_today = TRUE AND OLD.pin_to_today = FALSE THEN
    INSERT INTO public.daily_todos (user_id, task_id, title, type, done, date, priority, category)
    VALUES (NEW.user_id, NEW.id, NEW.title, 'pinned', FALSE, CURRENT_DATE, NEW.priority, NEW.category)
    ON CONFLICT (user_id, task_id, date) DO NOTHING;  -- idempotent
  END IF;

  -- User toggled pin OFF → remove the unfinished entry from today
  IF NEW.pin_to_today = FALSE AND OLD.pin_to_today = TRUE THEN
    DELETE FROM public.daily_todos
    WHERE task_id = NEW.id AND date = CURRENT_DATE AND done = FALSE AND type = 'pinned';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_pin_change ON public.tasks;
CREATE TRIGGER on_task_pin_change
  AFTER UPDATE OF pin_to_today ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION handle_pin_to_today();
```

### Trigger B — Daily Todo Complete → Sync Master Task + Habit Log
```sql
CREATE OR REPLACE FUNCTION handle_daily_todo_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Checking done = TRUE
  IF NEW.done = TRUE AND OLD.done = FALSE THEN

    -- Sync back to master task
    IF NEW.task_id IS NOT NULL THEN
      UPDATE public.tasks
      SET status = 'done', pin_to_today = FALSE, updated_at = NOW()
      WHERE id = NEW.task_id;
    END IF;

    -- Sync to habit log
    IF NEW.type = 'habit' AND NEW.habit_id IS NOT NULL THEN
      UPDATE public.habit_logs
      SET completed = TRUE
      WHERE habit_id = NEW.habit_id AND date = NEW.date;
    END IF;

  END IF;

  -- Un-checking (done = FALSE again)
  IF NEW.done = FALSE AND OLD.done = TRUE THEN
    IF NEW.task_id IS NOT NULL THEN
      UPDATE public.tasks SET status = 'in_progress', updated_at = NOW()
      WHERE id = NEW.task_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_daily_todo_done ON public.daily_todos;
CREATE TRIGGER on_daily_todo_done
  AFTER UPDATE OF done ON public.daily_todos
  FOR EACH ROW EXECUTE FUNCTION handle_daily_todo_complete();
```

### Trigger C — Task Title/Priority Change → Update Today's Daily List
```sql
CREATE OR REPLACE FUNCTION sync_task_changes_to_daily()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title <> OLD.title OR NEW.priority <> OLD.priority THEN
    UPDATE public.daily_todos
    SET title = NEW.title, priority = NEW.priority
    WHERE task_id = NEW.id AND date = CURRENT_DATE AND done = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_title_priority_change ON public.tasks;
CREATE TRIGGER on_task_title_priority_change
  AFTER UPDATE OF title, priority ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION sync_task_changes_to_daily();
```

---

## 10. Scheduled Jobs (pg_cron)

> **For the AI:** Execute these via MCP after confirming pg_cron and pg_net extensions are active.
> Also set `app.settings.supabase_url` and `app.settings.service_role_key` in Supabase
> Dashboard → Database → Configuration → Custom config parameters before running these.

```sql
-- JOB 1: Daily Reset — 00:01 every night
-- Calls the daily-reset Edge Function: carry-over + habit injection + due-today surfacing
SELECT cron.schedule(
  'focusos-daily-reset',
  '1 0 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/daily-reset',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  )
  $$
);

-- JOB 2: Overdue Detection — 07:00 every morning (pure SQL, no edge function)
SELECT cron.schedule(
  'focusos-overdue-detection',
  '0 7 * * *',
  $$
  UPDATE public.tasks
  SET is_overdue = TRUE
  WHERE due_date < CURRENT_DATE AND status != 'done' AND is_overdue = FALSE;
  $$
);

-- JOB 3: Priority Escalation — 08:00 every morning (pure SQL)
SELECT cron.schedule(
  'focusos-priority-escalation',
  '0 8 * * *',
  $$
  UPDATE public.tasks
  SET priority = 'critical'
  WHERE priority = 'high'
    AND status != 'done'
    AND due_date <= CURRENT_DATE + INTERVAL '2 days'
    AND auto_escalate = TRUE;
  $$
);

-- JOB 4: Weekly Review Builder — 20:00 every Sunday
SELECT cron.schedule(
  'focusos-weekly-review',
  '0 20 * * 0',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-review',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  )
  $$
);
```

To verify jobs were created:
```sql
SELECT jobname, schedule, command FROM cron.job;
```

---

## 11. Edge Functions

> These are the only parts that **cannot** use the MCP. Deploy via Supabase CLI:
> ```bash
> supabase functions deploy daily-reset
> supabase functions deploy weekly-review
> supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
> ```

### `supabase/functions/daily-reset/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!   // bypasses RLS — runs for all users
  )

  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const dayName   = ['sun','mon','tue','wed','thu','fri','sat'][new Date().getDay()]
  const isWeekday = !['sat','sun'].includes(dayName)
  const isWeekend = ['sat','sun'].includes(dayName)

  const { data: users } = await supabase.from('profiles').select('id')

  for (const user of users ?? []) {
    const uid = user.id

    // 1. Carry over unfinished non-habit todos from yesterday
    const { data: unfinished } = await supabase
      .from('daily_todos')
      .select('*')
      .eq('user_id', uid).eq('date', yesterday).eq('done', false).neq('type', 'habit')

    for (const todo of unfinished ?? []) {
      await supabase.from('daily_todos').upsert({
        user_id: uid, task_id: todo.task_id, title: todo.title,
        type: todo.type, done: false, date: today,
        priority: todo.priority, category: todo.category, carry_over: true,
      }, { onConflict: 'user_id,task_id,date' })
    }

    // 2. Surface tasks due today not already in the list
    const { data: dueTasks } = await supabase
      .from('tasks').select('id, title, priority, category')
      .eq('user_id', uid).eq('due_date', today).neq('status', 'done')

    for (const task of dueTasks ?? []) {
      await supabase.from('daily_todos').upsert({
        user_id: uid, task_id: task.id, title: task.title,
        type: 'due_today', done: false, date: today,
        priority: task.priority, category: task.category,
      }, { onConflict: 'user_id,task_id,date' })
    }

    // 3. Inject habits matching today's frequency
    const { data: habits } = await supabase
      .from('habits').select('*').eq('user_id', uid).eq('active', true)

    for (const habit of habits ?? []) {
      const include =
        habit.frequency === 'daily' ||
        (habit.frequency === 'weekdays' && isWeekday) ||
        (habit.frequency === 'weekends' && isWeekend) ||
        (habit.frequency === 'custom'   && habit.custom_days?.includes(dayName))

      if (!include) continue

      await supabase.from('daily_todos').upsert({
        user_id: uid, habit_id: habit.id, title: habit.name,
        type: 'habit', done: false, date: today,
      }, { onConflict: 'user_id,habit_id,date' })

      await supabase.from('habit_logs').upsert({
        habit_id: habit.id, user_id: uid, date: today, completed: false,
      }, { onConflict: 'habit_id,date' })
    }
  }

  return new Response(JSON.stringify({ ok: true, date: today }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### `supabase/functions/weekly-review/index.ts`
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Last Monday → last Sunday
  const now = new Date()
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - now.getDay() - 6)
  const weekStart = lastMonday.toISOString().split('T')[0]
  const weekEnd   = new Date(lastMonday.getTime() + 6 * 86400000).toISOString().split('T')[0]

  const { data: users } = await supabase.from('profiles').select('id')

  for (const user of users ?? []) {
    const uid = user.id

    const { count: completed } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid).eq('status', 'done')
      .gte('updated_at', weekStart).lte('updated_at', weekEnd)

    const { count: missed } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid).neq('status', 'done')
      .gte('due_date', weekStart).lte('due_date', weekEnd)

    const total = (completed ?? 0) + (missed ?? 0)
    const rate  = total > 0 ? Math.round(((completed ?? 0) / total) * 100) : 0

    await supabase.from('weekly_reviews').upsert({
      user_id: uid, week_start: weekStart,
      tasks_completed: completed ?? 0,
      tasks_missed: missed ?? 0,
      completion_rate: rate,
    }, { onConflict: 'user_id,week_start' })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

## 12. Pages & Screens

### Auth (`/auth`)
Full-screen, no nav. Uses `@supabase/auth-ui-react`:
```tsx
<Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} />
```
Handles sign-up, sign-in, Google OAuth, magic link, password reset — zero custom code.

---

### Home Dashboard (`/`)
Scrollable feed. No horizontal scroll.
1. Greeting: "Good morning, [Name]" + today's full date
2. Daily quote: 30 quotes in `constants.ts`, selected by `dayOfYear % 30`
3. Stats row (3 chips): tasks today / habits done / overdue count
4. `ProgressRing`: completed tasks / total today
5. Quick-access cards: large tappable links to Daily, Vault, Habits

---

### Daily Command Center (`/daily`)
Sticky date header with "X/Y done" count. Three sections:

**🎯 Today's Priorities**
`daily_todos` where `date = today AND type IN ('pinned', 'due_today')`.
Sorted: critical → high → medium → low.
Row: checkbox + title + priority badge + category badge.
Tap to expand: description + resources URL link.
Swipe right (framer-motion drag): marks done.
`CarryOverBanner` at top when any `carry_over = TRUE` items exist.

**🌿 Habits**
`daily_todos` where `date = today AND type = 'habit'`.
Row: emoji icon + name + checkbox.

**✅ Ad-hoc**
Inline `+` → text input appears inline → creates `daily_todos` row with `type = 'adhoc'`.

---

### Master Task Vault (`/vault`)
Sticky filter bar. Scrollable task cards.

Filter pills: `All` | `🎓 College` | `🧠 Personal` | `💡 Skill` | `🔴 Overdue`
Sort: Priority | Due Date | Created
Tabs: `All Tasks` | `This Week` | `By Category` | `Overdue`

Task card: priority left-stripe + title + badges + `Pin to Today` Toggle.
FAB → `TaskForm` BottomSheet.

---

### Habit Tracker (`/habits`)
Today's habits checklist at top. Below: all habits with 7-day `StreakDots` + monthly % badge.
FAB → `HabitForm` BottomSheet (name, emoji, frequency, custom days checkboxes).

---

### Weekly Review (`/weekly`)
Auto-populated (from `weekly_reviews` table):
- Week range + completion rate badge (green ≥70%, amber 40–69%, red <40%)
- Completed count + missed count
- Expandable completed task list grouped by category

User-fillable (saves on blur):
- 🏆 Wins this week
- 🚧 Blockers
- 🎯 Top 3 priorities for next week

---

### Analytics (`/analytics`)
Charts via Recharts:
- Bar chart: tasks completed per day, last 7 days
- Donut chart: category split %
- Line chart: weekly completion rate, last 4 weeks
- Habit heatmap: 30-day CSS dot grid per active habit

Stat cards: all-time completed / longest streak / best week / most productive day

---

### Settings (`/settings`)
- Profile: name + email update
- Notifications: toggle + time picker → saves to `profiles`
- Theme: Light/Dark/System → `profiles.theme` + `document.documentElement.classList`
- Data export: query all user tables → download `.json`
- Sign out: `supabase.auth.signOut()`

---

## 13. Components Library

### `BottomSheet.tsx`
```
framer-motion: initial={{ y: '100%' }} → animate={{ y: 0 }) → exit{{ y: '100%' }}
spring transition: damping 30, stiffness 300
Drag handle bar: w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4
Backdrop: fixed inset-0 bg-black/40, onClick = onClose
Use AnimatePresence for mount/unmount
All forms (task, habit) render inside this
```

### `TaskCard.tsx`
```
Left priority stripe: border-l-4 + priority color class
Pin to Today: <Toggle> component, onChange calls usePinTask (optimistic)
Tap anywhere else: opens edit BottomSheet
Priority badge + category badge + DateChip + StatusBadge in a flex row
```

### `TaskForm.tsx` — field order
1. Title (text, autofocus, required)
2. Category (3-button segmented: College / Personal / Skill)
3. Priority (4-button grid with color: Critical / High / Medium / Low)
4. Due Date (`<input type="date">`, native mobile date picker)
5. Description (textarea, hidden behind "Add description ▾" toggle)
6. Resources URL (text, hidden behind "Add link ▾" toggle)
7. Energy Level (2-button: Deep Work / Quick Task)
8. Pin to Today (iOS `Toggle`)
9. Submit button

### `Toggle.tsx` — iOS-style
```
Outer div: w-11 h-6 rounded-full transition-colors
  checked → bg-blue-500   unchecked → bg-gray-200 dark:bg-gray-700
Inner dot: w-5 h-5 bg-white rounded-full shadow transition-transform
  checked → translate-x-5  unchecked → translate-x-0
```

### `StreakDots.tsx`
```
Props: completedDates: string[], size?: 'sm'|'md'
Render last 7 dates as circles
Filled (bg-blue-500) = date in completedDates array
Empty (border border-gray-300) = missed
Future dates: opacity-30
```

### `ProgressRing.tsx`
```
SVG two circles: bg track + colored arc
stroke-dashoffset = circumference * (1 - progress/100)
framer-motion animate strokeDashoffset on mount
Center text: "X/Y" or "X%"
Props: progress (0–100), size (default 80), strokeWidth (default 8)
```

### `DateChip.tsx`
```
Uses date-fns: isToday, isTomorrow, isPast, differenceInDays
"Today"      → bg-blue-50 text-blue-600
"Tomorrow"   → bg-gray-50 text-gray-600
"In X days"  → bg-gray-50 text-gray-500
"Overdue"    → bg-red-50 text-red-600
```

---

## 14. Automations & Business Logic

### Complete Automation Map

| # | Trigger | Runs in | What happens |
|---|---|---|---|
| 1 | `tasks.pin_to_today` → TRUE | DB Trigger A | `daily_todos` row inserted for today |
| 2 | `tasks.pin_to_today` → FALSE | DB Trigger A | Unfinished pinned `daily_todos` row deleted |
| 3 | `daily_todos.done` → TRUE | DB Trigger B | `tasks.status = 'done'`, `pin_to_today = FALSE` |
| 4 | `daily_todos.done` → TRUE (habit) | DB Trigger B | `habit_logs.completed = TRUE` for today |
| 5 | `daily_todos.done` → FALSE | DB Trigger B | `tasks.status = 'in_progress'` (undo support) |
| 6 | `tasks.title` or `.priority` changes | DB Trigger C | Today's `daily_todos` rows updated |
| 7 | 00:01 every night | Edge Fn (daily-reset) | Carry-over + habit inject + due-today surface |
| 8 | 07:00 every morning | pg_cron SQL | `is_overdue = TRUE` on past-due tasks |
| 9 | 08:00 every morning | pg_cron SQL | High → Critical if due within 2 days |
| 10 | 20:00 every Sunday | Edge Fn (weekly-review) | Weekly stats computed, review row upserted |

### Realtime Sync (`hooks/useRealtime.ts`)
Call once in `App.tsx` after authentication. Keeps all React Query caches live.
```typescript
export function useRealtimeSync(userId: string) {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel(`focusos-${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'daily_todos',
        filter: `user_id=eq.${userId}`,
      }, () => qc.invalidateQueries({ queryKey: ['daily'] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tasks',
        filter: `user_id=eq.${userId}`,
      }, () => qc.invalidateQueries({ queryKey: ['tasks'] }))
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'habit_logs',
        filter: `user_id=eq.${userId}`,
      }, () => qc.invalidateQueries({ queryKey: ['habits'] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, qc])
}
```
Enable Realtime in dashboard: **Database → Replication → Supabase Realtime** → add `tasks`, `daily_todos`, `habit_logs`.

---

## 15. React Query + Supabase Hooks

### `hooks/useTasks.ts`
```typescript
// Fetch with filters
export function useTasks(filters?: { category?: string; overdue?: boolean }) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let q = supabase.from('tasks').select('*')
        .order('priority').order('due_date', { nullsFirst: false })
      if (filters?.category) q = q.eq('category', filters.category)
      if (filters?.overdue)  q = q.eq('is_overdue', true)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

// Pin toggle — DB trigger handles all downstream effects
export function usePinTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from('tasks').update({ pin_to_today: pinned }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      // Optimistic update — feels instant on mobile
      await qc.cancelQueries({ queryKey: ['tasks'] })
      qc.setQueryData(['tasks', undefined], (old: Task[] = []) =>
        old.map(t => t.id === id ? { ...t, pin_to_today: pinned } : t)
      )
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily'] })
    },
  })
}
```

### `hooks/useDaily.ts`
```typescript
// Fetch today's list, joining task details for expand-row
export function useDaily(date = new Date().toISOString().split('T')[0]) {
  return useQuery({
    queryKey: ['daily', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_todos')
        .select('*, tasks(description, resources_url)')
        .eq('date', date)
        .order('carry_over', { ascending: false })  // carry-overs first
        .order('priority')
      if (error) throw error
      return data
    },
    staleTime: 30_000,
  })
}

// Toggle done — DB trigger B handles master task sync
export function useToggleDone() {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from('daily_todos').update({ done }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ['daily', today] })
      qc.setQueryData(['daily', today], (old: DailyTodo[] = []) =>
        old.map(t => t.id === id ? { ...t, done } : t)
      )
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily', today] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

---

## 16. Implementation Checklist

Work through phases in strict order. Each phase must be tested before moving to the next.

> **AI note:** In every database phase, use the Supabase MCP to execute the SQL directly.
> Do not write migration files unless the user specifically asks for schema version control.
> Verify each operation succeeded before marking the checklist item complete.

---

### Phase 0 — Project Scaffolding
- [ ] `npm create vite@latest focusos -- --template react-ts`
- [ ] Install all frontend packages from Section 3
- [ ] Configure `tailwind.config.ts`: content paths, `darkMode: 'class'`, add `tailwindcss-safe-area` plugin
- [ ] Create `src/lib/supabase.ts` from Section 6
- [ ] Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase dashboard
- [ ] Create `.env.example` with placeholder values (safe to commit)
- [ ] Create `public/manifest.json` (name, short_name, display: standalone, theme_color, icons placeholders)
- [ ] Create stub `public/sw.js` service worker and register it in `src/main.tsx`
- [ ] Wrap `<App>` with `<QueryClientProvider>` and `<BrowserRouter>` in `main.tsx`
- [ ] **Test:** `npm run dev` starts, Supabase client initializes without console errors.

---

### Phase 1 — Supabase Database Setup (via MCP)
- [ ] **Via MCP:** Execute Step 1 — enable `pg_cron` and `pg_net` extensions
- [ ] Confirm extensions are active in Supabase Dashboard (Database → Extensions)
- [ ] **Via MCP:** Execute Step 2 — `update_updated_at()` shared utility function
- [ ] **Via MCP:** Execute Step 3 — `profiles` table + `handle_new_user` trigger
- [ ] **Via MCP:** Execute Step 4 — `tasks` table + indexes + `tasks_updated_at` trigger
- [ ] **Via MCP:** Execute Step 5 — `daily_todos` table + indexes
- [ ] **Via MCP:** Execute Step 6 — `habits` + `habit_logs` tables + indexes
- [ ] **Via MCP:** Execute Step 7 — wire `habit_id` FK + unique constraint to `daily_todos`
- [ ] **Via MCP:** Execute Step 8 — `weekly_reviews` table + trigger
- [ ] **Via MCP:** Execute all RLS policies from Section 8
- [ ] **Via MCP:** Verify all 6 tables exist with correct columns: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
- [ ] Generate `src/types/database.types.ts` (CLI or manual from schema)
- [ ] **Test:** Query each table from Supabase dashboard → empty tables, no errors.

---

### Phase 2 — Auth
- [ ] Enable Email Auth in Supabase Dashboard (Authentication → Providers → Email)
- [ ] Optionally enable Google OAuth (Authentication → Providers → Google → add credentials)
- [ ] Build `Auth.tsx` page using `<Auth>` component from `@supabase/auth-ui-react`
- [ ] Build `hooks/useAuth.ts`: expose `user`, `loading`, `signOut` via `onAuthStateChange`
- [ ] Add route guard in `App.tsx`: no session → `/auth`, session → `/`
- [ ] **Test:** Sign up → `profiles` row auto-created. Sign in, sign out, Google OAuth all work.

---

### Phase 3 — Master Task Vault (CRUD)
- [ ] Build `PriorityBadge.tsx`, `CategoryBadge.tsx`, `StatusBadge.tsx`, `DateChip.tsx`
- [ ] Build `Toggle.tsx` iOS-style component
- [ ] Build `BottomSheet.tsx` with framer-motion slide + drag-to-dismiss
- [ ] Build `TaskForm.tsx` with all 9 fields inside `BottomSheet`
- [ ] Build `TaskCard.tsx` with priority stripe, badges, pin toggle
- [ ] Build `TaskList.tsx`, `EmptyState.tsx`, `FAB.tsx`
- [ ] Build `hooks/useTasks.ts`: `useTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `usePinTask`
- [ ] Build `BottomNav.tsx` (5 tabs using `NavLink`, active state with filled icon)
- [ ] Build `PageShell.tsx` (TopBar + page content + BottomNav + safe-area padding)
- [ ] Build `Vault.tsx` page: filter pills, sort dropdown, TaskList, FAB
- [ ] **Test:** Create, edit, delete, filter, sort all work. Pin toggle updates DB.

---

### Phase 4 — DB Triggers (via MCP) + Daily List
- [ ] **Via MCP:** Execute Trigger A (`handle_pin_to_today`) from Section 9
- [ ] **Via MCP:** Execute Trigger B (`handle_daily_todo_complete`) from Section 9
- [ ] **Via MCP:** Execute Trigger C (`sync_task_changes_to_daily`) from Section 9
- [ ] **Via MCP:** Verify triggers exist: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public'`
- [ ] Build `DailyTodoItem.tsx` with checkbox + swipe-right gesture (framer-motion)
- [ ] Build `DailySection.tsx` section wrapper component
- [ ] Build `CarryOverBanner.tsx`
- [ ] Build `hooks/useDaily.ts`: `useDaily`, `useToggleDone`, `useAddAdhocTodo`
- [ ] Build `Daily.tsx` page: 3 sections (Priorities, Habits placeholder, Ad-hoc inline input)
- [ ] **Test:** Pin task in Vault → row appears in Daily instantly (trigger fired). Unpin → disappears.
- [ ] **Test:** Check off daily item → task.status = 'done' in Vault (no client code needed — trigger).
- [ ] **Test:** Edit task title → daily list updates without refresh.

---

### Phase 5 — Realtime Sync
- [ ] Enable Realtime in Supabase Dashboard (Database → Replication → add `tasks`, `daily_todos`, `habit_logs`)
- [ ] Build `hooks/useRealtime.ts` from Section 14
- [ ] Call `useRealtimeSync(user.id)` in `App.tsx` after auth
- [ ] **Test:** Open app in two browser tabs. Pin task in tab 1 → appears in Daily tab 2 in ~1 second.

---

### Phase 6 — Habits System
- [ ] Build `StreakDots.tsx`, `HabitRow.tsx`, `HabitForm.tsx`
- [ ] Build `hooks/useHabits.ts`: `useHabits`, `useCreateHabit`, `useUpdateHabit`, `useDeleteHabit`, `useToggleHabitLog`
- [ ] Build `Habits.tsx` page: today's checklist + all habits list + FAB
- [ ] Add Habits section to `Daily.tsx` (query `daily_todos` where `type = 'habit'`)
- [ ] **Test:** Create habit → appears in Habits page. Check off → `habit_logs` updated. Streak dots correct.

---

### Phase 7 — Daily Reset Edge Function + Cron
- [ ] Write `supabase/functions/daily-reset/index.ts` from Section 11
- [ ] Deploy: `supabase functions deploy daily-reset`
- [ ] Set secret: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key`
- [ ] Set DB config params in Supabase Dashboard: `app.settings.supabase_url` + `app.settings.service_role_key`
- [ ] **Via MCP:** Execute cron job 1 (daily-reset) from Section 10
- [ ] **Via MCP:** Verify job created: `SELECT jobname FROM cron.job`
- [ ] Update `CarryOverBanner.tsx` to show count, add `carry_over` badge to `DailyTodoItem`
- [ ] **Test:** Manually POST to edge function URL → habits injected, carry-over items appear tomorrow.

---

### Phase 8 — Overdue + Priority Escalation
- [ ] **Via MCP:** Execute cron jobs 2 and 3 (overdue-detection + priority-escalation) from Section 10
- [ ] Add Overdue filter pill to Vault filter row (queries `is_overdue = true`)
- [ ] Add red overdue badge to `TaskCard.tsx` when `is_overdue = true`
- [ ] **Test:** Manually run `UPDATE tasks SET due_date = '2020-01-01'` via MCP → overdue job runs → badge appears.

---

### Phase 9 — Home Dashboard
- [ ] Build `ProgressRing.tsx` SVG with framer-motion mount animation
- [ ] Add 30 motivational quotes to `src/lib/constants.ts`, select with `dayOfYear % 30`
- [ ] Build `Home.tsx`: greeting, quote, stats chips, progress ring, quick-access cards
- [ ] Stats chips: count from `daily_todos`, `habit_logs`, `tasks` for today's date
- [ ] **Test:** Stats show correct counts. Progress ring animates on mount.

---

### Phase 10 — Weekly Review
- [ ] Write `supabase/functions/weekly-review/index.ts` from Section 11
- [ ] Deploy: `supabase functions deploy weekly-review`
- [ ] **Via MCP:** Execute cron job 4 (weekly-review) from Section 10
- [ ] Build `hooks/useWeekly.ts`: fetch current week, update reflection on blur
- [ ] Build `WeekSummaryCard.tsx` with color-coded completion rate badge
- [ ] Build `ReflectionForm.tsx` with 3 textarea fields + auto-save on blur
- [ ] Build `Weekly.tsx` page
- [ ] **Test:** Manually invoke edge function → `weekly_reviews` row created with stats. Fill reflection → saved.

---

### Phase 11 — Analytics
- [ ] Build `hooks/useAnalytics.ts` with separate queries for each chart
- [ ] Build `Analytics.tsx` with 4 Recharts charts + 4 stat cards
- [ ] Habit heatmap: custom 30×habits CSS grid (no library needed)
- [ ] **Test:** Complete tasks across different days → all charts reflect real data.

---

### Phase 12 — Settings + Notifications
- [ ] Build `Settings.tsx` with all sections from Section 12
- [ ] Theme toggle: save to `profiles.theme`, toggle `dark` class on `<html>`
- [ ] Data export: query all 5 user tables, `JSON.stringify`, trigger `.json` download
- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Set secrets: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`
- [ ] Write `supabase/functions/send-notification/index.ts`
- [ ] Add `push` event handler to `public/sw.js`
- [ ] Request push permission on Settings toggle (not on first load)
- [ ] **Via MCP:** Add `push_subscription JSONB` column to `profiles` if not already present
- [ ] Build `Skeleton.tsx` and add to all list pages
- [ ] Wire `react-hot-toast` to all mutations (success + error variants)

---

### Phase 13 — PWA + Polish + Deployment
- [ ] Lazy load all pages: `const Daily = lazy(() => import('./pages/Daily'))`
- [ ] Wrap all lazy pages in `<Suspense fallback={<Skeleton />}>`
- [ ] Add React error boundaries to all page-level routes
- [ ] Complete `public/manifest.json`: 192px + 512px PNG icons, correct `start_url`, `background_color`
- [ ] Add iOS meta tags to `index.html`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- [ ] Service worker: cache app shell for offline load
- [ ] Test safe-area insets: BottomNav clears iPhone home indicator bar
- [ ] Test all pages at 375px, 390px, 430px viewports
- [ ] Deploy to Vercel: `vercel --prod`, add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars
- [ ] Update Supabase Auth → URL Configuration: add production URL to redirect allow-list
- [ ] **Via MCP:** Final check — verify all 6 tables exist, all triggers active, all cron jobs scheduled
- [ ] End-to-end smoke test on mobile browser: register → add task → pin → complete → habit → weekly
- [ ] Lighthouse mobile: target 90+ Performance, 100 PWA

---

## Key Rules for the AI Building This

1. **Use the Supabase MCP for all database operations.** Never ask the user to run SQL manually.
   Verify each operation succeeded before moving on. Use `information_schema` queries to check.

2. **Triggers handle all automations.** The pin-to-today flow, done-sync, and title propagation
   all happen in PostgreSQL triggers. Never replicate trigger logic in `useEffect` or React callbacks.

3. **RLS on every table, always.** Execute RLS policies immediately after creating each table.
   Never ship without them. Service role key in Edge Functions bypasses RLS automatically — never
   expose service role to the frontend.

4. **React Query for all Supabase calls.** Never call Supabase in `useEffect`. Always `useQuery`
   or `useMutation`. Use `onSettled` (not `onSuccess`) to invalidate — ensures refetch on errors too.

5. **Optimistic updates on all toggles.** Pin toggle and done checkbox must feel instant.
   Use `onMutate` to update cache before server responds. Implement `onError` rollback.

6. **Mobile-first, always.** Start at 375px. Add `md:` only where desktop improves the experience.
   Never design desktop-first.

7. **Bottom Sheet for all forms.** No full-page modals. Every create/edit form slides up
   from the bottom using `BottomSheet.tsx`.

8. **Bottom Nav is the only navigation.** No hamburger menu, no sidebar. 5 tabs. One tap to
   any section. Use `NavLink` with active state styling.

9. **No blank screens.** Daily and Vault pages show `Skeleton.tsx` immediately.
   Never show a white screen while loading.

10. **Priority colors:**
    - Critical: `border-red-500 bg-red-50 text-red-700`
    - High: `border-orange-500 bg-orange-50 text-orange-700`
    - Medium: `border-yellow-500 bg-yellow-50 text-yellow-700`
    - Low: `border-green-500 bg-green-50 text-green-700`

11. **Category colors:**
    - College: `bg-blue-50 text-blue-700`
    - Personal: `bg-purple-50 text-purple-700`
    - Skill: `bg-amber-50 text-amber-700`

12. **Automation failures are silent to the user.** If a cron job or edge function fails,
    it must not surface an error to the user. Log server-side only. The user's primary
    action (pin, complete) always succeeds from their perspective.

13. **Edge Functions still need the CLI.** The Supabase MCP cannot deploy Edge Functions.
    Use `supabase functions deploy <name>` and `supabase secrets set` for those steps only.
    Everything else — tables, RLS, triggers, cron jobs — goes through the MCP.
