import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Task, TaskInsert, TaskUpdate, TaskFilters } from '../types'
import { PRIORITY_ORDER } from '../lib/constants'
import toast from 'react-hot-toast'

import { useAuth } from './useAuth'

// Fetch all tasks with optional filters
export function useTasks(filters?: TaskFilters) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['tasks', user?.id, filters],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (filters?.category) q = q.eq('category', filters.category)
      if (filters?.overdue) q = q.eq('is_overdue', true)
      if (filters?.status) q = q.eq('status', filters.status)

      const { data, error } = await q
      if (error) throw error

      // Client-side priority sort since Supabase sorts alphabetically
      return (data as Task[]).sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99
        const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99
        return pa - pb
      })
    },
    staleTime: 30_000,
  })
}

// Create a new task (idempotent with client-generated UUID)
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<TaskInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const id = task.id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('tasks')
        .upsert({ ...task, id, user_id: user.id }, { ignoreDuplicates: true })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`)
    },
  })
}

// Update a task
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`)
    },
  })
}

// Delete a task
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Task deleted')
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`)
    },
  })
}

// Pin toggle — optimistic update, DB trigger handles daily_todos sync
export function usePinTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ pin_to_today: pinned })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })

      const previousQueries = qc.getQueriesData<Task[]>({ queryKey: ['tasks'] })

      qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old
        return old.map((t) => (t.id === id ? { ...t, pin_to_today: pinned } : t))
      })

      return { previousQueries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to update pin')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
  })
}
