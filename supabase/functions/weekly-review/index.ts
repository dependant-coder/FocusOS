import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables')
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Last Monday → last Sunday
  const now = new Date()
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - now.getDay() - 6)
  const weekStart = lastMonday.toISOString().split('T')[0]
  const weekEnd   = new Date(lastMonday.getTime() + 6 * 86400000).toISOString().split('T')[0]

  const { data: users, error: usersError } = await supabase.from('profiles').select('id')

  if (usersError) {
    console.error('Error fetching users:', usersError)
    return new Response(JSON.stringify({ error: usersError }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (const user of users ?? []) {
    const uid = user.id

    const { count: completed, error: completedError } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid).eq('status', 'done')
      .gte('updated_at', weekStart).lte('updated_at', weekEnd)

    if (completedError) {
      console.error(`Error fetching completed tasks for user ${uid}:`, completedError)
      continue
    }

    const { count: missed, error: missedError } = await supabase.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid).neq('status', 'done')
      .gte('due_date', weekStart).lte('due_date', weekEnd)

    if (missedError) {
      console.error(`Error fetching missed tasks for user ${uid}:`, missedError)
      continue
    }

    const total = (completed ?? 0) + (missed ?? 0)
    const rate  = total > 0 ? Math.round(((completed ?? 0) / total) * 100) : 0

    const { error: upsertError } = await supabase.from('weekly_reviews').upsert({
      user_id: uid, week_start: weekStart,
      tasks_completed: completed ?? 0,
      tasks_missed: missed ?? 0,
      completion_rate: rate,
    }, { onConflict: 'user_id,week_start' })

    if (upsertError) {
      console.error(`Error upserting weekly review for user ${uid}:`, upsertError)
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
