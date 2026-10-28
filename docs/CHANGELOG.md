# Changelog

All notable changes to FocusOS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Phase 1: Critical Bug Fixes] - 2026-10-26

### Added
- **Local Date Handling & Timezone System (P1-1)**:
  - `src/lib/dates.ts`: Pure local date helpers (`localDateString`, `todayLocal`, `parseLocalDate`, `addDaysLocal`, `startOfWeekLocal`, `yesterdayLocal`, `getLast7Days`, `getDateLabel`) preventing UTC midnight shifts.
  - `src/hooks/useToday.ts`: Reactive date hook updating at midnight, `visibilitychange`, and `window.focus`.
  - Zero `toISOString().split('T')[0]` calls remaining in the repository.
  - `supabase/migrations/0001_timezone.sql`: Adds `timezone text not null default 'UTC'` to `profiles` with client auto-detection.
- **Theme Persistence (P1-2)**:
  - Pre-React theme initializer in `index.html` preventing white flashes.
  - `src/lib/theme.ts`, `ThemeContext`, `useTheme`, and `ThemeProvider`.
- **Password Reset Flow (P1-4)**:
  - New route and page `src/pages/ResetPassword.tsx` (`/auth/reset`) with validation, password confirmation, and `supabase.auth.updateUser`.
  - Auth provider listener routing `PASSWORD_RECOVERY` events to `/auth/reset`.
- **Safe Area Support (P1-5)**:
  - Tailwind plugin generating `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe` utilities via `env(safe-area-inset-*)`.
- **Edge Functions Rewrite (P1-7, P1-8)**:
  - `supabase/functions/daily-reset/index.ts`: Timezone-aware hourly cron using `Intl.DateTimeFormat`, idempotent execution tracking with `profiles.last_reset_date`, ad-hoc carry-over unique index, and batched upserts.
  - `supabase/functions/weekly-review/index.ts`: Half-open time range `[weekStart, nextWeekStart)` preserving Sunday completions, habit completion stats, and idempotent `last_weekly_date` tracking.
  - `supabase/functions/_shared/dates.ts`: Pure Deno/Node compatible date math with unit tests for boundary timestamps in `Asia/Kolkata` and `America/Los_Angeles`.
  - `supabase/migrations/0002_reset_tracking.sql` and `supabase/migrations/0003_daily_extras.sql`.
- **Habit Streaks & Due Checking (P1-10)**:
  - `src/lib/habits.ts`: Pure frequency-aware calculation of `isHabitDue`, `currentStreak` with grace days, `longestStreak`, and `completionRate`.
  - Automatic bidirectional sync between `daily_todos` and `habit_logs`.
- **Idempotent Creates (P1-13)**:
  - Client-generated `crypto.randomUUID()` and `upsert({ ignoreDuplicates: true })` for tasks, habits, and daily todos.

### Fixed
- **Empty "Today" Dead End (P1-3)**: Placed `QuickAddBar` permanently at the top of Today and connected EmptyState actions to focus quick-add or navigate to Vault.
- **Viewport Zoom Lock (P1-6)**: Removed `maximum-scale=1, user-scalable=0` from `index.html` and enforced 16px minimum font size across all form inputs.
- **Realtime & Cache Invalidation (P1-9)**: Added 150ms debounce and accurate table-to-cache invalidation mappings in `useRealtimeSync`; fixed `['daily']` to `['daily_todos']` in `usePinTask`; scoped queries with `user.id`.
- **Duplicate Toasts & Toast Policy (P1-11)**: Removed duplicate `<Toaster>` in `App.tsx`, unified dark/light styling in `main.tsx`, and pruned routine success toasts.
- **Tab Refocus Bouncing (P1-12)**: Prevented unwanted redirects on tab resume by checking `window.location.pathname.startsWith('/auth')`; added `queryClient.clear()` on `SIGNED_OUT`.

---

## [Phase 0: Foundations] - 2026-10-25

### Added
- **Design Primitives (`src/components/ui/`)**:
  - `Button`: Standard touch target (min 44px), loading spinner, disabled states, and visual variants (`primary`, `secondary`, `outline`, `ghost`, `danger`).
  - `Input`: Accessible text/number input with 16px font-size to prevent mobile browser iOS auto-zoom.
  - `Textarea`: Multi-line input with auto-resize readiness and ring focus styles.
  - `Select`: Custom-styled select dropdown with chevron indicator.
  - `Card`: Surface container with `default`, `interactive`, and `elevated` variants.
  - `SectionHeader`: Standardized page section header with title, subtitle, and optional trailing action button.
  - `Chip`: Filter/tag toggle chip with interactive states.
  - `Badge`: Status/priority label badge with color variants (`neutral`, `primary`, `success`, `warning`, `danger`, `purple`).
  - `IconButton`: Accessible icon button requiring `aria-label` with 44×44px minimum hit area.
  - `cn` utility (`src/lib/cn.ts`): Type-safe className merging using `clsx` and `tailwind-merge`.
  - Design system guide in `docs/UI.md`.
- **Database Baseline & Documentation**:
  - `supabase/migrations/0000_baseline.sql`: Complete baseline SQL schema representing initial state (`profiles`, `tasks`, `habits`, `habit_logs`, `daily_todos`, `weekly_reviews`), indexes, and RLS policies.
  - `docs/SCHEMA.md`: Comprehensive table schemas, foreign key cascade behaviors, realtime subscriptions, and architectural audit Q&A.
  - `docs/DECISIONS.md`: Architectural decision records (DEC-001 offline mock adapter, DEC-002 dependency triage, DEC-003 baseline schema audit).
- **Testing & Continuous Integration**:
  - Vitest test runner setup (`vitest.config.ts` and `src/test/setup.ts` with `Asia/Kolkata` timezone configured).
  - Automated smoke tests (`src/test/smoke.test.ts`) covering environment sanity and date calculations.
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`) running Node 22, `npm ci`, linting, building, and tests on push/PR.
- **Documentation**:
  - Completely rewritten `README.md` covering architecture, local development, offline mock mode, Supabase setup, Edge Function deployments, and cron schedules.
  - Updated `.env.example` documenting Supabase and VAPID key configurations.

### Changed
- **Dependencies & Bundle Cleanup**:
  - Replaced `react-icons` with `lucide-react` icons (`Check`, `Trash2`) in `src/components/daily/SwipeableItem.tsx`.
  - Removed unused dependencies: `react-hook-form`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`, `react-icons`.
  - Documented retention rationale for `@dnd-kit/*` (Phase 3), `zod` (Phase 4), `zustand` (Phase 4), and `react-is` (peer dependency for `recharts`).
  - Cleaned repository untracked artifacts (`dev-dist/`, `bun.lock`, orphan `public/manifest.json`). Added `dev-dist/` and `bun.lock` to `.gitignore`.
- **Linting & Type Safety**:
  - Enforced strict `@typescript-eslint/no-explicit-any: 'error'` in `eslint.config.js`.
  - Removed all instances of `any` across the codebase (`DailyTodoCard.tsx`, `useWeekly.ts`, `HabitHeatmap.tsx`, `supabase.ts`).
  - Added `"node"` to `compilerOptions.types` in `tsconfig.app.json` for test runner compatibility.
