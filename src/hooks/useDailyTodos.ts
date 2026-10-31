import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useToday } from './useToday'
import { todayLocal } from '../lib/dates'
import type { DailyTodo, DailyTodoInsert } from '../types'
import type { HabitLog } from './useHabits'
import toast from 'react-hot-toast'

/** Fetch all daily_todos for today, with joined task details */
export function useDailyTodos() {
  const { user } = useAuth()
  const today = useToday()

  const qc = useQueryClient()

  // Refetch when app becomes visible if the local date changed
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const currentDate = todayLocal()
        if (currentDate !== today) {
          qc.invalidateQueries({ queryKey: ['daily_todos'] })
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [qc, today])

  return useQuery({
    queryKey: ['daily_todos', user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_todos')
        .select('*, tasks(id, description, resources_url, due_time, estimate_min)')
        .eq('user_id', user!.id)
        .eq('date', today)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as (DailyTodo & {
        tasks: {
          id?: string
          description: string | null
          resources_url: string | null
          due_time?: string | null
          estimate_min?: number | null
        } | null
      })[]
    },
  })
}

/** Toggle a daily todo's done status (optimistic) */
export function useToggleDailyTodo() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const today = todayLocal()
      const key = ['daily_todos', user?.id, today]
      const cached = qc.getQueryData<DailyTodo[]>(key)
      const item = cached?.find((t) => t.id === id)

      const { error } = await supabase
        .from('daily_todos')
        .update({ done })
        .eq('id', id)

      if (error) throw error

      if (item?.habit_id && user) {
        await supabase.from('habit_logs').upsert(
          {
            habit_id: item.habit_id,
            user_id: user.id,
            date: item.date || today,
            completed: done,
          },
          { onConflict: 'habit_id,date' }
        )
      }
    },
    onMutate: async ({ id, done }) => {
      const today = todayLocal()
      const key = ['daily_todos', user?.id, today]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DailyTodo[]>(key)
      const item = prev?.find((t) => t.id === id)

      qc.setQueryData<DailyTodo[]>(key, (old) =>
        old?.map((t) => (t.id === id ? { ...t, done } : t))
      )

      if (item?.habit_id && user) {
        const habitId = item.habit_id
        const habitKey = ['habit_logs', user.id, 30]
        qc.setQueryData<HabitLog[]>(habitKey, (old = []) => {
          const exists = old.find((l) => l.habit_id === habitId && l.date === item.date)
          if (exists) {
            return old.map((l) =>
              l.habit_id === habitId && l.date === item.date ? { ...l, completed: done } : l
            )
          }
          return [
            ...old,
            {
              id: crypto.randomUUID(),
              habit_id: habitId,
              user_id: user.id,
              date: item.date || today,
              completed: done,
            },
          ]
        })
      }

      return { prev, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev && ctx?.key) {
        qc.setQueryData(ctx.key, ctx.prev)
      }
      toast.error('Failed to update')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      qc.invalidateQueries({ queryKey: ['habit_logs'] })
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

/** Create an ad-hoc daily todo */
export function useCreateAdhocTodo() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (title: string) => {
      const id = crypto.randomUUID()
      const insert: DailyTodoInsert = {
        id,
        user_id: user!.id,
        title,
        type: 'adhoc',
        done: false,
        date: todayLocal(),
      }

      const { data, error } = await supabase
        .from('daily_todos')
        .upsert(insert, { ignoreDuplicates: true })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: () => {
      toast.error('Failed to add task')
    },
  })
}

/** Delete a daily todo */
export function useDeleteDailyTodo() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_todos')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: () => {
      toast.error('Failed to delete')
    },
  })
}

/** Toggle a daily todo's must_do status */
export function useToggleMustDo() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, must_do }: { id: string; must_do: boolean }) => {
      const { error } = await supabase
        .from('daily_todos')
        .update({ must_do })
        .eq('id', id)

      if (error) throw error
    },
    onMutate: async ({ id, must_do }) => {
      const today = todayLocal()
      const key = ['daily_todos', user?.id, today]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DailyTodo[]>(key)

      qc.setQueryData<DailyTodo[]>(key, (old) =>
        old?.map((t) => (t.id === id ? { ...t, must_do } : t))
      )
      return { prev, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev && ctx?.key) {
        qc.setQueryData(ctx.key, ctx.prev)
      }
      toast.error('Failed to update must-do')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
  })
}

/** Move a daily todo to another date (e.g. tomorrow or picked date) */
export function useMoveTodoDate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      todoId,
      taskId,
      newDate,
    }: {
      todoId: string
      taskId?: string | null
      newDate: string
    }) => {
      // If linked to a task, update tasks.due_date and remove the daily_todo for today
      if (taskId) {
        const { error: taskErr } = await supabase
          .from('tasks')
          .update({ due_date: newDate })
          .eq('id', taskId)
        if (taskErr) throw taskErr

        const { error: todoErr } = await supabase
          .from('daily_todos')
          .delete()
          .eq('id', todoId)
        if (todoErr) throw todoErr
      } else {
        // Adhoc todo: update date directly
        const { error: todoErr } = await supabase
          .from('daily_todos')
          .update({ date: newDate })
          .eq('id', todoId)
        if (todoErr) throw todoErr
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: () => {
      toast.error('Failed to move task')
    },
  })
}

