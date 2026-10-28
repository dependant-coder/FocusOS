# FocusOS — Implementation Plan (for an AI coding agent)

Repo: `dependant-coder/FocusOS` · Stack: Vite 8, React 19, TypeScript, Tailwind 3, React Query 5, Supabase (auth, Postgres, realtime, edge functions), framer-motion, lucide-react, recharts, vite-plugin-pwa.

This plan comes from a full code review. Every task names the files to touch, the exact change, and acceptance criteria. Do the phases in order. Phases 0 to 2 are fixes and groundwork; phases 3 to 5 are product work.

---

## 0. How you (the AI) must work

1. **One task = one branch-sized unit = one commit.** Use conventional commits (`fix:`, `feat:`, `chore:`, `refactor:`, `test:`). After every task run `npm run lint && npm run build` (the build runs `tsc -b`). Never leave the build red.
2. **Never guess the database.** The repo has no migrations. Task P0-3 captures the live schema first. Every schema change is a numbered SQL file in `supabase/migrations/`. Do not run SQL against the live project without the user confirming. After any migration, regenerate `src/types/database.types.ts`.
3. **Every UI task must cover:** loading state, empty state, error state, offline state, dark mode, keyboard access, `aria-label`s on icon-only buttons, and a 44×44 px minimum touch target for primary actions.
4. **Conventions to keep:** Tailwind utility classes, the `brand` color token (not raw `indigo-*`), lucide-react icons only, framer-motion for animation, React Query for all server state, `toast` only for errors and undo (not for routine success).
5. **Dates:** never write `new Date().toISOString().split('T')[0]` again. Use the helpers from task P1-1.
6. **Flag, don't hide.** If a task cannot be completed as written (for example a DB trigger behaves differently than assumed), stop, write what you found into `docs/DECISIONS.md`, and ask the user.
7. **After each phase:** write a short summary (what changed, what to test by hand, anything deferred) in `docs/CHANGELOG.md`.
8. Items marked *(verify)* are suspected from code reading and must be reproduced before fixing. If you cannot reproduce them, record that in `docs/DECISIONS.md` and skip the fix.

### Definition of done (applies to every task)
- Acceptance criteria listed in the task are met.
- Lint and build pass; new pure logic has unit tests (Vitest, set up in P0-5).
- No new `any`, no new `@ts-ignore` (except existing Deno files).
- No console errors in a manual run of the affected page in light and dark mode at 390 px width, and at 1280 px width.

---

## 1. Final information architecture

### Navigation
- **Bottom nav (5 tabs, persistent, phones):** Home `/`, Today `/daily`, Tasks `/vault`, Habits `/habits`, Focus `/focus`.
- **Global capture button:** one floating "+" (replaces the per-page FABs) mounted in the layout, above the bottom nav, opens the Quick Capture sheet (P3-2) from any page.
- **TopBar (persistent):** page title on the left; on the right a search icon (`/search`) and an avatar menu with: Weekly Review, Analytics, Courses, Settings, Sign out.
- **Desktop (≥ `md`):** replace the bottom nav with a left sidebar (same items plus Review, Analytics, Courses, Settings) and let content use a wider column. Phones stay mobile-first.

### Routes and pages (target state)

| Route | Page | Purpose | Status |
|---|---|---|---|
| `/auth` | Auth | Sign in / sign up / forgot password | exists, improve (P3-1) |
| `/auth/reset` | ResetPassword | Set a new password after recovery link | **new** (P1-4) |
| `/` | Home | "What should I do now?" dashboard | redesign (P3-3) |
| `/daily` | Today | Today's plan, triage, quick add | rework (P3-4) |
| `/vault` | Tasks | All tasks, filters, grouping, search | rework (P3-5) |
| `/habits` | Habits | Today's habits, streaks, edit/archive/reorder | rework (P3-6) |
| `/focus` | Focus | Pick task + duration, start session | **new** (P4-1) |
| `/focus/run` | FocusRun | Full-screen running timer | **new** (P4-1) |
| `/weekly` | Weekly Review | Auto stats, reflection, plan next week | rework (P3-7) |
| `/analytics` | Analytics | Charts, ranges, insights | rework (P3-8) |
| `/courses` | Courses | List/add/edit courses | **new** (P4-4) |
| `/courses/:id` | CourseDetail | Tasks, exams, timetable for a course | **new** (P4-4) |
| `/search` | Search | Global search + command palette (Ctrl/Cmd+K) | **new** (P4-6) |
| `/settings` | Settings | Profile, appearance, notifications, focus defaults, data, account | rework (P3-9) |
| `*` | NotFound | Friendly 404 with link home | **new** (P2-6) |

### Layout structure (P2-1)
```
<AuthProvider>
  <QueryClientProvider>
    <Routes>
      /auth, /auth/reset            -> public
      <AppLayout>                   -> persistent TopBar + Nav + Capture button; renders <Outlet/>
        /, /daily, /vault, ...      -> pages (each wrapped only in <PageTransition> for the content)
```

---

## PHASE 0 — Housekeeping and foundations (do first, ~1 day)

### P0-1 Clean the repo
- Add `dev-dist/` to `.gitignore`, then `git rm -r --cached dev-dist`.
- Remove unused dependencies (verified by grep: no imports in `src`): `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `react-hook-form`, `zod`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`. **Before removing**, grep again for each; keep any that a later task in this plan will use: `@dnd-kit/*` is used in P3-6 (habit reorder), `clsx` and `tailwind-merge` are used in P0-2, `zod` may be used in P4-3 for quick-add parsing validation — if you want these, keep them; otherwise remove. **Keep `react-is`** (peer dependency of recharts). Check whether `zustand` is imported anywhere; it is needed in P4-1, keep it either way.
- Replace the single `react-icons` import in `src/components/daily/SwipeableItem.tsx` with lucide `Check` and `Trash2`, then remove `react-icons`.
- Delete `public/manifest.json` (orphan) and later `public/sw.js` (P2-3).
- **Accept:** `npm ci && npm run build` passes; bundle has no unused packages.

### P0-2 Design primitives
Create `src/lib/cn.ts` (`clsx` + `twMerge`) and `src/components/ui/`:
- `Button` (variants: primary, secondary, ghost, danger; sizes; `loading` prop; min height 44 px).
- `Input`, `Textarea`, `Select` (font-size 16 px, label + error slot, `autoComplete` passthrough).
- `Card`, `SectionHeader` (the repeated `text-xs font-semibold uppercase tracking-wider` pattern), `Chip`, `Badge`.
- `IconButton` (requires `aria-label`, 44×44 hit area even if the icon is smaller).
- `Skeleton` already exists; keep.
- Replace hand-rolled duplicates page by page as you touch them (do not mass-rewrite in this task). Remove unused `.btn-primary`, `.input-field`, `.card` rules from `index.css` or make the primitives use them.
- **Accept:** primitives documented in `docs/UI.md` with a usage example each.

