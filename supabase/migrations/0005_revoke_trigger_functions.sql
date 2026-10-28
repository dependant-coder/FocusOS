-- 0005_revoke_trigger_functions.sql
-- Revoke direct execution permissions from API roles on internal trigger functions

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_pin_to_today() from public, anon, authenticated;
revoke execute on function public.handle_daily_todo_complete() from public, anon, authenticated;
revoke execute on function public.sync_task_changes_to_daily() from public, anon, authenticated;

-- Revoke rls_auto_enable if it exists in public schema
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
