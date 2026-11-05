import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useToday } from './useToday'
import { todayLocal } from '../lib/dates'
import type { DailyTodo, DailyTodoInsert } from '../types'
import type { HabitLog } from './useHabits'
import toast from 'react-hot-toast'
import { randomUUID } from '../lib/uuid'
import { MUTATION_KEYS, MUTATION_SCOPE } from '../lib/mutationDefaults'

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

  const mutation = useMutation({
    mutationKey: MUTATION_KEYS.toggleDailyTodo,
    scope: MUTATION_SCOPE,
    mutationFn: async ({
      id,
      done,
      habitId,
      date,
      userId,
    }: {
      id: string
      done: boolean
      habitId?: string | null
      date?: string | null
      userId?: string | null
    }) => {
      const today = date || todayLocal()
      const effectiveUserId = userId || user?.id
      const key = ['daily_todos', effectiveUserId, today]
      const cached = qc.getQueryData<DailyTodo[]>(key)
      const item = cached?.find((t) => t.id === id)

      const { error } = await supabase
        .from('daily_todos')
        .update({ done })
        .eq('id', id)

      if (error) throw error

      const targetHabitId = habitId || item?.habit_id
      if (targetHabitId && effectiveUserId) {
        await supabase.from('habit_logs').upsert(
          {
            habit_id: targetHabitId,
            user_id: effectiveUserId,
            date: date || item?.date || today,
            completed: done,
          },
          { onConflict: 'habit_id,date' }
        )
      }
    },
    onMutate: async ({ id, done, date }) => {
      const today = date || todayLocal()
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
              id: randomUUID(),
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

  const wrappedMutate = (
    vars: { id: string; done: boolean; habitId?: string | null; date?: string | null; userId?: string | null },
    options?: Parameters<typeof mutation.mutate>[1]
  ) => {
    const norm = {
      ...vars,
      date: vars.date ?? todayLocal(),
      userId: vars.userId ?? user?.id,
    }
    return mutation.mutate(norm, options)
  }

  const wrappedMutateAsync = (
    vars: { id: string; done: boolean; habitId?: string | null; date?: string | null; userId?: string | null },
    options?: Parameters<typeof mutation.mutateAsync>[1]
  ) => {
    const norm = {
      ...vars,
      date: vars.date ?? todayLocal(),
      userId: vars.userId ?? user?.id,
    }
    return mutation.mutateAsync(norm, options)
  }

  return {
    ...mutation,
    mutate: wrappedMutate,
    mutateAsync: wrappedMutateAsync,
  }
}

export type CreateAdhocTodoVariables =
  | string
  | {
      id?: string
      title: string
      date?: string
      userId?: string
    }

/** Create an ad-hoc daily todo */
export function useCreateAdhocTodo() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const mutation = useMutation({
    mutationKey: MUTATION_KEYS.createAdhocTodo,
    scope: MUTATION_SCOPE,
    mutationFn: async (
      vars: CreateAdhocTodoVariables
    ) => {
      const id = (typeof vars === 'string' ? null : vars.id) || randomUUID()
      const title = typeof vars === 'string' ? vars : vars.title
      const date = (typeof vars === 'object' && vars.date) ? vars.date : todayLocal()
      const userId = (typeof vars === 'object' && vars.userId) ? vars.userId : user?.id

      const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id
      if (!effectiveUserId) throw new Error('Not authenticated')

      const insert: DailyTodoInsert = {
        id,
        user_id: effectiveUserId,
        title,
        type: 'adhoc',
        done: false,
        date,
      }

      // Idempotent upsert: use .select() without .single()
      const { data, error } = await supabase
        .from('daily_todos')
        .upsert(insert, { ignoreDuplicates: true })
        .select()

      if (error) throw error
      if (data && data.length > 0) {
        return data[0]
      }

      const { data: existing, error: fetchErr } = await supabase
        .from('daily_todos')
        .select()
        .eq('id', id)
        .maybeSingle()

      if (fetchErr) return insert
      return existing ?? insert
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
    onError: () => {
      toast.error('Failed to add task')
    },
  })

  const wrappedMutate = (
    vars: CreateAdhocTodoVariables,
    options?: Parameters<typeof mutation.mutate>[1]
  ) => {
    const norm = typeof vars === 'string'
      ? { id: randomUUID(), title: vars, date: todayLocal(), userId: user?.id }
      : {
          id: vars.id ?? randomUUID(),
          title: vars.title,
          date: vars.date ?? todayLocal(),
          userId: vars.userId ?? user?.id,
        }
    return mutation.mutate(norm, options)
  }

  const wrappedMutateAsync = (
    vars: CreateAdhocTodoVariables,
    options?: Parameters<typeof mutation.mutateAsync>[1]
  ) => {
    const norm = typeof vars === 'string'
      ? { id: randomUUID(), title: vars, date: todayLocal(), userId: user?.id }
      : {
          id: vars.id ?? randomUUID(),
          title: vars.title,
          date: vars.date ?? todayLocal(),
          userId: vars.userId ?? user?.id,
        }
    return mutation.mutateAsync(norm, options)
  }

  return {
    ...mutation,
    mutate: wrappedMutate,
    mutateAsync: wrappedMutateAsync,
  }
}

export interface DeleteDailyTodoOptions {
  id: string
  taskId?: string | null
  title?: string
  habitId?: string | null
}

/** Delete a daily todo with multi-row carry clean up */
export function useDeleteDailyTodo() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (arg: string | DeleteDailyTodoOptions) => {
      const id = typeof arg === 'string' ? arg : arg.id
      const taskId = typeof arg === 'string' ? undefined : arg.taskId
      const title = typeof arg === 'string' ? undefined : arg.title
      const habitId = typeof arg === 'string' ? undefined : arg.habitId

      const today = todayLocal()

      if (taskId) {
        // Delete all undone daily_todos for same task with date <= today
        const { error: deleteErr } = await supabase
          .from('daily_todos')
          .delete()
          .eq('user_id', user!.id)
          .eq('task_id', taskId)
          .eq('done', false)
          .lte('date', today)
        if (deleteErr) throw deleteErr

        // Reset pin_to_today on task
        const { error: taskErr } = await supabase
          .from('tasks')
          .update({ pin_to_today: false })
          .eq('id', taskId)
        if (taskErr) throw taskErr
      } else if (title && !habitId) {
        // Delete all undone adhoc daily_todos with same title and date <= today
        const { error: deleteErr } = await supabase
          .from('daily_todos')
          .delete()
          .eq('user_id', user!.id)
          .is('task_id', null)
          .is('habit_id', null)
          .eq('title', title)
          .eq('done', false)
          .lte('date', today)
        if (deleteErr) throw deleteErr
      } else {
        const { error } = await supabase
          .from('daily_todos')
          .delete()
          .eq('id', id)
        if (error) throw error
      }
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

export interface MoveTodoDateArgs {
  todoId: string
  taskId?: string | null
  title?: string
  habitId?: string | null
  newDate: string
}

/** Move a daily todo to another date (e.g. tomorrow or picked date) */
export function useMoveTodoDate() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      todoId,
      taskId,
      title,
      habitId,
      newDate,
    }: MoveTodoDateArgs) => {
      const today = todayLocal()

      // If linked to a task, update tasks.due_date, set pin_to_today = false, and remove the daily_todo for today
      if (taskId) {
        const { error: taskErr } = await supabase
          .from('tasks')
          .update({ due_date: newDate, pin_to_today: false })
          .eq('id', taskId)
        if (taskErr) throw taskErr

        const { error: todoErr } = await supabase
          .from('daily_todos')
          .delete()
          .eq('id', todoId)
        if (todoErr) throw todoErr
      } else {
        // Resolve title and habit_id if not provided
        let adhocTitle = title
        let adhocHabitId = habitId

        if (!adhocTitle) {
          const cached = qc.getQueryData<DailyTodo[]>(['daily_todos', user?.id, today])
          const item = cached?.find((t) => t.id === todoId)
          if (item) {
            adhocTitle = item.title
            adhocHabitId = item.habit_id
          } else {
            const { data: current } = await supabase
              .from('daily_todos')
              .select('title, habit_id')
              .eq('id', todoId)
              .maybeSingle()
            if (current) {
              adhocTitle = current.title
              adhocHabitId = current.habit_id
            }
          }
        }

        const isAdhoc = !taskId && !adhocHabitId && Boolean(adhocTitle)

        // For ad-hoc todos (no task_id, no habit_id):
        // before/after moving the row, delete every OTHER undone daily_todo of the same user with the same title,
        // task_id null, habit_id null, date <= today (local).
        if (isAdhoc && user && adhocTitle) {
          await supabase
            .from('daily_todos')
            .delete()
            .eq('user_id', user.id)
            .is('task_id', null)
            .is('habit_id', null)
            .eq('title', adhocTitle)
            .eq('done', false)
            .lte('date', today)
            .neq('id', todoId)
        }

        // Adhoc todo: update date directly
        const { error: todoErr } = await supabase
          .from('daily_todos')
          .update({ date: newDate })
          .eq('id', todoId)

        if (todoErr) {
          if (
            todoErr.code === '23505' ||
            todoErr.message?.includes('23505') ||
            todoErr.message?.includes('unique')
          ) {
            // Remove the duplicate for today so it doesn't linger
            await supabase.from('daily_todos').delete().eq('id', todoId)
            const err = Object.assign(new Error('Already on that day'), { code: '23505' })
            throw err
          }
          throw todoErr
        }

        // After moving: also clean up any older undone copies dated <= today
        if (isAdhoc && user && adhocTitle) {
          await supabase
            .from('daily_todos')
            .delete()
            .eq('user_id', user.id)
            .is('task_id', null)
            .is('habit_id', null)
            .eq('title', adhocTitle)
            .eq('done', false)
            .lte('date', today)
            .neq('id', todoId)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err: unknown) => {
      const isDuplicate =
        (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') ||
        (err instanceof Error && err.message.includes('Already on that day'))
      if (isDuplicate) {
        toast('Already on that day', { icon: 'ℹ️' })
      } else {
        toast.error('Failed to move task')
      }
    },
  })
}

