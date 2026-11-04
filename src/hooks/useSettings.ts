import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal } from '../lib/dates'
import type { Profile, ProfileUpdate } from '../types'
import toast from 'react-hot-toast'

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      const profile = data as Profile
      if (profile && (!profile.timezone || profile.timezone === 'UTC')) {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (browserTz && browserTz !== 'UTC') {
          profile.timezone = browserTz
          // Update silently in background
          supabase
            .from('profiles')
            .update({ timezone: browserTz })
            .eq('id', user!.id)
            .then(() => {})
        }
      }
      return profile
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
    onError: () => {
      toast.error('Failed to save settings')
    },
  })
}

export const PAGE_SIZE = 1000

export type ExportableTable = 'tasks' | 'habits' | 'habit_logs' | 'daily_todos' | 'weekly_reviews'

/**
 * Paginate select with .range() in pages of 1000 until fewer rows return.
 * Checks every query's error and throws.
 */
export async function fetchAllUserRows<T = Record<string, unknown>>(
  table: ExportableTable,
  uid: string
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', uid)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allRows.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

export function useExportData() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in')
      const uid = user.id

      // Fetch profile and check error
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()

      if (profileErr) throw profileErr

      // Exclude push_subscription
      const { push_subscription: _ps, ...profileWithoutPush } = profileData || {}

      // Fetch all tables with pagination
      const [tasks, habits, habitLogs, dailyTodos, weeklyReviews] = await Promise.all([
        fetchAllUserRows('tasks', uid),
        fetchAllUserRows('habits', uid),
        fetchAllUserRows('habit_logs', uid),
        fetchAllUserRows('daily_todos', uid),
        fetchAllUserRows('weekly_reviews', uid),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profileWithoutPush,
        tasks,
        habits,
        habitLogs,
        dailyTodos,
        weeklyReviews,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `focusos-export-${todayLocal()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Data exported successfully!')
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to export data: ${msg}`)
    },
  })
}

export function useExportCsv() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (type: 'tasks' | 'habits' | 'daily_todos' | 'weekly_reviews') => {
      if (!user) throw new Error('Not logged in')
      const uid = user.id

      // Paginate every select with .range() in pages of 1000
      const data = await fetchAllUserRows(type, uid)

      if (!data || data.length === 0) {
        toast('No records to export', { icon: 'ℹ️' })
        return
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((field) => {
              const val = (row as Record<string, unknown>)[field]
              if (val === null || val === undefined) return ''
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
              return `"${str.replace(/"/g, '""')}"`
            })
            .join(',')
        ),
      ]

      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `focusos-${type}-${todayLocal()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSuccess: (_, type) => {
      toast.success(`Exported ${type}.csv successfully!`)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Failed to export CSV: ${msg}`)
    },
  })
}

