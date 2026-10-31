import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
// @ts-ignore
import webPush from 'npm:web-push'
import { isAuthorizedCron, unauthorized } from '../_shared/auth.ts'
import { getUserLocalDate, getUserDayName, getUserDayOfWeek } from '../_shared/dates.ts'

interface PushPayload {
  title: string
  body: string
  url?: string
}

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

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@focusos.app'

  // Fail loudly: without VAPID keys nothing can be delivered, and we must NOT mark reminders as sent.
  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys are not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select(
      'id, timezone, notif_on, notif_time, last_reminder_date, weekly_reminder_on, weekly_reminder_time, weekly_reminder_day, last_weekly_reminder_date'
    )
    .eq('notif_on', true)

  if (profilesError) {
    console.error('Failed to fetch user profiles for reminders:', profilesError)
    return new Response(JSON.stringify({ error: profilesError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0
  let remindersSent = 0
  let weeklyRemindersSent = 0
  let deadSubscriptionsRemoved = 0
  const errors: { userId: string; error: string }[] = []
  const now = new Date()

  const localMinutes = (tz: string): number => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false,
      }).formatToParts(now)
      const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24
      const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
      return h * 60 + m
    } catch {
      return now.getUTCHours() * 60 + now.getUTCMinutes()
    }
  }
  const toMinutes = (t: string | null | undefined, fallback: string): number => {
    const [h = '0', m = '0'] = (t || fallback).split(':')
    return parseInt(h, 10) * 60 + parseInt(m, 10)
  }
  const inWindow = (nowMin: number, targetMin: number) => nowMin >= targetMin && nowMin < targetMin + 15

  // Returns how many pushes were delivered; removes dead subscriptions (404/410).
  const sendToAll = async (subs: any[], payload: PushPayload) => {
    let delivered = 0
    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        delivered++
      } catch (sendErr: any) {
        if (sendErr?.statusCode === 404 || sendErr?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          deadSubscriptionsRemoved++
        } else {
          console.error('Push send error:', sendErr?.statusCode, sendErr?.body || sendErr?.message)
        }
      }
    }
    return delivered
  }

  for (const profile of profiles ?? []) {
    const uid = profile.id
    const userTz = profile.timezone || 'UTC'
    const localToday = getUserLocalDate(userTz, now)
    const dayName = getUserDayName(userTz, now)
    const nowMin = localMinutes(userTz)

    const dailyDue =
      profile.last_reminder_date !== localToday && inWindow(nowMin, toMinutes(profile.notif_time, '08:00:00'))
    const weeklyDue =
      profile.weekly_reminder_on !== false &&
      profile.last_weekly_reminder_date !== localToday &&
      getUserDayOfWeek(userTz, now) === (profile.weekly_reminder_day ?? 0) &&
      inWindow(nowMin, toMinutes(profile.weekly_reminder_time, '18:00:00'))

    if (!dailyDue && !weeklyDue) continue

    try {
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', uid)
      if (subError) throw subError
      if (!subscriptions || subscriptions.length === 0) continue

      if (dailyDue) {
        const { count: tasksDueCount, error: taskError } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('due_date', localToday)
          .neq('status', 'done')
        if (taskError) throw taskError

        const isWeekday = !['sat', 'sun'].includes(dayName)
        const isWeekend = ['sat', 'sun'].includes(dayName)
        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('id, frequency, custom_days')
          .eq('user_id', uid)
          .eq('active', true)
        if (habitsError) throw habitsError

        const dueHabitIds = (habits ?? [])
          .filter((h: any) => {
            if (h.frequency === 'daily') return true
            if (h.frequency === 'weekdays' && isWeekday) return true
            if (h.frequency === 'weekends' && isWeekend) return true
            if (h.frequency === 'custom' && h.custom_days?.includes(dayName)) return true
            return false
          })
          .map((h: any) => h.id)

        let pendingHabitsCount = 0
        if (dueHabitIds.length > 0) {
          const { count: completed, error: logErr } = await supabase
            .from('habit_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('date', localToday)
            .eq('completed', true)
            .in('habit_id', dueHabitIds)
          if (logErr) throw logErr
          pendingHabitsCount = Math.max(0, dueHabitIds.length - (completed ?? 0))
        }

        const totalTasks = tasksDueCount ?? 0
        let shouldMark = true
        if (totalTasks + pendingHabitsCount > 0) {
          const partsMsg: string[] = []
          if (totalTasks > 0) partsMsg.push(`${totalTasks} task${totalTasks === 1 ? '' : 's'}`)
          if (pendingHabitsCount > 0) partsMsg.push(`${pendingHabitsCount} habit${pendingHabitsCount === 1 ? '' : 's'}`)
          const delivered = await sendToAll(subscriptions, {
            title: 'Daily FocusOS Reminder',
            body: `${partsMsg.join(' and ')} scheduled for today.`,
            url: '/daily',
          })
          remindersSent += delivered
          // Only mark as sent if something was delivered; otherwise retry on the next run in this window.
          shouldMark = delivered > 0
        }
        if (shouldMark) {
          const { error: markError } = await supabase
            .from('profiles').update({ last_reminder_date: localToday }).eq('id', uid)
          if (markError) throw markError
        }
      }

      if (weeklyDue) {
        const delivered = await sendToAll(subscriptions, {
          title: 'Weekly review time',
          body: 'Take a few minutes to review your week.',
          url: '/weekly',
        })
        weeklyRemindersSent += delivered
        if (delivered > 0) {
          const { error: markError } = await supabase
            .from('profiles').update({ last_weekly_reminder_date: localToday }).eq('id', uid)
          if (markError) throw markError
        }
      }
      processed++
    } catch (err: any) {
      console.error(`Error in send-reminders for user ${uid}:`, err)
      errors.push({ userId: uid, error: err?.message || 'Unknown error' })
    }
  }

  return new Response(
    JSON.stringify({ processed, remindersSent, weeklyRemindersSent, deadSubscriptionsRemoved, errors }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
