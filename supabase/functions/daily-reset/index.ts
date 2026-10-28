import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  getUserLocalDate,
  getUserDayName,
  addDaysToDateString,
} from '../_shared/dates.ts'
import { isAuthorizedCron, unauthorized } from '../_shared/auth.ts'

// Only carry unfinished items from the last N days; older ones are considered abandoned.
const CARRY_WINDOW_DAYS = 7

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
    .select('id, timezone, last_reset_date')

  if (profilesError) {
    console.error('Failed to fetch user profiles:', profilesError)
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0
  let skipped = 0
  const errors: { userId: string; error: string }[] = []

  for (const profile of profiles ?? []) {
    const uid = profile.id
    const userTz = profile.timezone || 'UTC'
    const localToday = getUserLocalDate(userTz)

    // Idempotency: Process a user only if they have not been reset for localToday yet
    if (profile.last_reset_date && profile.last_reset_date >= localToday) {
      skipped++
      continue
    }

    try {
      const dayName = getUserDayName(userTz)
      const isWeekday = !['sat', 'sun'].includes(dayName)
      const isWeekend = ['sat', 'sun'].includes(dayName)

      // Fetch today's existing todos to avoid redundant work
      const { data: existingToday } = await supabase
        .from('daily_todos')
        .select('task_id, habit_id, title, type')
        .eq('user_id', uid)
        .eq('date', localToday)

      const existingTaskIds = new Set((existingToday ?? []).map((t: any) => t.task_id).filter(Boolean))
      const existingHabitIds = new Set((existingToday ?? []).map((t: any) => t.habit_id).filter(Boolean))
      const existingTitles = new Set((existingToday ?? []).map((t: any) => t.title))

      // 1. Carry over: unfinished non-habit todos from prior dates (date < localToday)
      const { data: unresolvedTodos, error: carryError } = await supabase
        .from('daily_todos')
        .select('*, tasks(status)')
        .eq('user_id', uid)
        .lt('date', localToday)
        .gte('date', addDaysToDateString(localToday, -CARRY_WINDOW_DAYS))
        .eq('done', false)
        .neq('type', 'habit')
        .order('date', { ascending: false })

      if (carryError) throw carryError

      const carryBatch: any[] = []
      const seenCarryKeys = new Set<string>()

      for (const todo of unresolvedTodos ?? []) {
        // Never resurrect an item whose underlying task is already done
        if (todo.tasks?.status === 'done') continue
        if (todo.task_id && (existingTaskIds.has(todo.task_id) || seenCarryKeys.has(`task:${todo.task_id}`))) {
          continue
        }
        if (!todo.task_id && (existingTitles.has(todo.title) || seenCarryKeys.has(`title:${todo.title}`))) {
          continue
        }

        const carryCount = (Number(todo.carry_count) || 0) + 1
        carryBatch.push({
          user_id: uid,
          task_id: todo.task_id || null,
          title: todo.title,
          type: todo.type || 'adhoc',
          done: false,
          date: localToday,
          priority: todo.priority || null,
          category: todo.category || null,
          carry_over: true,
          carry_count: carryCount,
          must_do: false,
        })

        if (todo.task_id) {
          seenCarryKeys.add(`task:${todo.task_id}`)
        } else {
          seenCarryKeys.add(`title:${todo.title}`)
        }
      }

      if (carryBatch.length > 0) {
        // Upsert tasks with task_id conflict, insert ad-hoc with ignoreDuplicates
        const taskCarries = carryBatch.filter((t) => t.task_id !== null)
        const adhocCarries = carryBatch.filter((t) => t.task_id === null)

        if (taskCarries.length > 0) {
          const { error } = await supabase.from('daily_todos').upsert(taskCarries, {
            onConflict: 'user_id,task_id,date',
          })
          if (error) throw error
        }
        // Ad-hoc rows are protected by a PARTIAL unique index, which PostgREST upsert cannot target.
        // Plain insert; a unique violation (23505) just means it was already carried, so retry row-by-row.
        if (adhocCarries.length > 0) {
          const { error } = await supabase.from('daily_todos').insert(adhocCarries)
          if (error) {
            if (error.code !== '23505') throw error
            for (const row of adhocCarries) {
              const { error: rowErr } = await supabase.from('daily_todos').insert(row)
              if (rowErr && rowErr.code !== '23505') throw rowErr
            }
          }
        }
      }

      // 2. Surface tasks due today
      const { data: dueTasks, error: dueError } = await supabase
        .from('tasks')
        .select('id, title, priority, category')
        .eq('user_id', uid)
        .eq('due_date', localToday)
        .neq('status', 'done')

      if (dueError) throw dueError

      const dueBatch: any[] = []
      for (const task of dueTasks ?? []) {
        if (existingTaskIds.has(task.id) || seenCarryKeys.has(`task:${task.id}`)) continue
        dueBatch.push({
          user_id: uid,
          task_id: task.id,
          title: task.title,
          type: 'due_today',
          done: false,
          date: localToday,
          priority: task.priority,
          category: task.category,
          carry_over: false,
          carry_count: 0,
          must_do: false,
        })
      }

      if (dueBatch.length > 0) {
        const { error } = await supabase.from('daily_todos').upsert(dueBatch, {
          onConflict: 'user_id,task_id,date',
        })
        if (error) throw error
      }

      // 3. Inject habits matching today's frequency
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', uid)
        .eq('active', true)

      if (habitsError) throw habitsError

      const habitTodoBatch: any[] = []
      const habitLogBatch: any[] = []

      for (const habit of habits ?? []) {
        const include =
          habit.frequency === 'daily' ||
          (habit.frequency === 'weekdays' && isWeekday) ||
          (habit.frequency === 'weekends' && isWeekend) ||
          (habit.frequency === 'custom' && habit.custom_days?.includes(dayName))

        if (!include) continue

        if (!existingHabitIds.has(habit.id)) {
          habitTodoBatch.push({
            user_id: uid,
            habit_id: habit.id,
            title: habit.name,
            type: 'habit',
            done: false,
            date: localToday,
            carry_over: false,
            carry_count: 0,
            must_do: false,
          })
        }

        habitLogBatch.push({
          habit_id: habit.id,
          user_id: uid,
          date: localToday,
          completed: false,
        })
      }

      if (habitTodoBatch.length > 0) {
        const { error } = await supabase.from('daily_todos').upsert(habitTodoBatch, {
          onConflict: 'user_id,habit_id,date',
        })
        if (error) throw error
      }

      if (habitLogBatch.length > 0) {
        const { error } = await supabase.from('habit_logs').upsert(habitLogBatch, {
          onConflict: 'habit_id,date',
          ignoreDuplicates: true,
        })
        if (error) throw error
      }

      // Mark user profile as reset for localToday
      const { error: markError } = await supabase
        .from('profiles')
        .update({ last_reset_date: localToday })
        .eq('id', uid)
      if (markError) throw markError

      processed++
    } catch (err: any) {
      console.error(`Error during daily reset for user ${uid}:`, err)
      errors.push({ userId: uid, error: err?.message || 'Unknown error' })
    }
  }

  return new Response(JSON.stringify({ processed, skipped, errors }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
