import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { DailyTodo, DailyTodoInsert } from '../types'
import toast from 'react-hot-toast'

const todayStr = () => new Date().toISOString().split('T')[0]

/** Fetch all daily_todos for today, with joined task details */
export function useDailyTodos() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['daily_todos', user?.id, todayStr()],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_todos')
        .select('*, tasks(description, resources_url)')
        .eq('user_id', user!.id)
        .eq('date', todayStr())
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as (DailyTodo & { tasks: { description: string | null; resources_url: string | null } | null })[]
    },
  })
}

/** Toggle a daily todo's done status (optimistic) */
export function useToggleDailyTodo() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('daily_todos')
        .update({ done })
        .eq('id', id)

      if (error) throw error
    },
    onMutate: async ({ id, done }) => {
      const key = ['daily_todos', user?.id, todayStr()]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<DailyTodo[]>(key)

      qc.setQueryData<DailyTodo[]>(key, (old) =>
        old?.map((t) => (t.id === id ? { ...t, done } : t))
      )

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['daily_todos', user?.id, todayStr()], ctx.prev)
      }
      toast.error('Failed to update')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      // Also invalidate tasks since the trigger may have updated task status
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
      const insert: DailyTodoInsert = {
        user_id: user!.id,
        title,
        type: 'adhoc',
        done: false,
        date: todayStr(),
      }

      const { data, error } = await supabase
        .from('daily_todos')
        .insert(insert)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      toast.success('Added to today!')
    },
    onError: () => {
      toast.error('Failed to add task')
    },
  })
}