### P0-3 Capture the real database schema
- If the Supabase MCP is available, use `list_tables`, `list_migrations`, `get_advisors` (security + performance), and `execute_sql` (read-only) to read: table definitions, constraints (especially unique constraints on `daily_todos` for `(user_id, task_id, date)` and `(user_id, habit_id, date)`), RLS policies, triggers and functions (the pin→daily_todos sync and the done→task status sync), the realtime publication tables, and the cron schedules for `daily-reset` and `weekly-review`.
- If not available, ask the user for `supabase db dump --schema public` output.
- Write `supabase/migrations/0000_baseline.sql` (baseline of current state) and `docs/SCHEMA.md` summarizing tables, triggers, and cron schedules.
- Answer these questions in `docs/SCHEMA.md` (they change later tasks): Does a trigger sync `habit_logs` ⇄ `daily_todos` in both directions? Which column does the done-toggle in Daily update on `tasks`? Is `daily_todos.task_id` nullable with a plain unique constraint (null-distinct duplicates)? Are all tables in the `supabase_realtime` publication? Do all FKs to `auth.users` have `ON DELETE CASCADE`?
- Fix anything the advisors flag as a security error (missing RLS, `security definer` without `search_path`).

### P0-4 README and env docs
Replace the stock Vite README with: what FocusOS is, screenshots (leave placeholders), feature list, stack, setup (`.env` from `.env.example`, `supabase start`, `supabase db push`, `npm run dev`), deploy notes (Vercel), edge function deploy and cron setup, project structure, link to `docs/`.

### P0-5 Tests and CI
- Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. Add `npm run test`. Configure in `vite.config.ts` (or `vitest.config.ts`).
- Add `.github/workflows/ci.yml`: Node 22, `npm ci`, `npm run lint`, `npm run build`, `npm run test`.
- Add a `src/test/setup.ts` that fixes the timezone for tests (`process.env.TZ = 'Asia/Kolkata'` and a second suite at `America/Los_Angeles`) so date bugs are caught.
- **Accept:** CI is green on a PR; one trivial test passes.

### P0-6 Lint config
Turn on `@typescript-eslint/no-explicit-any` as an error; fix existing `any` usage (`priority={todo.priority as any}` in `DailyTodoCard`, `updateData: any` in `useWeekly`) with proper types.

---

## PHASE 1 — Critical bug fixes (~2–3 days)

### P1-1 Local-date handling (highest priority)
**Problem:** `new Date().toISOString().split('T')[0]` returns the UTC date. At UTC+5:30 the app treats 00:00–05:30 as the previous day. Found in `useDailyTodos.ts`, `Habits.tsx`, `HabitRow.tsx`, `StreakDots.tsx`, `useHabits.ts` (`useHabitLogs`), `dates.ts` (`todayString`, `yesterdayString`, `getLast7Days`).

**Do:**
1. In `src/lib/dates.ts` add and export: `localDateString(d = new Date())` → `format(d, 'yyyy-MM-dd')` (date-fns, local time); `todayLocal()`; `parseLocalDate(str)` → `new Date(str + 'T00:00:00')`; `addDaysLocal(str, n)`; `startOfWeekLocal(str)` (Monday). Delete `todayString`/`yesterdayString` or re-implement them with the local helpers.
2. Replace every `toISOString().split('T')[0]` in `src/` with the helpers (grep to confirm zero remain). In `useDailyTodos`, compute `today` once with a hook `useToday()` that returns the date string and **updates at local midnight and on `visibilitychange`** (so a PWA left open overnight rolls over). Use it in query keys.
3. `Weekly.tsx`: replace `format(new Date(weekStart), …)` with `format(parseLocalDate(weekStart), …)`.
4. Migration `0001_timezone.sql`: `alter table profiles add column timezone text not null default 'UTC'`. On first load after login, if `profiles.timezone` is `'UTC'` and the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` differs, update it silently. Expose the field in Settings (P3-9).
5. Rewrite both edge functions to be timezone-aware (see P1-7 and P1-8).

**Tests (`src/lib/dates.test.ts`):** under `TZ=Asia/Kolkata`, at `2026-10-26T02:30:00+05:30` `localDateString()` must equal `2026-10-26`; under `America/Los_Angeles` at `2026-10-26T23:30:00-07:00` it must equal `2026-10-26`. Week start for `2026-10-25` is `2026-10-19`.

**Accept:** at 02:30 IST the Daily page and Habits page show today's date and write rows with the local date.

### P1-2 Theme persistence
**Problem:** `applyTheme` exists only in `Settings.tsx` and only runs on click. After a reload the app is always light.

**Do:**
1. Create `src/lib/theme.ts` with `getStoredTheme()`, `setTheme(theme)`, `applyTheme(theme)`, and `initTheme()`; persist to `localStorage['focusos-theme']`.
2. In `index.html` add an inline `<script>` in `<head>` (before React) that reads that key, resolves `system` via `matchMedia`, and toggles `document.documentElement.classList` `dark`, and updates `<meta name="theme-color">` (light `#ffffff`, dark `#030712`). Set `color-scheme`.
3. `ThemeProvider` (or a `useTheme` hook mounted in `AppLayout`): when theme is `system`, listen to `matchMedia('(prefers-color-scheme: dark)')` `change`. When the profile loads, reconcile `profiles.theme` with local storage (profile wins).
4. `Settings.tsx` calls `setTheme`. Remove the local `applyTheme`.
5. Make `LoadingScreen` and manifest `background_color` neutral so there is no white flash for dark users (use `bg-gray-50 dark:bg-gray-950`).

**Accept:** set Dark, hard reload: no white flash, stays dark. Set System, flip OS theme: app follows without reload.

### P1-3 Empty "Today" dead end
**Problem:** `Daily.tsx` renders `<EmptyState variant="daily" />` without `onAction`, and `QuickAddBar` is only in the non-empty branch.

**Do:** Render `QuickAddBar` regardless of count (move it to the top of the page, directly under the header, see P3-4). Pass `onAction` to `EmptyState` that focuses the quick-add input (expose via ref). Add a secondary action "Pick from Tasks" that links to `/vault`.

