-- 0011_rls_perf_and_grants.sql
-- 1. Missing FK index (also used by the habit-delete cleanup trigger)
create index if not exists daily_todos_habit_id_idx on public.daily_todos(habit_id) where habit_id is not null;

-- 2. RLS initplan: evaluate auth.uid() once per statement instead of once per row (behaviour identical)
alter policy profiles_select_own on public.profiles using ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles using ((select auth.uid()) = id);

alter policy tasks_select on public.tasks using ((select auth.uid()) = user_id);
alter policy tasks_insert on public.tasks with check ((select auth.uid()) = user_id);
alter policy tasks_update on public.tasks using ((select auth.uid()) = user_id);
alter policy tasks_delete on public.tasks using ((select auth.uid()) = user_id);

alter policy daily_select on public.daily_todos using ((select auth.uid()) = user_id);
alter policy daily_insert on public.daily_todos with check ((select auth.uid()) = user_id);
alter policy daily_update on public.daily_todos using ((select auth.uid()) = user_id);
alter policy daily_delete on public.daily_todos using ((select auth.uid()) = user_id);

alter policy habits_all on public.habits using ((select auth.uid()) = user_id);
alter policy habit_logs_all on public.habit_logs using ((select auth.uid()) = user_id);
alter policy weekly_all on public.weekly_reviews using ((select auth.uid()) = user_id);

alter policy "Users can select own push subscriptions" on public.push_subscriptions using ((select auth.uid()) = user_id);
alter policy "Users can insert own push subscriptions" on public.push_subscriptions with check ((select auth.uid()) = user_id);
alter policy "Users can update own push subscriptions" on public.push_subscriptions using ((select auth.uid()) = user_id);
alter policy "Users can delete own push subscriptions" on public.push_subscriptions using ((select auth.uid()) = user_id);

-- 3. Least privilege: the app never reads tables as the anonymous role, and no client needs TRUNCATE/TRIGGER/REFERENCES.
revoke all on all tables in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
