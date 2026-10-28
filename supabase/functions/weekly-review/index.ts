import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  getUserLocalDate,
  getLastCompletedWeekRange,
  isWeeklyReviewWindow,
  localMidnightToUtcIso,
  getDaysInWeek,
  computeHabitsDueInWeek,
} from '../_shared/dates.ts'
import { isAuthorizedCron, unauthorized } from '../_shared/auth.ts'

// @ts-ignore
Deno.serve(async (req: any) => {
  if (!isAuthorizedCron(req)) return unauthorized()

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, timezone, last_weekly_date')

  if (profilesError) {
    console.error('Failed to fetch user profiles for weekly review:', profilesError)
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0
  let skipped = 0
  const errors: { userId: string; error: string }[] = []
  const now = new Date()

  for (const profile of profiles ?? []) {
    const uid = profile.id
    const userTz = profile.timezone || 'UTC'
    const localToday = getUserLocalDate(userTz, now)

    // Process only if it is Monday 00:00 - 05:59 in the user's timezone
    if (!isWeeklyReviewWindow(userTz, now)) {
      skipped++
      continue
    }

    // Idempotency: Process each user only once on that Monday
    if (profile.last_weekly_date && profile.last_weekly_date >= localToday) {
      skipped++
      continue
    }

    try {
      const { weekStart, weekEnd, nextWeekStart } = getLastCompletedWeekRange(userTz, now)

      // Half-open range in user's timezone converted to UTC ISO strings:
      // completed_at >= weekStart (00:00:00) AND completed_at < nextWeekStart (00:00:00)
      const weekStartUtcIso = localMidnightToUtcIso(weekStart, userTz)
      const nextWeekStartUtcIso = localMidnightToUtcIso(nextWeekStart, userTz)

      // 1. Completed tasks in the half-open range
      const { count: completedCount, error: completedError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('status', 'done')
        .gte('completed_at', weekStartUtcIso)
        .lt('completed_at', nextWeekStartUtcIso)

      if (completedError) throw completedError

      // 2. Missed tasks: due that week and not completed at week end
      const { count: missedCount, error: missedError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .neq('status', 'done')
        .gte('due_date', weekStart)
        .lte('due_date', weekEnd)

      if (missedError) throw missedError

      // 3. Habit stats for the week
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('id, frequency, custom_days, created_at')
        .eq('user_id', uid)
        .eq('active', true)

      if (habitsError) throw habitsError

      const weekDays = getDaysInWeek(weekStart)
      const { totalDue: habitsDue } = computeHabitsDueInWeek(habits ?? [], weekDays)

      const { count: habitsDoneCount, error: habitLogsError } = await supabase
        .from('habit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('completed', true)

      if (habitLogsError) throw habitLogsError

      // 4. Carried over todos count
      const { count: carriedCount, error: carryError } = await supabase
        .from('daily_todos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('carry_over', true)

      if (carryError) throw carryError

      const tasksCompleted = completedCount ?? 0
      const tasksMissed = missedCount ?? 0
      const totalTasks = tasksCompleted + tasksMissed
      const taskCompletionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0

      const habitsDone = habitsDoneCount ?? 0
      const habitCompletionRate = habitsDue > 0 ? Math.round((habitsDone / habitsDue) * 100) : 0

      // 5. Upsert weekly_reviews record
      const { error: upsertError } = await supabase.from('weekly_reviews').upsert(
        {
          user_id: uid,
          week_start: weekStart,
          tasks_completed: tasksCompleted,
          tasks_missed: tasksMissed,
          completion_rate: taskCompletionRate,
          habits_due: habitsDue,
          habits_done: habitsDone,
          habit_completion_rate: habitCompletionRate,
          carried_over_count: carriedCount ?? 0,
          focus_minutes: 0,
        },
        { onConflict: 'user_id,week_start' }
      )

      if (upsertError) throw upsertError

      // 6. Update user's last_weekly_date to prevent duplicate runs
      const { error: markError } = await supabase
        .from('profiles')
        .update({ last_weekly_date: localToday })
        .eq('id', uid)
      if (markError) throw markError

      processed++
    } catch (err: any) {
      console.error(`Error processing weekly review for user ${uid}:`, err)
      errors.push({ userId: uid, error: err?.message || 'Unknown error' })
    }
  }

  return new Response(JSON.stringify({ processed, skipped, errors }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
