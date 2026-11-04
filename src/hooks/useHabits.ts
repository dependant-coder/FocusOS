import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal, addDaysLocal } from '../lib/dates'
import type { DailyTodo } from '../types'
import toast from 'react-hot-toast'
import { randomUUID } from '../lib/uuid'
import { MUTATION_KEYS } from '../lib/mutationDefaults'

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
  custom_days: string[] | null
  active: boolean
  sort_order: number | null
  created_at: string | null
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  date: string
  completed: boolean
}

/** Fetch all active habits for the current user */
export function useHabits() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['habits', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user!.id)
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data as Habit[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    },
  })
}

/** Fetch archived habits for the current user */
export function useArchivedHabits() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['habits_archived', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user!.id)
        .eq('active', false)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Habit[]
    },
  })
}

/** Fetch habit logs for the last N days (defaults to 90 to power 30/90-day calendar views) */
export function useHabitLogs(days = 90) {
  const { user } = useAuth()
  const startStr = addDaysLocal(todayLocal(), -days)

  return useQuery({
    queryKey: ['habit_logs', user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', startStr)
        .order('date', { ascending: true })

      if (error) throw error
      return data as HabitLog[]
    },
  })
}

/** Create a new habit (idempotent with client-generated UUID) */
export function useCreateHabit() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (habit: {
      id?: string
      name: string
      icon: string
      frequency: string
      custom_days?: string[]
      sort_order?: number
    }) => {
      const id = habit.id || randomUUID()
      const { data, error } = await supabase
        .from('habits')
        .upsert(
          {
            id,
            user_id: user!.id,
            name: habit.name,
            icon: habit.icon,
            frequency: habit.frequency,
            custom_days: habit.custom_days || [],
            sort_order: habit.sort_order ?? 0,
            active: true,
          },
          { ignoreDuplicates: true }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Failed to create habit: ${err.message}`)
    },
  })
}

/** Update a habit */
export function useUpdateHabit() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Habit> & { id: string }) => {
      const { error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habits_archived'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Failed to update habit: ${err.message}`)
    },
  })
}

/** Reorder habits and persist sort_order */
export function useReorderHabits() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      await Promise.all(
        items.map((h) =>
          supabase
            .from('habits')
            .update({ sort_order: h.sort_order })
            .eq('id', h.id)
            .eq('user_id', user!.id)
        )
      )
    },
    onMutate: async (newOrder) => {
      await qc.cancelQueries({ queryKey: ['habits', user?.id] })
      const prev = qc.getQueryData<Habit[]>(['habits', user?.id])

      qc.setQueryData<Habit[]>(['habits', user?.id], (old) => {
        if (!old) return old
        const orderMap = new Map(newOrder.map((h) => [h.id, h.sort_order]))
        return [...old].sort((a, b) => {
          const oa = orderMap.get(a.id) ?? a.sort_order ?? 0
          const ob = orderMap.get(b.id) ?? b.sort_order ?? 0
          return oa - ob
        })
      })

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['habits', user?.id], ctx.prev)
      }
      toast.error('Failed to update habit order')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
    },
  })
}

/** Archive a habit (active = false) */
export function useArchiveHabit() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habits_archived'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Failed to archive habit: ${err.message}`)
    },
  })
}

/** Restore an archived habit (active = true) */
export function useRestoreHabit() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ active: true })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habits_archived'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      toast.success('Habit restored')
    },
    onError: (err) => {
      toast.error(`Failed to restore habit: ${err.message}`)
    },
  })
}

/** Permanently delete a habit */
export function useDeleteHabitPermanently() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['habits_archived'] })
      qc.invalidateQueries({ queryKey: ['habit_logs'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Failed to delete habit: ${err.message}`)
    },
  })
}

/** Legacy alias for backwards compatibility */
export const useDeleteHabit = useArchiveHabit

/** Toggle a habit log for today or any date (optimistic, with 2-way sync to daily_todos) */
export function useToggleHabitLog() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationKey: MUTATION_KEYS.toggleHabit,
    mutationFn: async ({
      habitId,
      date,
      completed,
    }: {
      habitId: string
      date: string
      completed: boolean
    }) => {
      const { error } = await supabase.from('habit_logs').upsert(
        {
          habit_id: habitId,
          user_id: user!.id,
          date,
          completed,
        },
        { onConflict: 'habit_id,date' }
      )

      if (error) throw error

      // Client-side 2-way sync: update matching daily_todos
      await supabase
        .from('daily_todos')
        .update({ done: completed })
        .eq('user_id', user!.id)
        .eq('habit_id', habitId)
        .eq('date', date)
    },
    onMutate: async ({ habitId, date, completed }) => {
      // Cancel queries
      await qc.cancelQueries({ queryKey: ['habit_logs', user?.id] })

      // Optimistic update for habit_logs (across all day limits)
      qc.setQueriesData<HabitLog[]>({ queryKey: ['habit_logs', user?.id] }, (old = []) => {
        const exists = old.find((l) => l.habit_id === habitId && l.date === date)
        if (exists) {
          return old.map((l) =>
            l.habit_id === habitId && l.date === date ? { ...l, completed } : l
          )
        }
        return [
          ...old,
          {
            id: randomUUID(),
            habit_id: habitId,
            user_id: user!.id,
            date,
            completed,
          },
        ]
      })

      // Optimistic update for daily_todos cache if active for this date
      const dailyKey = ['daily_todos', user?.id, date]
      qc.setQueryData<DailyTodo[]>(dailyKey, (old) => {
        if (!old) return old
        return old.map((t) => (t.habit_id === habitId ? { ...t, done: completed } : t))
      })

      return {}
    },
    onError: () => {
      toast.error('Failed to update habit')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['habit_logs'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
  })
}
