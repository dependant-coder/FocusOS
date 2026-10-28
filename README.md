# FocusOS — Daily Command Center for College Life

FocusOS is a mobile-first daily productivity and academic command center designed specifically for college students. It combines task management, habit consistency tracking, daily planning triage, focus sessions, weekly reflections, and performance analytics into an installable, offline-first Progressive Web App (PWA).

---

## Screenshots

<!-- Screenshot Placeholders -->
| Today / Daily View | Task Vault | Habit Tracker |
|:---:|:---:|:---:|
| *(Screenshot Placeholder: Daily)* | *(Screenshot Placeholder: Vault)* | *(Screenshot Placeholder: Habits)* |

| Focus Timer | Weekly Review | Analytics Dashboard |
|:---:|:---:|:---:|
| *(Screenshot Placeholder: Focus)* | *(Screenshot Placeholder: Weekly)* | *(Screenshot Placeholder: Analytics)* |

---

## Core Features

- **Daily Command Center (`/daily`)**: Morning greeting, daily progress ring, must-do priorities, frequency-aware daily habit injection, quick-add bar, and smart carry-over triage.
- **Master Task Vault (`/vault`)**: Course, personal, and skill categorization; priority matrices; energy levels; due date chips; search; and bulk triage.
- **Habit Tracker (`/habits`)**: Forgiving streak counts with grace days, 30-day consistency rate, reorderable habits, and frequency schedules (`daily`, `weekdays`, `weekends`, `custom`).
- **Focus Timer (`/focus`, `/focus/run`)**: Fullscreen, distraction-free countdown with screen wake lock, pause/resume tracking, interruption monitoring, and audio completions.
- **Weekly Review (`/weekly`)**: Automated Sunday/Monday synthesis with completion percentages, reflective wins & blockers, and a "Plan Next Week" generator.
- **Analytics (`/analytics`)**: Completion trends, category distribution, 30-day habit heatmaps, and productivity insights.
- **Progressive Web App (PWA)**: Offline-first data caching with TanStack Query, installable on iOS and Android with notch and safe-area compatibility.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS 3, `@tailwindcss/forms`
- **State & Data Fetching**: TanStack React Query 5, Zustand
- **Animations & Icons**: Framer Motion 12, Lucide React
- **Data Visualization**: Recharts
- **Backend & Auth**: Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security, Realtime Publications)
- **Edge Functions**: Deno / Supabase Edge Runtime (`daily-reset`, `weekly-review`, `send-reminders`)
- **PWA**: `vite-plugin-pwa` with Workbox service worker caching

---

## Local Development Setup

### 1. Prerequisites
- Node.js 22+
- npm (Node Package Manager)
- Optional: Supabase CLI (`brew install supabase/tap/supabase` or `npm install -g supabase`)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/dependant-coder/FocusOS.git
cd FocusOS
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
> **Note**: FocusOS includes a transparent in-memory and `localStorage` mock adapter in `src/lib/supabase.ts`. If environment credentials are omitted or empty, the application boots and operates seamlessly in local offline mock mode with seed data.

### 4. Database Setup (Supabase)
To run a local Supabase instance:
```bash
supabase start
supabase db push
```
Or apply the baseline migration `supabase/migrations/0000_baseline.sql` directly in your remote Supabase SQL Editor.

### 5. Start Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## Production Build & Deployment

### Build
Run TypeScript compilation and Vite production build:
```bash
npm run build
```

### Deploying to Vercel
FocusOS can be deployed to Vercel with zero extra configuration:
1. Connect the repository in Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Set environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## Supabase Edge Functions & Cron Schedules

### Edge Functions
- `daily-reset` (`supabase/functions/daily-reset/index.ts`): Carries over unfinished tasks, surfaces tasks due today, and injects scheduled habits into daily todos.
- `weekly-review` (`supabase/functions/weekly-review/index.ts`): Aggregates week completion statistics and pre-populates weekly reflection templates.
- `send-reminders` (`supabase/functions/send-reminders/index.ts`): Dispatches Web Push reminders within user-defined notification windows.

### Deploying Edge Functions
```bash
supabase functions deploy daily-reset
supabase functions deploy weekly-review
supabase functions deploy send-reminders
```

### Setting Up pg_cron Schedules
In Supabase SQL Editor, enable `pg_cron` and schedule:
```sql
-- Hourly timezone-aware daily reset
select cron.schedule('hourly-daily-reset', '0 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT-REF>.functions.supabase.co/daily-reset',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);

-- Hourly timezone-aware weekly review generator
select cron.schedule('hourly-weekly-review', '10 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT-REF>.functions.supabase.co/weekly-review',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);
```

---

## Project Structure

```
FocusOS/
├── docs/                      # Architectural specs, decisions, changelogs, UI docs
│   ├── SCHEMA.md              # Database schema baseline & audit findings
│   ├── DECISIONS.md           # Architecture decision records (ADRs)
│   ├── UI.md                  # Design primitives documentation & usage examples
│   └── CHANGELOG.md           # Phase change summaries
├── public/                    # Static assets, icons, service worker fallback
├── src/
│   ├── components/            # React UI components
│   │   ├── analytics/         # Heatmaps, stat cards
│   │   ├── daily/             # Daily progress ring, todo cards, morning banner
│   │   ├── habits/            # Habit rows, streak indicators, forms
│   │   ├── layout/            # Navigation, top bar, page wrappers
│   │   ├── tasks/             # Task cards, forms, badges
│   │   └── ui/                # Core design primitives (Button, Input, Card, etc.)
│   ├── hooks/                 # React Query data hooks
│   ├── lib/                   # Utilities (cn, constants, dates, supabase adapter)
│   ├── pages/                 # Route pages (Home, Daily, Vault, Habits, Weekly, Analytics, Settings, Auth)
│   ├── types/                 # Database and domain TypeScript definitions
│   ├── App.tsx                # App entry & routing
│   └── main.tsx               # Bootstrap & QueryClientProvider setup
├── supabase/
│   ├── functions/             # Deno edge functions (daily-reset, weekly-review)
│   └── migrations/            # Versioned SQL migrations (0000_baseline.sql)
├── tailwind.config.ts         # Tailwind styling tokens & safe area extensions
└── vite.config.ts             # Vite, PWA, and build configuration
```

---

## Documentation

- [Database Schema & Architecture](docs/SCHEMA.md)
- [Design Primitives & Component Catalog](docs/UI.md)
- [Architecture Decision Log](docs/DECISIONS.md)
- [Phase Implementation Plan](IMPLEMENTATION_PLAN.md)
