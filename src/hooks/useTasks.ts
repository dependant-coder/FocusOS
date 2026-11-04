import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Task, TaskInsert, TaskUpdate, TaskFilters, Priority } from '../types'
import { PRIORITY_ORDER } from '../lib/constants'
import { todayLocal } from '../lib/dates'
import toast from 'react-hot-toast'
import { useAuth } from './useAuth'
import { randomUUID } from '../lib/uuid'
import { MUTATION_KEYS } from '../lib/mutationDefaults'

// Fetch tasks with server-side pagination (.range())
// Paginates active tasks (status != 'done') by default.
// Fetches done tasks lazily/paginated only when Done filter is selected.
export function useTasks(filters?: TaskFilters & { includeDone?: boolean }) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['tasks', user?.id, filters],
    enabled: !!user,
    queryFn: async () => {
      const PAGE_SIZE = 1000

      const fetchPages = async (statusMode: 'active' | 'done' | 'all'): Promise<Task[]> => {
        const rows: Task[] = []
        let from = 0

        while (true) {
          let q = supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user!.id)

          if (statusMode === 'active') {
            q = q.neq('status', 'done')
          } else if (statusMode === 'done') {
            q = q.eq('status', 'done')
          }

          if (filters?.category) q = q.eq('category', filters.category)
          if (filters?.overdue) q = q.eq('is_overdue', true)

          const { data, error } = await q
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)

          if (error) throw error
          if (!data || data.length === 0) break

          rows.push(...(data as Task[]))
          if (data.length < PAGE_SIZE) break
          from += PAGE_SIZE
        }

        return rows
      }

      let allTasks: Task[]
      if (filters?.status === 'done') {
        allTasks = await fetchPages('done')
      } else if (filters?.includeDone || (filters?.status as string) === 'all') {
        allTasks = await fetchPages('all')
      } else {
        // Default: active tasks only
        allTasks = await fetchPages('active')
      }

      // Client-side priority sort
      return allTasks.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99
        const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99
        if (pa !== pb) return pa - pb
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      })
    },
    staleTime: 30_000,
  })
}

// Create a new task (idempotent with client-generated UUID)
export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationKey: MUTATION_KEYS.createTask,
    mutationFn: async (task: Omit<TaskInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const id = task.id || randomUUID()
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
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
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
    mutationKey: MUTATION_KEYS.updateTask,
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
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`)
    },
  })
}

// Toggle task completion with optimistic updates & daily_todos sync
export function useToggleTaskComplete() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const updates = {
        status: done ? 'done' : 'not_started',
        completed_at: done ? new Date().toISOString() : null,
      }
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      if (user?.id) {
        const today = todayLocal()
        await supabase
          .from('daily_todos')
          .update({ done })
          .eq('user_id', user.id)
          .eq('task_id', id)
          .eq('date', today)
      }

      return data
    },
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = qc.getQueriesData<Task[]>({ queryKey: ['tasks'] })

      qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
        if (!old) return old
        return old.map((t) =>
          t.id === id
            ? {
                ...t,
                status: done ? 'done' : 'not_started',
                completed_at: done ? new Date().toISOString() : null,
                is_overdue: done ? false : t.is_overdue,
              }
            : t
        )
      })

      // Optimistic update for daily todos query
      if (user?.id) {
        const today = todayLocal()
        const dailyKey = ['daily_todos', user.id, today]
        qc.setQueriesData({ queryKey: dailyKey }, (old: unknown) => {
          if (!old || !Array.isArray(old)) return old
          return (old as { task_id?: string | null; done: boolean }[]).map((d) =>
            d.task_id === id ? { ...d, done } : d
          )
        })
      }

      return { previousTasks }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }
      toast.error('Failed to update task')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
  })
}

// Delete a task (with orphan daily_todos cleanup)
export function useDeleteTask() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationKey: MUTATION_KEYS.deleteTask,
    mutationFn: async (id: string) => {
      const today = todayLocal()
      // Deleting a task cascades via SET NULL on daily_todos.task_id;
      // also delete that task's undone daily_todos (date <= today) so orphan rows don't linger.
      if (user?.id) {
        const { error: dailyErr } = await supabase
          .from('daily_todos')
          .delete()
          .eq('user_id', user.id)
          .eq('task_id', id)
          .eq('done', false)
          .lte('date', today)
        if (dailyErr) {
          console.error('[useDeleteTask] Error cleaning orphan daily_todos:', dailyErr)
        }
      }

      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Failed to delete task: ${err.message}`)
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

// Bulk complete tasks
export function useBulkCompleteTasks() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', completed_at: now })
        .in('id', ids)
      if (error) throw error

      if (user?.id) {
        const today = todayLocal()
        await supabase
          .from('daily_todos')
          .update({ done: true })
          .eq('user_id', user.id)
          .in('task_id', ids)
          .eq('date', today)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      toast.success('Tasks completed')
    },
    onError: (err) => {
      toast.error(`Bulk complete failed: ${err.message}`)
    },
  })
}

// Bulk pin tasks to today
export function useBulkPinTasks() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('tasks')
        .update({ pin_to_today: true })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      toast.success('Tasks added to Today')
    },
    onError: (err) => {
      toast.error(`Bulk add failed: ${err.message}`)
    },
  })
}

// Bulk set priority
export function useBulkSetPriority() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, priority }: { ids: string[]; priority: Priority }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ priority })
        .in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Priority updated')
    },
    onError: (err) => {
      toast.error(`Update failed: ${err.message}`)
    },
  })
}

// Bulk delete tasks
export function useBulkDeleteTasks() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const today = todayLocal()
      if (user?.id) {
        await supabase
          .from('daily_todos')
          .delete()
          .eq('user_id', user.id)
          .in('task_id', ids)
          .eq('done', false)
          .lte('date', today)
      }
      const { error } = await supabase.from('tasks').delete().in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`)
    },
  })
}