**Accept:** a brand-new account opens Today, sees the add bar, adds a task, and it appears.

### P1-4 Complete the password-reset flow
**Do:**
1. New page `src/pages/ResetPassword.tsx` at `/auth/reset`: two password fields (new + confirm), show/hide toggles, `autoComplete="new-password"`, calls `supabase.auth.updateUser({ password })`, success → toast + navigate `/`.
2. In `AuthProvider` (P2-1) handle `PASSWORD_RECOVERY`: navigate to `/auth/reset`.
3. `resetPasswordForEmail` `redirectTo` = `${origin}/auth/reset`. Tell the user to add this URL to Supabase Auth → URL Configuration → Redirect URLs.
4. Same for sign-up `emailRedirectTo` (`${origin}/`).

**Accept:** request reset, click the emailed link, land on the reset form, set a password, land on Home signed in.

### P1-5 Safe areas (iOS standalone)
**Problem:** `pt-safe` / `pb-safe` are used by `TopBar` / `BottomNav` but are not defined anywhere (Tailwind generates `pt-safe-top` from the spacing keys, not `pt-safe`).

**Do:** In `tailwind.config.ts` add a plugin with `addUtilities`: `.pt-safe { padding-top: env(safe-area-inset-top) }`, `.pb-safe { padding-bottom: env(safe-area-inset-bottom) }`, `.pl-safe`, `.pr-safe`. Remove the unused `spacing` keys and the duplicate `.safe-top/.safe-bottom` classes in `index.css`. Use `min-h-dvh` instead of `min-h-screen`. Make the FAB/capture button offset `bottom: calc(env(safe-area-inset-bottom) + 5.5rem)`.

**Accept:** in an installed iOS PWA (or Chrome devtools device mode with a notch), TopBar content clears the notch and the nav clears the home indicator.

### P1-6 Viewport zoom lock
In `index.html` change the viewport meta to `width=device-width, initial-scale=1.0, viewport-fit=cover` (remove `maximum-scale=1, user-scalable=0`). Make every input/textarea/select use `text-base` (16 px) so iOS does not auto-zoom on focus (done via the P0-2 primitives; also fix the inline inputs in `QuickAddBar`, `Auth`, `Settings`, `HabitForm`, `ReflectionForm`, `TaskForm`).

### P1-7 Daily-reset edge function (rewrite)
File `supabase/functions/daily-reset/index.ts`.
- Run **hourly** via pg_cron/Supabase schedule. For each profile compute the user's local date with `Intl.DateTimeFormat('en-CA', { timeZone })`. Process a user only when `profiles.last_reset_date < localDate` (migration `0002_reset_tracking.sql` adds `last_reset_date date`). After processing, set it. This makes the function idempotent and timezone-correct.
- Day-of-week from the user's local date, not server `getDay()`.
- Carry-over: copy unfinished non-habit todos from the user's **previous local date row set**, increment `carry_count` (new column, default 0, added in `0003_daily_extras.sql`) and set `carry_over = true`. Also carry items from earlier days that were never resolved: select the latest unfinished todos with `date < today` and not already present today, not just "yesterday".
- Make inserts idempotent. For rows with `task_id IS NULL` (ad-hoc) add a partial unique index `(user_id, date, title) WHERE task_id IS NULL AND habit_id IS NULL AND carry_over` (or track `carried_from_id uuid` and unique on it). Document the choice in `docs/DECISIONS.md`.
- Batch: build arrays and do one `upsert` per user per category instead of one query per row.
- Surface due-today tasks and habits as before (habit frequency by user-local weekday).
- Return `{ processed, skipped, errors }`; log errors per user and continue.
- Add `supabase/functions/_shared/dates.ts` with pure helpers and unit-test them from the Vitest suite.

### P1-8 Weekly-review edge function (rewrite)
File `supabase/functions/weekly-review/index.ts`. Migration adds `tasks.completed_at timestamptz` (see schema section) and `profiles.last_weekly_date`.
- Hourly schedule; process a user when it is Monday 00:00–05:59 in their timezone and `last_weekly_date` is not that Monday. Review the Monday–Sunday that just ended in the user's timezone, using half-open ranges: `completed_at >= weekStart AND completed_at < nextWeekStart` (fixes the dropped-Sunday bug).
- Use `completed_at` (not `updated_at`).
- Add habit stats: `habits_due`, `habits_done`, `habit_completion_rate` (migration adds these columns to `weekly_reviews`), `focus_minutes` (after P4-1), `carried_over_count`.
- "Missed" = tasks due that week and not done at week end.
- Upsert on `(user_id, week_start)`.

### P1-9 Realtime and cache-key bugs
- `src/hooks/useRealtime.ts`: return early when `userId` is falsy. Map tables → invalidations: `daily_todos → ['daily_todos']`; `tasks → ['tasks'], ['daily_todos'], ['analytics']`; `habit_logs → ['habit_logs'], ['daily_todos'], ['analytics']`; `habits → ['habits'], ['habit_logs']`; later `focus_sessions → ['focus_sessions'], ['analytics']`; `weekly_reviews → ['weekly']`. Debounce invalidations (150 ms) to avoid bursts.
- `usePinTask`: fix invalidation `['daily']` → `['daily_todos']`; make the optimistic update apply to **every** cached `['tasks', *]` query using `qc.setQueriesData({ queryKey: ['tasks'] }, …)`.
- All keys that contain user data must include `user.id` (`useTasks`, `useWeekly`).

### P1-10 Habit correctness
Create `src/lib/habits.ts` (pure, tested):
- `isHabitDue(habit, dateStr)`: frequency `daily | weekdays | weekends | custom` (custom uses `custom_days` as `mon…sun`), and `dateStr >= habit.created_at` local date.
- `currentStreak(habit, completedSet, todayStr, opts)`: walks backwards over **due** days only; if today is due and not completed, start from the previous due day (do not break); allows `graceDays` per rolling 7 days (default 1, see P4-2); returns `{ streak, graceUsed }`.
- `longestStreak(habit, completedSet, …)` with the same due-day logic.
- `completionRate(habit, completedSet, from, to)` = completed due days / due days.
Use them in: `HabitRow` (replace the 7-dot streak that caps at 7), `Habits.tsx` stats (today = due habits only; month = completion rate over due days only), and `useStatCardsData` (longest streak).
- `HabitRow`: if not due today, show muted "Not scheduled today" and disable the checkbox.
- Per-row pending state: pass `isToggling={toggleLog.isPending && toggleLog.variables?.habitId === habit.id}` (fixes all rows disabling at once).
- If P0-3 shows no trigger syncs Daily ↔ habit_logs, make `useToggleDailyTodo` also upsert `habit_logs` for `type='habit'` rows (and vice versa) in one optimistic mutation.

