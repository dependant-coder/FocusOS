import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'

// @ts-ignore
Deno.serve(async (req: any) => {
  const supabase = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL')!,
    // @ts-ignore
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
