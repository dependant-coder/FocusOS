import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { todayLocal, localDateString, addDaysLocal } from './dates'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasValidEnv = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  !rawSupabaseUrl.includes('placeholder') &&
  rawSupabaseUrl.startsWith('http')
)

// In-memory + localStorage Mock Client for AI Studio standalone execution
function createMockSupabaseClient() {
  console.info('[FocusOS] Running in local offline mode (in-memory & localStorage storage active)')

  const STORAGE_PREFIX = 'focusos_mock_'
  const todayStr = todayLocal()

  const getStorage = <T>(key: string, defaultVal: T): T => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key)
      return item ? JSON.parse(item) : defaultVal
    } catch {
      return defaultVal
    }
  }

  const setStorage = <T>(key: string, val: T): void => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val))
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  const DEMO_USER_ID = 'demo-student-id'
  const defaultUser = {
    id: DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'alex.rivera@focusos.dev',
    user_metadata: {
      full_name: 'Alex Rivera',
      avatar_url: '',
    },
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  }

  // Generate recent Monday dates for weekly reviews
  const getRecentMondays = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(d.setDate(diff))
    const mondays: string[] = []
    for (let i = 0; i < 5; i++) {
      const m = new Date(monday)
      m.setDate(monday.getDate() - i * 7)
      mondays.push(localDateString(m))
    }
    return mondays
  }
  const recentMondays = getRecentMondays()

  // Generate 30 days of habit logs with consistent streaks
  const generateInitialHabitLogs = () => {
    const logs: Database['public']['Tables']['habit_logs']['Row'][] = []
    const habitIds = ['habit-1', 'habit-2', 'habit-3']
    for (let i = 0; i < 30; i++) {
      const dateStr = addDaysLocal(todayStr, -i)
      habitIds.forEach((hId, index) => {
        // High completion rate (80%+) for realistic analytics
        const isCompleted = (i + index) % 5 !== 0
        logs.push({
          id: `log-${hId}-${dateStr}`,
          habit_id: hId,
          user_id: DEMO_USER_ID,
          date: dateStr,
          completed: isCompleted,
        })
      })
    }
    return logs
  }

  // Initial Seeds
  if (!localStorage.getItem(STORAGE_PREFIX + 'initialized')) {
    const initialTasks: Database['public']['Tables']['tasks']['Row'][] = [
      {
        id: 'task-1',
        user_id: DEMO_USER_ID,
        title: 'Complete CS 101 Problem Set 3',
        description: 'Implement binary search tree algorithms and edge case unit tests.',
        category: 'college',
        priority: 'critical',
        status: 'in_progress',
        due_date: todayStr,
        energy_level: 'high',
        pin_to_today: true,
        is_overdue: false,
        auto_escalate: true,
        resources_url: 'https://cs.university.edu/hw3',
        completed_at: null,
        due_time: '17:00:00',
        estimate_min: 90,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-2',
        user_id: DEMO_USER_ID,
        title: 'Biology 204 Lab Report — Cellular Respiration',
        description: 'Format spectrophotometer charts and draft discussion section.',
        category: 'college',
        priority: 'high',
        status: 'not_started',
        due_date: addDaysLocal(todayStr, 2),
        energy_level: 'medium',
        pin_to_today: false,
        is_overdue: false,
        auto_escalate: true,
        resources_url: null,
        completed_at: null,
        due_time: '23:59:00',
        estimate_min: 60,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-3',
        user_id: DEMO_USER_ID,
        title: 'Review React 19 Architecture Patterns',
        description: 'Analyze server actions, useActionState, and compiler optimization rules.',
        category: 'skill',
        priority: 'medium',
        status: 'not_started',
        due_date: null,
        energy_level: 'high',
        pin_to_today: false,
        is_overdue: false,
        auto_escalate: false,
        resources_url: 'https://react.dev/blog',
        completed_at: null,
        due_time: null,
        estimate_min: 45,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-4',
        user_id: DEMO_USER_ID,
        title: 'Schedule Annual Wellness Checkup',
        description: 'Book morning appointment at campus student health center.',
        category: 'personal',
        priority: 'low',
        status: 'done',
        due_date: addDaysLocal(todayStr, -1),
        energy_level: 'low',
        pin_to_today: false,
        is_overdue: false,
        auto_escalate: false,
        resources_url: null,
        completed_at: new Date(Date.now() - 86400000).toISOString(),
        due_time: '09:00:00',
        estimate_min: 15,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const initialHabits: Database['public']['Tables']['habits']['Row'][] = [
      {
        id: 'habit-1',
        user_id: DEMO_USER_ID,
        name: 'Hydrate 2.5L Water',
        icon: '💧',
        frequency: 'daily',
        custom_days: [],
        active: true,
        sort_order: 1,
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: 'habit-2',
        user_id: DEMO_USER_ID,
        name: 'Morning Workout / Jog',
        icon: '🏃',
        frequency: 'weekdays',
        custom_days: [],
        active: true,
        sort_order: 2,
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: 'habit-3',
        user_id: DEMO_USER_ID,
        name: 'Read 20 Mins',
        icon: '📚',
        frequency: 'daily',
        custom_days: [],
        active: true,
        sort_order: 3,
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
    ]

    const initialDailyTodos: Database['public']['Tables']['daily_todos']['Row'][] = [
      {
        id: 'dt-1',
        user_id: DEMO_USER_ID,
        task_id: 'task-1',
        habit_id: null,
        title: 'Complete CS 101 Problem Set 3',
        type: 'pinned',
        category: 'college',
        priority: 'critical',
        done: false,
        date: todayStr,
        carry_over: false,
        carry_count: 0,
        must_do: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dt-2',
        user_id: DEMO_USER_ID,
        task_id: null,
        habit_id: 'habit-1',
        title: 'Hydrate 2.5L Water',
        type: 'habit',
        category: 'personal',
        priority: 'medium',
        done: true,
        date: todayStr,
        carry_over: false,
        carry_count: 0,
        must_do: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dt-3',
        user_id: DEMO_USER_ID,
        task_id: null,
        habit_id: 'habit-2',
        title: 'Morning Workout / Jog',
        type: 'habit',
        category: 'personal',
        priority: 'high',
        done: true,
        date: todayStr,
        carry_over: false,
        carry_count: 0,
        must_do: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dt-4',
        user_id: DEMO_USER_ID,
        task_id: null,
        habit_id: null,
        title: 'Pick up package at student union mail room',
        type: 'adhoc',
        category: null,
        priority: 'low',
        done: false,
        date: todayStr,
        carry_over: false,
        carry_count: 0,
        must_do: false,
        created_at: new Date().toISOString(),
      },
    ]

    const initialWeeklyReviews: Database['public']['Tables']['weekly_reviews']['Row'][] = [
      {
        id: 'wr-curr',
        user_id: DEMO_USER_ID,
        week_start: recentMondays[0],
        tasks_completed: 14,
        tasks_missed: 2,
        completion_rate: 88,
        habits_due: 21,
        habits_done: 19,
        habit_completion_rate: 90,
        focus_minutes: 320,
        carried_over_count: 3,
        wins: 'Crushed CS 101 Midterm exam and maintained gym streak!',
        blockers: 'Late night phone usage cut into sleep schedule.',
        next_priorities: 'Submit Biology lab and start Hackathon project prototype.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'wr-prev-1',
        user_id: DEMO_USER_ID,
        week_start: recentMondays[1],
        tasks_completed: 18,
        tasks_missed: 3,
        completion_rate: 86,
        habits_due: 21,
        habits_done: 18,
        habit_completion_rate: 85,
        focus_minutes: 410,
        carried_over_count: 2,
        wins: 'Finished algorithm problem set 2 days early.',
        blockers: 'Procrastinated on readings.',
        next_priorities: 'Study review session.',
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'wr-prev-2',
        user_id: DEMO_USER_ID,
        week_start: recentMondays[2],
        tasks_completed: 21,
        tasks_missed: 1,
        completion_rate: 95,
        habits_due: 21,
        habits_done: 20,
        habit_completion_rate: 95,
        focus_minutes: 500,
        carried_over_count: 1,
        wins: 'Best productivity week of the semester!',
        blockers: 'None!',
        next_priorities: 'Keep momentum going.',
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'wr-prev-3',
        user_id: DEMO_USER_ID,
        week_start: recentMondays[3],
        tasks_completed: 16,
        tasks_missed: 4,
        completion_rate: 80,
        habits_due: 21,
        habits_done: 16,
        habit_completion_rate: 76,
        focus_minutes: 280,
        carried_over_count: 5,
        wins: 'Started 20-min daily reading habit.',
        blockers: 'Overcommitted on weekend plans.',
        next_priorities: 'Organize project folders.',
        created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const initialProfile: Database['public']['Tables']['profiles']['Row'] = {
      id: DEMO_USER_ID,
      name: 'Alex Rivera',
      notif_on: true,
      notif_time: '08:00:00',
      push_subscription: null,
      theme: 'system',
      timezone: 'UTC',
      last_reset_date: null,
      last_weekly_date: null,
      last_reminder_date: null,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    }

    setStorage('tasks', initialTasks)
    setStorage('habits', initialHabits)
    setStorage('habit_logs', generateInitialHabitLogs())
    setStorage('daily_todos', initialDailyTodos)
    setStorage('weekly_reviews', initialWeeklyReviews)
    setStorage('profiles', [initialProfile])
    setStorage('auth_user', defaultUser)
    setStorage('initialized', true)
  }

  // Auth state & listeners
  const authListeners = new Set<(event: string, session: unknown) => void>()
  const channelListeners = new Map<string, Set<() => void>>()

  const notifyChannels = (tableName: string) => {
    channelListeners.forEach((callbacks, channelKey) => {
      if (channelKey.includes(tableName) || channelKey.includes('focusos-')) {
        callbacks.forEach(cb => cb())
      }
    })
  }

  const getSession = () => {
    const user = getStorage('auth_user', defaultUser)
    if (!user) return null
    return {
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }
  }

  const auth = {
    async getSession() {
      const session = getSession()
      return { data: { session }, error: null }
    },
    async getUser() {
      const user = getStorage('auth_user', defaultUser)
      return { data: { user }, error: null }
    },
    onAuthStateChange(callback: (event: string, session: unknown) => void) {
      authListeners.add(callback)
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback)
            },
          },
        },
      }
    },
    async signInWithPassword({ email }: { email: string; password?: string }) {
      const user = {
        ...defaultUser,
        email,
        user_metadata: {
          full_name: email.split('@')[0] || 'FocusOS User',
          avatar_url: '',
        },
      }
      setStorage('auth_user', user)
      const session = getSession()
      authListeners.forEach(cb => cb('SIGNED_IN', session))
      return { data: { user, session }, error: null }
    },
    async signUp({ email }: { email: string; password?: string; options?: Record<string, unknown> }) {
      const user = {
        ...defaultUser,
        email,
        user_metadata: {
          full_name: email.split('@')[0] || 'FocusOS User',
          avatar_url: '',
        },
      }
      setStorage('auth_user', user)
      const session = getSession()
      authListeners.forEach(cb => cb('SIGNED_IN', session))
      return { data: { user, session }, error: null }
    },
    async signInWithOAuth({ provider: _provider }: { provider: string; options?: Record<string, unknown> }) {
      setStorage('auth_user', defaultUser)
      const session = getSession()
      authListeners.forEach(cb => cb('SIGNED_IN', session))
      return { data: { url: window.location.origin }, error: null }
    },
    async signOut() {
      setStorage('auth_user', null)
      authListeners.forEach(cb => cb('SIGNED_OUT', null))
      return { error: null }
    },
    async resetPasswordForEmail(_email: string) {
      return { data: {}, error: null }
    },
  }

  // Generic Query Builder
  class MockQueryBuilder {
    private table: string
    private filters: Array<(row: Record<string, unknown>) => boolean> = []
    private sorts: Array<{ col: string; asc: boolean }> = []
    private limitCount: number | null = null
    private isCountExact = false
    private isHeadOnly = false
    private selectCols = '*'

    constructor(table: string) {
      this.table = table
    }

    select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
      this.selectCols = columns
      if (options?.count === 'exact') this.isCountExact = true
      if (options?.head) this.isHeadOnly = true
      return this
    }

    eq(col: string, val: unknown) {
      this.filters.push(row => row[col] === val)
      return this
    }

    gte(col: string, val: unknown) {
      this.filters.push(row => {
        const rowVal = row[col]
        if (typeof rowVal === 'string' && typeof val === 'string') {
          return rowVal >= val
        }
        if (typeof rowVal === 'number' && typeof val === 'number') {
          return rowVal >= val
        }
        return false
      })
      return this
    }

    order(col: string, options?: { ascending?: boolean }) {
      this.sorts.push({ col, asc: options?.ascending !== false })
      return this
    }

    limit(n: number) {
      this.limitCount = n
      return this
    }

    private executeSelect() {
      let rows: Record<string, unknown>[] = getStorage(this.table, [])

      // Apply filters
      for (const filter of this.filters) {
        rows = rows.filter(filter)
      }

      const totalCount = rows.length

      // Apply sorting
      for (const sort of this.sorts) {
        rows.sort((a, b) => {
          const av = String(a[sort.col] ?? '')
          const bv = String(b[sort.col] ?? '')
          if (av < bv) return sort.asc ? -1 : 1
          if (av > bv) return sort.asc ? 1 : -1
          return 0
        })
      }

      // Apply limit
      if (this.limitCount !== null) {
        rows = rows.slice(0, this.limitCount)
      }

      // Handle relationships / joins
      if (this.table === 'daily_todos' && this.selectCols.includes('tasks(')) {
        const allTasks: Record<string, unknown>[] = getStorage('tasks', [])
        const taskMap = new Map(allTasks.map(t => [String(t.id), t]))
        rows = rows.map(r => {
          const taskId = r.task_id ? String(r.task_id) : null
          const matchedTask = taskId && taskMap.has(taskId) ? taskMap.get(taskId) : null
          return {
            ...r,
            tasks: matchedTask
              ? {
                  description: matchedTask.description ?? null,
                  resources_url: matchedTask.resources_url ?? null,
                }
              : null,
          }
        })
      }

      if (this.isHeadOnly) {
        return { data: null, count: totalCount, error: null }
      }

      return {
        data: rows,
        count: this.isCountExact ? totalCount : null,
        error: null,
      }
    }

    async single() {
      const res = this.executeSelect()
      const item = (res.data as Record<string, unknown>[])?.[0]
      if (!item) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } }
      }
      return { data: item, error: null }
    }

    async maybeSingle() {
      const res = this.executeSelect()
      const item = (res.data as Record<string, unknown>[])?.[0] ?? null
      return { data: item, error: null }
    }

    // Then-able for await q
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      try {
        const res = this.executeSelect()
        return Promise.resolve(res).then(resolve, reject)
      } catch (err) {
        return Promise.reject(err).catch(reject)
      }
    }

    insert(data: Record<string, unknown> | Record<string, unknown>[]) {
      const items = Array.isArray(data) ? data : [data]
      const current: Record<string, unknown>[] = getStorage(this.table, [])
      const inserted: Record<string, unknown>[] = []

      for (const item of items) {
        const newItem: Record<string, unknown> = {
          id: item.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }
        current.push(newItem)
        inserted.push(newItem)

        // Trigger simulation: If pinning a task, also sync daily_todos
        if (this.table === 'tasks' && Boolean(newItem.pin_to_today)) {
          const daily: Record<string, unknown>[] = getStorage('daily_todos', [])
          if (!daily.some(d => d.task_id === newItem.id && d.date === todayStr)) {
            daily.push({
              id: `dt-${String(newItem.id)}`,
              user_id: newItem.user_id,
              task_id: newItem.id,
              habit_id: null,
              title: newItem.title,
              type: 'pinned',
              category: newItem.category,
              priority: newItem.priority,
              done: false,
              date: todayStr,
              carry_over: false,
              created_at: new Date().toISOString(),
            })
            setStorage('daily_todos', daily)
            notifyChannels('daily_todos')
          }
        }
      }

      setStorage(this.table, current)
      notifyChannels(this.table)

      return {
        select: () => ({
          single: async () => ({ data: inserted[0], error: null }),
          then: (res: (val: unknown) => unknown) => Promise.resolve({ data: inserted, error: null }).then(res),
        }),
        then: (res: (val: unknown) => unknown) => Promise.resolve({ data: inserted, error: null }).then(res),
      }
    }

    update(updates: Record<string, unknown>) {
      const current: Record<string, unknown>[] = getStorage(this.table, [])
      const updatedList: Record<string, unknown>[] = []

      const modified = current.map(row => {
        const matches = this.filters.length === 0 || this.filters.every(f => f(row))
        if (!matches) return row

        const updated = { ...row, ...updates, updated_at: new Date().toISOString() }
        updatedList.push(updated)

        // Trigger simulation: daily todo toggle syncs with tasks
        if (this.table === 'daily_todos' && 'done' in updates && row.task_id) {
          const allTasks: Record<string, unknown>[] = getStorage('tasks', [])
          const taskIdx = allTasks.findIndex(t => t.id === row.task_id)
          if (taskIdx >= 0) {
            allTasks[taskIdx].status = updates.done ? 'done' : 'in_progress'
            setStorage('tasks', allTasks)
            notifyChannels('tasks')
          }
        }

        // Trigger simulation: task pin syncs with daily_todos
        if (this.table === 'tasks' && 'pin_to_today' in updates) {
          const daily: Record<string, unknown>[] = getStorage('daily_todos', [])
          if (updates.pin_to_today) {
            if (!daily.some(d => d.task_id === row.id && d.date === todayStr)) {
              daily.push({
                id: `dt-${row.id}`,
                user_id: row.user_id,
                task_id: row.id,
                habit_id: null,
                title: row.title,
                type: 'pinned',
                category: row.category,
                priority: row.priority,
                done: false,
                date: todayStr,
                carry_over: false,
                created_at: new Date().toISOString(),
              })
            }
          } else {
            const filtered = daily.filter(d => !(d.task_id === row.id && d.date === todayStr))
            setStorage('daily_todos', filtered)
          }
          setStorage('daily_todos', daily)
          notifyChannels('daily_todos')
        }

        return updated
      })

      // If weekly review did not exist when updated, upsert it
      if (this.table === 'weekly_reviews' && updatedList.length === 0 && updates) {
        const newReview = {
          id: `wr-${Date.now()}`,
          tasks_completed: 0,
          tasks_missed: 0,
          completion_rate: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...updates,
        }
        modified.push(newReview)
        updatedList.push(newReview)
      }

      setStorage(this.table, modified)
      notifyChannels(this.table)

      return {
        eq: this.eq.bind(this),
        select: () => ({
          single: async () => ({ data: updatedList[0] || null, error: null }),
          then: (res: (val: unknown) => unknown) => Promise.resolve({ data: updatedList, error: null }).then(res),
        }),
        then: (res: (val: unknown) => unknown) => Promise.resolve({ data: updatedList, error: null }).then(res),
      }
    }

    delete() {
      return {
        eq: (col: string, val: unknown) => {
          const current: Record<string, unknown>[] = getStorage(this.table, [])
          const kept = current.filter(row => row[col] !== val)
          setStorage(this.table, kept)
          notifyChannels(this.table)
          return Promise.resolve({ error: null })
        },
      }
    }

    upsert(record: Record<string, unknown>, options?: { onConflict?: string }) {
      const current: Record<string, unknown>[] = getStorage(this.table, [])
      const conflictCols = options?.onConflict ? options.onConflict.split(',').map(s => s.trim()) : ['id']

      const idx = current.findIndex(row =>
        conflictCols.every(col => row[col] === record[col])
      )

      if (idx >= 0) {
        current[idx] = { ...current[idx], ...record }
      } else {
        current.push({
          id: record.id || `up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          created_at: new Date().toISOString(),
          ...record,
        })
      }

      setStorage(this.table, current)
      notifyChannels(this.table)
      return Promise.resolve({ error: null })
    }
  }

  const from = (table: string) => new MockQueryBuilder(table)

  const channel = (name: string) => {
    return {
      on(_event: string, _filter: unknown, callback: () => void) {
        if (!channelListeners.has(name)) {
          channelListeners.set(name, new Set())
        }
        channelListeners.get(name)!.add(callback)
        return this
      },
      subscribe() {
        return this
      },
    }
  }

  const removeChannel = (ch: unknown) => {
    // Clean up channel callbacks
    channelListeners.forEach(set => {
      set.clear()
    })
    return ch
  }

  return {
    auth,
    from,
    channel,
    removeChannel,
  }
}

// Export either real Supabase client or bulletproof mock client
export const supabase: import('@supabase/supabase-js').SupabaseClient<Database> = hasValidEnv
  ? createClient<Database>(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : (createMockSupabaseClient() as unknown as import('@supabase/supabase-js').SupabaseClient<Database>)

/**
 * Convenient login bypass for testing and demo walkthroughs.
 */
export async function bypassLogin() {
  localStorage.setItem('focusos_guest_bypass', 'true')
  if (!hasValidEnv) {
    return supabase.auth.signInWithPassword({
      email: 'alex.rivera@focusos.dev',
      password: 'demo-password-123',
    })
  }

  // If real Supabase: try anonymous sign-in or demo credentials
  try {
    const anonRes = await supabase.auth.signInAnonymously()
    if (!anonRes.error && anonRes.data.session) {
      return anonRes
    }
  } catch {
    // anonymous auth may not be enabled on live project
  }

  const demoEmail = 'demo@focusos.app'
  const demoPassword = 'DemoPassword2026!'
  const signInRes = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  })
  if (!signInRes.error && signInRes.data.session) {
    return signInRes
  }

  return await supabase.auth.signUp({
    email: demoEmail,
    password: demoPassword,
  })
}
