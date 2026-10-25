import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

interface Profile {
  id: string
  name: string | null
  theme: 'light' | 'dark' | 'system'
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
      return data as Profile
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, 'name' | 'theme' | 'notif_on' | 'notif_time'>>) => {
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

      const [tasks, dailyTodos, habits, habitLogs, weeklyReviews, profile] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', uid),
        supabase.from('daily_todos').select('*').eq('user_id', uid),
        supabase.from('habits').select('*').eq('user_id', uid),
        supabase.from('habit_logs').select('*').eq('user_id', uid),
        supabase.from('weekly_reviews').select('*').eq('user_id', uid),
        supabase.from('profiles').select('*').eq('id', uid).single(),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profile.data,
        tasks: tasks.data || [],
        daily_todos: dailyTodos.data || [],
        habits: habits.data || [],
        habit_logs: habitLogs.data || [],
        weekly_reviews: weeklyReviews.data || [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `focusos-export-${new Date().toISOString().split('T')[0]}.json`
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
