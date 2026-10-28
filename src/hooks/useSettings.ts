import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal } from '../lib/dates'
import type { ProfileUpdate } from '../types'
import toast from 'react-hot-toast'

export interface Profile {
  id: string
  name: string | null
  theme: 'light' | 'dark' | 'system'
  timezone?: string | null
  notif_on: boolean
  notif_time: string
  push_subscription: unknown | null
  created_at: string
}

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

export function useExportData() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const uid = user!.id

      const [tasksRes, habitsRes, habitLogsRes, dailyTodosRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', uid),
        supabase.from('habits').select('*').eq('user_id', uid),
        supabase.from('habit_logs').select('*').eq('user_id', uid),
        supabase.from('daily_todos').select('*').eq('user_id', uid),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        tasks: tasksRes.data ?? [],
        habits: habitsRes.data ?? [],
        habitLogs: habitLogsRes.data ?? [],
        dailyTodos: dailyTodosRes.data ?? [],
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
    onError: () => {
      toast.error('Failed to export data')
    },
  })
}