**Tests:** weekdays-only habit completed Mon–Fri then Mon has a streak of 6; today unchecked does not reset; a rate of 100 % for a weekdays habit across a full week.

### P1-11 Duplicate toasts and toast policy
Delete the `<Toaster>` in `App.tsx`; keep one in `main.tsx` (or in `AppLayout`), with one style that works in light and dark. Remove success toasts for routine toggles/creates (task created, task updated, habit created, added to today). Keep: errors (with a "Retry" action where possible), undo toasts, export success, push-permission outcomes.

### P1-12 Sign-in navigation and cache hygiene
- `App.tsx`: only call `navigate('/')` on `SIGNED_IN` when the current path starts with `/auth` (stops bouncing to Home on tab refocus). *(verify first by opening `/vault`, switching apps, returning.)*
- On `SIGNED_OUT`: `queryClient.clear()`, clear persisted cache (P2-5), clear focus store, navigate `/auth`.

### P1-13 Idempotent creates
Generate `id = crypto.randomUUID()` on the client for task, ad-hoc todo, habit, focus session and course creation; insert with that id (`upsert` with `ignoreDuplicates: true`) so a React Query retry cannot create duplicates. Keep `retry: 1` for mutations only after this is done.

---

## PHASE 2 — Platform: auth, layout, PWA, push, offline (~3–4 days)

### P2-1 AuthProvider and app layout
- `src/providers/AuthProvider.tsx`: single `getSession()` + single `onAuthStateChange` subscription; exposes `{ user, session, loading, signOut }`. Handles `PASSWORD_RECOVERY` and `SIGNED_OUT` (P1-4, P1-12). Mount it in `main.tsx` above `QueryClientProvider`.
- `src/hooks/useAuth.ts` becomes `useContext(AuthContext)`. Because `user` is then available synchronously after the first load, query keys no longer start with `undefined` (removes the per-navigation skeleton flash *(verify)*).
- `src/components/layout/AppLayout.tsx`: persistent `TopBar` + nav + capture button + `<Outlet/>`. Convert `PageShell` into a thin content wrapper with a `size?: 'narrow' | 'wide'` prop (narrow = `max-w-lg`, wide = `max-w-5xl` on desktop). Pages stop rendering their own `TopBar`/`BottomNav`; page title comes from route handle or a `usePageTitle()` hook.
- Routes in `App.tsx` use `<Route element={<AppLayout/>}>` with child routes. Auth guard component `RequireAuth`.
- `PageTransition`: animate only the content, remove `AnimatePresence mode="wait"` (or keep `mode="popLayout"`), duration ≤ 150 ms. Wrap the app in `<MotionConfig reducedMotion="user">`.
- Add an `ErrorBoundary` around the routes with "Something went wrong — Reload" and report to console; handle failed lazy-chunk loads by reloading once.

**Accept:** switching tabs does not re-animate the nav; a window ≥ 1024 px shows the sidebar and wide charts.

### P2-2 Navigation components
- `BottomNav` (5 tabs per section 1), 44 px targets, `aria-current="page"`, label text 11 px minimum.
- `Sidebar` for `md+`.
- `TopBar` avatar menu (headless menu with keyboard support) and a search button.
- `CaptureButton` (floating "+") mounted in `AppLayout`; hidden on `/focus/run` and `/auth*`.

### P2-3 One service worker, one manifest
- `vite.config.ts`: `VitePWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', registerType: 'prompt', injectRegister: false, manifest: {…}, injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] } })`.
- `src/sw.ts` (Workbox): `precacheAndRoute(self.__WB_MANIFEST)`; `NavigationRoute` fallback to `index.html` except `/api`; runtime cache for Google-fonts/self-hosted fonts (cache-first); **no caching of Supabase API calls** (network only; offline reads come from the React Query persister, P2-5); `push` handler that shows a notification using `/pwa-192x192.png` and `data.url`; `notificationclick` focuses an existing window or opens `data.url`; `message` handler for `SKIP_WAITING`.
- Manifest: `id: '/'`, `name: 'FocusOS'`, `short_name: 'FocusOS'`, `start_url: '/?source=pwa'`, `display: 'standalone'`, `theme_color`/`background_color` consistent with the theme script, `orientation: 'any'` (do not lock portrait), icons: separate entries for `purpose: 'any'` and `purpose: 'maskable'` (generate a maskable 512 with safe padding), `categories: ['productivity','education']`, `shortcuts`: Add task (`/?capture=1`), Today (`/daily`), Start focus (`/focus`); `share_target` (Android): `action: '/?share=1'`, `method: 'GET'`, params `title`, `text`, `url` — on load, if `share` params exist, open the capture sheet pre-filled.
- Delete `public/sw.js`, `public/manifest.json`, and the manual `navigator.serviceWorker.register` in `main.tsx`. Register with `virtual:pwa-register` (`registerSW({ onNeedRefresh, onOfflineReady })`) and show a non-blocking "Update available — Reload" toast/banner.
- Remove `devOptions.enabled: true` for normal dev (keep an npm script `dev:pwa` that enables it).
- **Accept:** Lighthouse PWA checks pass; after first load, airplane mode still opens the app shell; the update banner appears after a new deploy.

### P2-4 Push notifications (reminders that actually work)
1. Migration `0004_push.sql`: table `push_subscriptions (id, user_id, endpoint unique, p256dh, auth, user_agent, created_at)` with RLS (`user_id = auth.uid()`); add `profiles.last_reminder_date date`, `profiles.weekly_reminder_on boolean default true`, `profiles.weekly_reminder_time time default '18:00'`, `profiles.weekly_reminder_day smallint default 0` (0 = Sunday).
2. Generate VAPID keys once (`npx web-push generate-vapid-keys`); public key in `VITE_VAPID_PUBLIC_KEY`, private key + subject as Supabase function secrets. Document in README.
3. `src/lib/push.ts`: `isPushSupported()`, `isStandalone()` (`matchMedia('(display-mode: standalone)')` or `navigator.standalone`), `subscribe()` (**must be called from a click handler**), `unsubscribe()`, `getPermissionState()`. Save the subscription row; delete it on unsubscribe or on a 404/410 from the push service.
4. Settings (P3-9) toggle flow: tap → if iOS and not standalone, show an "Install first: Share → Add to Home Screen" explainer instead of asking permission; else request permission and subscribe; reflect real state (granted/denied/unsupported); "Send test notification" button. If permission is denied, show how to re-enable it instead of a dead toggle.
5. Edge function `supabase/functions/send-reminders/index.ts` (scheduled every 10–15 minutes): for each user with `notif_on`, a subscription, and local time within the current 15-minute window of `notif_time` and `last_reminder_date <> today`, send a push summarising "N tasks today, M habits due" (skip when nothing is due and say nothing); do the same for the weekly review reminder; delete dead subscriptions; update `last_reminder_date`. Use the `web-push` npm package via `npm:web-push` (verify it runs on the Supabase edge runtime; if not, use a Deno-native Web Push library and note it in `docs/DECISIONS.md`).
6. Remove the cosmetic behaviour: the toggle must never show "enabled" unless a subscription exists.

