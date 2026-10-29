import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore
import { createClient } from 'npm:@supabase/supabase-js@2'
// @ts-ignore
import webPush from 'npm:web-push'
import { isAuthorizedCron, unauthorized } from '../_shared/auth.ts'
import { getUserLocalDate, getUserDayName } from '../_shared/dates.ts'

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

  if (vapidPublicKey && vapidPrivateKey) {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // 1. Fetch profiles with notifications enabled
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, timezone, notif_on, notif_time, last_reminder_date, weekly_reminder_on, weekly_reminder_time, weekly_reminder_day')
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
  let deadSubscriptionsRemoved = 0
  const errors: { userId: string; error: string }[] = []
  const now = new Date()

  for (const profile of profiles ?? []) {
    const uid = profile.id
    const userTz = profile.timezone || 'UTC'
    const localToday = getUserLocalDate(userTz, now)
    const dayName = getUserDayName(userTz, now)

    // Calculate user's current local hour and minute
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
    const currentMinutesTotal = currentHour * 60 + currentMinute

    // Target daily reminder time (default 08:00)
    const notifTimeStr = profile.notif_time || '08:00:00'
    const [targetHourStr = '8', targetMinStr = '0'] = notifTimeStr.split(':')
    const targetMinutesTotal = parseInt(targetHourStr, 10) * 60 + parseInt(targetMinStr, 10)

    // Check if within 15-minute window and not yet sent today
    const inDailyWindow =
      profile.last_reminder_date !== localToday &&
      currentMinutesTotal >= targetMinutesTotal &&
      currentMinutesTotal < targetMinutesTotal + 15

    if (!inDailyWindow) {
      continue
    }

    try {
      // Fetch user's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', uid)

      if (subError) throw subError
      if (!subscriptions || subscriptions.length === 0) {
        continue
      }

      // Count tasks due today that are not done
      const { count: tasksDueCount, error: taskError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('due_date', localToday)
        .neq('status', 'done')

      if (taskError) throw taskError

      // Fetch habits due today
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

      // Count habits already completed today
      let pendingHabitsCount = 0
      if (dueHabitIds.length > 0) {
        const { count: completedHabitsCount } = await supabase
          .from('habit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid)
          .eq('date', localToday)
          .eq('completed', true)
          .in('habit_id', dueHabitIds)

        pendingHabitsCount = Math.max(0, dueHabitIds.length - (completedHabitsCount ?? 0))
      }

      const totalTasks = tasksDueCount ?? 0
      const totalPending = totalTasks + pendingHabitsCount

      // Skip sending if nothing is due today
      if (totalPending === 0) {
        // Mark as processed today so we don't re-check every 15 min
        await supabase.from('profiles').update({ last_reminder_date: localToday }).eq('id', uid)
        processed++
        continue
      }

      // Construct notification message
      const partsMsg: string[] = []
      if (totalTasks > 0) partsMsg.push(`${totalTasks} task${totalTasks === 1 ? '' : 's'}`)
      if (pendingHabitsCount > 0) partsMsg.push(`${pendingHabitsCount} habit${pendingHabitsCount === 1 ? '' : 's'}`)
      const bodyText = `${partsMsg.join(' and ')} scheduled for today.`

      const payload: PushPayload = {
        title: 'Daily FocusOS Reminder',
        body: bodyText,
        url: '/daily',
      }

      // Dispatch to subscriptions
      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          if (vapidPublicKey && vapidPrivateKey) {
            await webPush.sendNotification(pushSubscription, JSON.stringify(payload))
            remindersSent++
          }
        } catch (sendErr: any) {
          // If status is 404 or 410 (Gone), delete dead subscription
          if (sendErr?.statusCode === 404 || sendErr?.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
            deadSubscriptionsRemoved++
          } else {
            console.error(`Push send error for user ${uid}:`, sendErr)
          }
        }
      }

      // Update user's last_reminder_date
      const { error: markError } = await supabase
        .from('profiles')
        .update({ last_reminder_date: localToday })
        .eq('id', uid)

      if (markError) throw markError
      processed++
    } catch (err: any) {
      console.error(`Error in send-reminders for user ${uid}:`, err)
      errors.push({ userId: uid, error: err?.message || 'Unknown error' })
    }
  }

  return new Response(
    JSON.stringify({
      processed,
      remindersSent,
      deadSubscriptionsRemoved,
      errors,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
