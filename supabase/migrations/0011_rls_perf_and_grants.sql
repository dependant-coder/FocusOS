-- 0011_rls_perf_and_grants.sql
-- Optimizes RLS evaluation performance by replacing per-row `auth.uid()` evaluation with `(select auth.uid())`.
-- Adds missing table grants to authenticated and service_role, and indexes unindexed foreign key lookups.

-- 1. Profiles RLS optimization
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = (select auth.uid()));

-- 2. Tasks RLS optimization
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (user_id = (select auth.uid()));

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (user_id = (select auth.uid()));

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (user_id = (select auth.uid()));

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (user_id = (select auth.uid()));

-- 3. Daily Todos RLS optimization
drop policy if exists daily_select on public.daily_todos;
create policy daily_select on public.daily_todos
  for select using (user_id = (select auth.uid()));

drop policy if exists daily_insert on public.daily_todos;
create policy daily_insert on public.daily_todos
  for insert with check (user_id = (select auth.uid()));

drop policy if exists daily_update on public.daily_todos;
create policy daily_update on public.daily_todos
  for update using (user_id = (select auth.uid()));

drop policy if exists daily_delete on public.daily_todos;
create policy daily_delete on public.daily_todos
  for delete using (user_id = (select auth.uid()));

-- 4. Habits RLS optimization
drop policy if exists habits_all on public.habits;
create policy habits_all on public.habits
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 5. Habit Logs RLS optimization
drop policy if exists habit_logs_all on public.habit_logs;
create policy habit_logs_all on public.habit_logs
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 6. Weekly Reviews RLS optimization
drop policy if exists weekly_all on public.weekly_reviews;
create policy weekly_all on public.weekly_reviews
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 7. Push Subscriptions RLS optimization
drop policy if exists "Users can select own push subscriptions" on public.push_subscriptions;
create policy "Users can select own push subscriptions" on public.push_subscriptions
  for select using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
create policy "Users can insert own push subscriptions" on public.push_subscriptions
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions" on public.push_subscriptions
  for update using (user_id = (select auth.uid()));

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions" on public.push_subscriptions
  for delete using (user_id = (select auth.uid()));

-- 8. Explicit table grants for API roles
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.daily_todos to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;
grant select, insert, update, delete on public.weekly_reviews to authenticated;

grant all on public.profiles to service_role;
grant all on public.tasks to service_role;
grant all on public.habits to service_role;
grant all on public.daily_todos to service_role;
grant all on public.habit_logs to service_role;
grant all on public.weekly_reviews to service_role;

-- 9. Foreign Key & Query Performance Indexes
create index if not exists daily_todos_habit_id_idx on public.daily_todos(habit_id);
create index if not exists habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index if not exists weekly_reviews_user_id_idx on public.weekly_reviews(user_id);