### P2-5 Offline-friendly data layer
- Install `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister` (or an IndexedDB persister via `idb-keyval`). Persist queries for `tasks`, `daily_todos`, `habits`, `habit_logs`, `profile` with a user-scoped buster key and `maxAge` 7 days; never persist auth tokens (Supabase already stores them).
- `onlineManager` integration; `OfflineBanner` component ("You're offline — changes will sync when you're back") shown in `AppLayout`.
- Mutations: set `networkMode: 'offlineFirst'` and register `queryClient.setMutationDefaults` for the core mutations (create/toggle/delete task, toggle habit, add ad-hoc todo) so paused mutations survive reload and resume on reconnect. Because ids are client-generated (P1-13) replays are safe.
- Clear the persisted cache on sign-out.
- **Accept:** go offline, tick a habit and add a task, reload, still visible; go online, changes sync once with no duplicates.

### P2-6 Small platform items
- `NotFound` page.
- Self-host the Inter font (`@fontsource-variable/inter`) and remove the Google Fonts `@import`.
- Remove `overscroll-behavior-y: contain` on `body` or add a custom pull-to-refresh that invalidates all queries.
- `useDailyTodos` and friends: refetch on `visibilitychange` when the local date changed (uses `useToday()` from P1-1).

---

## PHASE 3 — Page-by-page UX work (~1–2 weeks)

For every page below, implement all listed states and behaviours. Reuse primitives from P0-2.

### P3-1 `/auth` Auth page
- Inputs: `autoComplete="email"`, `"current-password"` (sign in) / `"new-password"` (sign up), `inputMode="email"`, show/hide password button (labelled), `name` attributes.
- Friendly error mapping (invalid credentials, email not confirmed with a "Resend confirmation email" button using `supabase.auth.resend`, rate-limit message).
- After sign-up, show a confirmation state ("We sent a link to x@y.com. Open it on this device.") instead of leaving the form.
- Password: minimum length matches the Supabase setting (recommend 8); inline hint.
- Keep Google OAuth; show a spinner on the button while redirecting.
- Reduce motion/blur effects on low-end devices (`prefers-reduced-motion`).

### P3-2 Global Quick Capture sheet (used on every page)
- Opens from the floating "+", the manifest shortcut (`/?capture=1`), the share target, and the keyboard shortcut `n`.
- Single text field (autofocus, 16 px) with live parse preview chips (P4-3 parser): priority, category/course, due date, estimate. Buttons: "Add to Today" (default when no date is given) and "Add to Tasks".
- **Stays open after submit** with the field cleared and a subtle confirmation, so multiple items can be entered in a row; closes on Escape or swipe down.
- Optimistic insert (no waiting for the network).
- "More options" expands the full `TaskForm` as a sheet.

### P3-3 `/` Home
Replace the decorative layout. Order from top:
1. Greeting using `getGreeting()` (time-aware; delete the hard-coded "Good morning" and the three duplicated helpers; keep one in `dates.ts`), date, avatar/settings via TopBar.
2. **Primary action card:** if a focus session is running → "Resume focus (12:31 left)"; else "Start focus" (opens `/focus`, preselecting the top task).
3. **Next up:** the top 3 incomplete items from Today (priority-sorted) with checkboxes you can tick in place and a ▶ focus button each.
4. **Progress ring + chips:** Today `done/total`, Habits `done/due` (with denominator), Overdue count. Chips are links (`/daily`, `/habits`, `/vault?filter=overdue`). Add "Focus today: Xm" once P4-1 ships.
5. **Habits due today:** compact row of habit icons you can tick.
6. **Upcoming:** next class and next deadline/exam countdown (after P4-4; hide until then).
7. **Quote/win line:** a single line, with a setting to hide it (P3-9). Prefer showing last week's "win" from the weekly reflection when it exists, else a quote.
- Empty states for a new user: a 3-step checklist (add a task, add a habit, try a focus session) that disappears once done.

### P3-4 `/daily` Today
- Header: date, progress ring, "Plan my day" button.
- **Quick add bar at the top**, always visible, stays open after submit, optimistic (replaces bottom-of-list placement).
- **Plan my day sheet** (`PlanDaySheet`) — auto-opens once per local day when there are carried-over items (store dismissal in `localStorage['focusos-plan-YYYY-MM-DD']`): each carried item offers Keep today / Tomorrow / Pick date / Drop, plus a star to mark up to **3 "Must do"** items (`daily_todos.must_do`, migration `0003`). Moving a task updates `tasks.due_date` and removes the daily_todo; dropping uses undo.
- Sections: Must-do, Priorities (pinned + due today), Habits, Quick tasks, Completed (collapsed by default, count shown).
- `DailyTodoCard`: tap opens `TodoSheet` to edit title, priority, category, due date, notes, subtasks (after P4-5); show badges incl. "Carried 3×" (`carry_count`); ▶ Focus button; overflow "⋯" menu with Complete, Edit, Move, Delete (this gives keyboard/screen-reader access to what swipe does). Swipe stays as a shortcut: add `dragSnapToOrigin`, make the revealed background colours dark-mode aware, and use the same card background in the wrapper and card. Add a one-time hint ("Swipe right to complete, left to delete").
- Delete uses **undo toast** (P3-10), not immediate deletion.
- Celebrate 100 % completion once per day (small, respects reduced motion) with a single positive line.
- Empty state per P1-3.

### P3-5 `/vault` Tasks
- Search field at top (client filter first; server `ilike` later), status segmented control **Active / Done / All** (default Active), category/course filter pills, sort (Priority, Due date, Created), group-by toggle (None / Due: Overdue, Today, This week, Later, No date). Persist choices in `localStorage`. Read `?filter=overdue` from the URL.
- `TaskCard`: left checkbox to complete (calls the same mutation as Today's checkbox), "+ Today" / "On Today" chip button (replaces the unlabeled switch), due chip with time if set, estimate chip, subtask progress "2/5", course dot. Make the card keyboard-focusable (`role="button"`, `tabIndex=0`, Enter/Space).
- `TaskForm` (bottom sheet): sticky footer with Cancel/Save; title; quick date chips (Today, Tomorrow, Next Mon, Pick…); optional due time; estimate (15/30/45/60/90/custom min); priority; category/course; status (Not started / In progress / Done); notes; link; "Type" (rename "Energy Level": Deep work 45+ min / Quick < 15 min) which now drives Focus defaults; subtasks (P4-5); repeat (P4-5); "Pin to Today".
- Delete with undo (no `window.confirm`).
- Bulk select mode (long-press): complete, move to Today, change priority, delete.
- Empty states: no tasks, no results for filter/search (with "Clear filters").

### P3-6 `/habits` Habits
- Stats header: Today `done/due`, 30-day consistency % (due days only), best current streak.
- `HabitRow`: checkbox only if due, streak chip using `currentStreak` (with grace indicator, P4-2), 7-day dots that are frequency-aware (greyed for not-due days), tap row → `HabitDetail` sheet (30/90-day calendar, longest streak, total completions, edit, archive).
- Edit habit (name, icon, frequency/custom days, optional reminder time, target note) by reusing `HabitForm` with initial values and `useUpdateHabit` (already exists, currently unused).
- **Reorder** with drag handle using `@dnd-kit/sortable` (persist `sort_order`), plus move up/down buttons for keyboard users.
- Archive view ("Archived" link at bottom) with Restore; replace the misleading Trash icon labelled "Archive" with an archive icon; archive has undo.
- Expanded icon picker (search/emoji grid) and templates ("Read 20 pages", "Drink water", "Workout") in the create form.

### P3-7 `/weekly` Weekly Review
- Default to the current week with **live stats computed client-side** (tasks completed/missed so far, habit completion, focus minutes) when no review row exists; show the stored review for past weeks. Lazily create the row (`upsert` on `(user_id, week_start)`) when the user types a reflection, so reflections can always be saved. Replace `.update` in `useUpdateWeekly` with `upsert`.
- Summary card: completion %, completed/missed, habit completion, carried-over count, focus minutes, best day.
- Reflection form: Wins, Blockers, Next priorities; autosave with debounce and a visible "Saved" indicator; use the inline `EmptyState variant="weekly"` copy consistently.
- **Plan next week:** button converts each line of "Next priorities" into a task due next Monday (preview list with checkboxes before creating).
- Week navigation with accessible prev/next buttons (`aria-label`), "This week" jump, swipe on mobile.
- Show a prompt on Sunday evening via push (P2-4).

### P3-8 `/analytics` Analytics
- Use `PageShell size="wide"`; charts in a responsive grid that actually gets 2 columns on desktop.
- Range toggle (7 / 30 / 90 days) driving all charts.
- Move aggregates to SQL: migration `0006_analytics_rpc.sql` adds RPCs (`analytics_summary(range_days)`, `tasks_completed_by_day`, `category_split`, `habit_consistency`, `focus_minutes_by_day`) and `useStatCardsData` calls them instead of downloading all rows.
- Charts: tasks completed per day (using `completed_at`), category/course split (colours from one shared constant so they match badges), weekly completion trend (last 12 weeks), habit heatmap (frequency-aware), focus minutes per day (after P4-1), best weekday/time insight text.
- Empty/insufficient-data states for every chart ("Complete a few tasks to see trends").
- Per-habit drill-down link to `HabitDetail`.
- Accessible: charts have a text summary and `aria-label`; colour is never the only signal.

### P3-9 `/settings` Settings
Sections (collapsible on desktop, stacked on mobile):
1. **Profile:** name, email (read-only), **timezone** (auto-detected, editable select), change password.
2. **Appearance:** theme (Light/Dark/System via `setTheme`), **Reduce motion** (Auto/On), **Show daily quote** toggle.
3. **Notifications:** real flow from P2-4 (permission state, daily reminder time with debounced save, weekly review reminder day/time, per-habit reminders link, test button, iOS install guidance).
4. **Focus defaults:** focus length (25/45/50/custom), short and long break, auto-start break, sound on/off, strict mode (mark session interrupted when you leave the app).
5. **Data:** Export JSON (existing) + Export CSV (tasks, habits, focus sessions) + optional Import JSON (validate with zod).
6. **Account:** Sign out; **Delete account** via an edge function `delete-account` (verifies the JWT, deletes user data, calls `auth.admin.deleteUser`, requires typing the email to confirm).
- Debounce time inputs (500 ms) so each change does not fire a mutation. Add a "Saved" indicator instead of toasts.

### P3-10 Cross-cutting UX components
- **Undo system:** `src/lib/undo.tsx` with `showUndo({ message, onUndo, onCommit, ms = 5000 })`. Remove the item optimistically from the cache; commit the real delete after `ms` unless undone; flush pending commits on `visibilitychange` and `beforeunload`.
- **BottomSheet rewrite:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap and focus return, Escape to close, drag-to-dismiss (`drag="y"`, close when offset > 100 px or velocity high — the handle currently looks draggable but isn't), reliable scroll lock on iOS, sticky footer slot, safe-area bottom padding.
- **Accessibility pass:** `aria-label` on every icon-only button (habit checkbox, three-dot menu, chevrons, week prev/next, close buttons), `CheckboxRing` gets `role="checkbox"` + `aria-checked`, `Toggle` gets an accessible name via `aria-label`/`aria-labelledby`, `EmptyState` emoji gets `aria-label` or `aria-hidden`. Replace `text-gray-400` body text with at least `text-gray-500` (light) / `text-gray-400` (dark) to meet 4.5:1 contrast. Visible `:focus-visible` rings everywhere.
- **Color constants:** one source of truth (`src/lib/constants.ts`) for category/priority colours used by badges, forms, charts.

---

## PHASE 4 — New features (~2–4 weeks)

### P4-1 Focus sessions (the "Focus" in FocusOS)
**Migration `0005_focus.sql`:** `focus_sessions` (see SQL below), RLS, index on `(user_id, started_at desc)`, add to realtime publication.

**Files:** `src/pages/Focus.tsx`, `src/pages/FocusRun.tsx`, `src/stores/focusStore.ts` (zustand + `persist` to `localStorage`), `src/hooks/useFocusSessions.ts`, `src/hooks/useWakeLock.ts`, `src/lib/focusTimer.ts` (pure math, tested), `src/lib/sound.ts`.

**Behaviour:**
- `/focus` setup page: choose a task (defaults to the first Must-do/top priority; searchable list; or "Free session"), duration presets 25 / 45 / 60 / custom (a task tagged Deep work defaults to the user's long length, Quick task to 15), optional break length, **Start**. Also shows today's focus minutes and the last 5 sessions.
- `/focus/run`: full-screen, minimal UI (one task title, big countdown, progress ring, Pause/Resume, +5 min, Stop, "Done with task"). No bottom nav, no capture button. Calm styling that respects reduced motion.
- **Timer correctness:** store `{ sessionId, taskId, startedAtMs, plannedMs, pausedAtMs?, pausedTotalMs, status }` in the persisted store. Remaining time is always computed from `Date.now()`, never from counting ticks (browsers throttle background timers). A 1-second interval only triggers re-render. On reload/reopen the session resumes correctly.
- Insert the `focus_sessions` row on start (client uuid), update on pause/resume/stop/complete with `actual_seconds` (excluding paused time). Cross-device: if a `running` session exists in the DB but not in local state, show a banner on Home "Session running on another device".
- Wake lock: acquire `navigator.wakeLock.request('screen')` when running, re-acquire on `visibilitychange`; feature-detect and degrade silently.
- Interruptions: count `visibilitychange` hidden events longer than 10 s into `interruptions`; with strict mode on, mark the session `stopped` and show a gentle "You left the app" summary (no shaming copy).
- Completion: beep (Web Audio) + `navigator.vibrate` (feature-detect) + in-app sheet "Nice work — mark task done? Start break?". If the app is backgrounded the end alert depends on push; schedule a server push at `startedAt + planned` via a small edge function `schedule-focus-push` (optional, document the limitation if skipped).
- Break mode: reuse the same screen with `kind='break'`.
- Entry points: ▶ on `TaskCard`, `DailyTodoCard`, Home primary card, nav tab, manifest shortcut.
- Stats: add "Focus today" to Home; focus-minutes chart in Analytics; focus minutes + sessions in Weekly summary and in the weekly edge function.
- Honest limitation (document in the Settings help text): a web app cannot block other apps; strict mode only detects leaving FocusOS.
- Optional stretch: ambient brown-noise generator toggle (Web Audio) with volume.

**Tests:** timer math for start/pause/resume/extend, resume after simulated reload, drift after 10 minutes of hidden tab.

### P4-2 Forgiving streaks and habit insights
- Implement the grace rule in `src/lib/habits.ts`: configurable `graceDays` (profile setting, default 1 per rolling 7 days); a single missed due day within grace keeps the streak and is shown as a small "grace used" marker; "Never miss twice" copy when yesterday was missed.
- Show three numbers on `HabitDetail`: current streak, total completions (never resets), 30-day consistency %.
- Copy guidelines: no shame ("You missed 2 days") — use neutral/encouraging ("Back on track today?").

### P4-3 Smart quick-add parser
`src/lib/quickAdd.ts` (pure, heavily tested). Input examples → output `{ title, priority?, category?|courseId?, dueDate?, dueTime?, estimateMin?, toToday: boolean }`:
- Priority: `!crit`, `!high`, `!med`, `!low` or `!1`–`!4`.
- Category/course: `#college`, `#personal`, `#skill`, or `#<course code>` once courses exist.
- Dates (local time): `today`, `tomorrow`, `mon`…`sun` (next occurrence), `next week`, `oct 30`, `30/10`, `in 3 days`.
- Time: `5pm`, `17:30`, `by 11:59pm`.
- Estimate: `45m`, `1h`, `1h30m`.
Rules: tokens are removed from the title; unknown tokens stay in the title; if a date other than today or any structured field is present create a `tasks` row (and pin if due today), otherwise create an ad-hoc `daily_todo`. Show parsed chips live and allow removing a chip. Use zod to validate parser output.

### P4-4 Courses, timetable, exams (student layer)
**Migration `0007_courses.sql`:** `courses`, `timetable_slots`, `exams`, and `tasks.course_id` (SQL below).
- `/courses`: list with colour, code, upcoming deadlines count; add/edit/archive (colour picker, code, instructor optional).
- `/courses/:id`: tabs Tasks / Exams / Schedule. Tasks filtered by course with quick add pre-filled; Exams (title, date, time, location, weight optional) with countdown; Schedule (weekday, start/end, location).
- Task form and quick add gain a course selector (`#CODE`); category stays for non-course tasks. Badges show course colour.
- Home "Upcoming": next class today (from timetable, local time), nearest exam countdown, tasks due within 48 h.
- Today page shows today's classes as a read-only strip.
- `.ics` import for timetable (optional, parse locally) and `.ics` export of deadlines/exams.

### P4-5 Task depth: subtasks, recurrence, estimates, status
- `subtasks` table (SQL below); checklist UI inside `TaskForm`/`TodoSheet`, progress "n/m" on cards; completing all subtasks offers to complete the task.
- Recurrence: `tasks.recurrence_rule` (`daily`, `weekdays`, `weekly:mon,wed`, `monthly:15`) and `recurrence_until`. Postgres function `complete_task(p_task_id uuid)` marks done and, if recurring, inserts the next instance (next due date computed in SQL in the user's timezone); the client calls this RPC when completing a recurring task from Today or Vault. Show a repeat icon on cards.
- Status control (Not started / In progress / Done) in the form and a quick "Start" action on cards (sets `in_progress` and optionally starts focus).
- Estimates feed Today's header ("≈ 3h 20m planned") and a gentle over-plan warning when planned time exceeds a user-set daily capacity (optional).

### P4-6 Global search and keyboard shortcuts
- `/search` page and a command palette (Ctrl/Cmd+K, `/`): searches tasks (title, notes), habits, courses, and offers actions (New task, Start focus, Go to…). Server-side `ilike` with a `pg_trgm` index on `tasks.title` (migration `0008_search.sql`).
- Shortcuts (desktop only, disabled inside inputs): `n` new capture, `/` search, `g` then `h/d/t/b/f` navigate, `?` shortcuts help dialog.

### P4-7 Insights (lightweight, rule-based)
On Analytics and Weekly, generate 1–3 plain-language insights from your own data, e.g. "You complete most tasks on Tuesdays", "Habits drop on weekends", "Tasks with an estimate get done 30 % more often". Pure functions with tests; hide when data is insufficient.

---

## PHASE 5 — Quality, performance, release (~3–5 days)

### P5-1 Test coverage
- Unit: `dates`, `habits` (all frequencies, grace, timezone boundaries), `quickAdd`, `focusTimer`, `undo`, edge-function pure helpers.
- Component: `QuickAddBar`/Capture sheet (multi-add), `BottomSheet` (focus trap, Escape), `HabitRow` (not-due state), `TaskForm` (validation).
- E2E (Playwright, optional): sign in with a seeded test user, add task, complete it, tick habit, run a 1-minute focus session with a mocked clock.

### P5-2 Performance
- Check bundle with `rollup-plugin-visualizer`; lazy-load `recharts` only on Analytics/Weekly; split vendor chunks.
- Virtualize long lists (Tasks) if > 200 items (`@tanstack/react-virtual`).
- Add DB indexes found via advisors (`daily_todos(user_id,date)`, `habit_logs(user_id,date)`, `tasks(user_id,status,due_date)`).
- Remove N+1 loops in edge functions (done in P1-7/8).

### P5-3 Accessibility audit
Run axe/Lighthouse on every route in light and dark; fix all serious/critical issues; keyboard-only walkthrough of: sign in, add task, complete, delete with undo, edit habit, run focus session, change settings. Test with VoiceOver/TalkBack for the capture sheet and bottom sheets.

### P5-4 Security review
- All new tables have RLS with `user_id = auth.uid()`; policies for `select/insert/update/delete`.
- Service-role key only in edge functions; never in `VITE_*`.
- Edge functions that act on user data verify the caller's JWT; scheduled ones require a secret header.
- Run Supabase advisors again; fix findings.
- Confirm the delete-account flow removes all rows (cascades).

### P5-5 Release checklist
- Manual test matrix: iOS Safari (installed PWA), Android Chrome (installed), desktop Chrome/Edge/Firefox; light/dark; offline; low-end throttling.
- Verify cron jobs (hourly reset, hourly weekly-review, 15-min reminders) in Supabase dashboard; test with a user whose timezone is far from UTC (Asia/Kolkata, America/Los_Angeles, Pacific/Auckland).
- Update README screenshots, `docs/CHANGELOG.md`, tag `v1.0.0`; show the real version in Settings (from `package.json` via Vite define) instead of the hard-coded string.

---

## Appendix A — Migration SQL (adapt to the real baseline from P0-3)

```sql
-- 0001_timezone.sql
alter table public.profiles add column if not exists timezone text not null default 'UTC';

-- 0002_reset_tracking.sql
alter table public.profiles add column if not exists last_reset_date date;
alter table public.profiles add column if not exists last_weekly_date date;
alter table public.profiles add column if not exists last_reminder_date date;

-- 0003_daily_extras.sql
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
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
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

-- 0004_push.sql
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "own push subs" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.profiles
  add column if not exists weekly_reminder_on boolean not null default true,
  add column if not exists weekly_reminder_day smallint not null default 0,
  add column if not exists weekly_reminder_time time not null default '18:00';

-- 0005_focus.sql
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  task_id uuid references public.tasks(id) on delete set null,
  kind text not null default 'focus' check (kind in ('focus','break')),
  planned_seconds int not null check (planned_seconds > 0),
  actual_seconds int,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running' check (status in ('running','paused','completed','stopped')),
  interruptions int not null default 0,
  note text
);
create index if not exists focus_sessions_user_started on public.focus_sessions (user_id, started_at desc);
alter table public.focus_sessions enable row level security;
create policy "own focus sessions" on public.focus_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter publication supabase_realtime add table public.focus_sessions;

-- 0007_courses.sql
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null, code text, color text not null default '#6366f1',
  archived boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.timetable_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null, end_time time not null, location text
);
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  course_id uuid references public.courses(id) on delete set null,
  title text not null, exam_date date not null, exam_time time, location text, weight_pct int
);
alter table public.tasks add column if not exists course_id uuid references public.courses(id) on delete set null;
-- enable RLS + "own rows" policy on courses, timetable_slots, exams (same pattern as above)

-- subtasks + recurrence (0006/0009)
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null, done boolean not null default false, sort_order int not null default 0
);
alter table public.tasks add column if not exists recurrence_rule text;
alter table public.tasks add column if not exists recurrence_until date;
-- enable RLS + policy; write complete_task(p_task_id) as a SECURITY INVOKER function.

-- 0008_search.sql
create extension if not exists pg_trgm;
create index if not exists tasks_title_trgm on public.tasks using gin (title gin_trgm_ops);
```

## Appendix B — Suggested file/folder layout after the work

```
src/
  providers/AuthProvider.tsx, ThemeProvider.tsx
  stores/focusStore.ts
  lib/ cn.ts dates.ts habits.ts quickAdd.ts focusTimer.ts theme.ts push.ts undo.tsx sound.ts constants.ts
  hooks/ useAuth.ts useToday.ts useWakeLock.ts useFocusSessions.ts useCourses.ts useSubtasks.ts …
  components/
    layout/ AppLayout.tsx BottomNav.tsx Sidebar.tsx TopBar.tsx CaptureButton.tsx OfflineBanner.tsx ErrorBoundary.tsx
    ui/ Button Input Textarea Select Card SectionHeader Chip Badge IconButton BottomSheet Toggle CheckboxRing EmptyState Skeleton
    tasks/ daily/ habits/ focus/ courses/ weekly/ analytics/
  pages/ Auth ResetPassword Home Daily Vault Habits Focus FocusRun Weekly Analytics Courses CourseDetail Search Settings NotFound
  sw.ts
supabase/
  migrations/ 0000_baseline.sql … 0009_*.sql
  functions/ _shared/ daily-reset/ weekly-review/ send-reminders/ delete-account/
docs/ SCHEMA.md DECISIONS.md CHANGELOG.md UI.md
```

## Appendix C — Suggested order if time is short
1. Week 1: P0-1, P0-3, P0-5, P1-1, P1-2, P1-3, P1-5, P1-6, P1-9, P1-10, P1-11.
2. Week 2: P1-4, P1-7, P1-8, P1-12, P1-13, P2-1, P2-2, P2-3, P3-10.
3. Week 3: P3-2, P3-3, P3-4, P3-5, P3-6.
4. Week 4: P4-1 (Focus), P2-4 (push), P3-7, P3-8, P3-9.
5. After that: P4-2 → P4-7, P2-5 (offline), then Phase 5.
