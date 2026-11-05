import type { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { randomUUID } from './uuid'
import { todayLocal } from './dates'
import type { TaskInsert, TaskUpdate, DailyTodoInsert } from '../types'

export const MUTATION_KEYS = {
  createTask: ['tasks', 'create'] as const,
  updateTask: ['tasks', 'update'] as const,
  deleteTask: ['tasks', 'delete'] as const,
  toggleDailyTodo: ['daily_todos', 'toggle'] as const,
  toggleHabit: ['habits', 'toggle'] as const,
  createAdhocTodo: ['daily_todos', 'create_adhoc'] as const,
}

export const MUTATION_SCOPE = { id: 'user-writes' } as const

export function registerMutationDefaults(queryClient: QueryClient) {
  // 1. Create task (idempotent create)
  queryClient.setMutationDefaults(MUTATION_KEYS.createTask, {
    scope: MUTATION_SCOPE,
    mutationFn: async (task: Omit<TaskInsert, 'user_id'> & { id?: string; userId?: string }) => {
      const userId = task.userId || (await supabase.auth.getUser()).data.user?.id
      if (!userId) throw new Error('Not authenticated')

      const id = task.id || randomUUID()
      const { userId: _u, ...taskFields } = task

      // Idempotent upsert: use .select() without .single() so replaying an ignored row doesn't fail
      const { data, error } = await supabase
        .from('tasks')
        .upsert({ ...taskFields, id, user_id: userId }, { ignoreDuplicates: true })
        .select()

      if (error) throw error
      if (data && data.length > 0) {
        return data[0]
      }

      // If already applied previously, fetch existing row by id or return input
      const { data: existing, error: fetchErr } = await supabase
        .from('tasks')
        .select()
        .eq('id', id)
        .maybeSingle()

      if (fetchErr) {
        return { ...taskFields, id, user_id: userId }
      }
      return existing ?? { ...taskFields, id, user_id: userId }
    },
  })

  // 2. Update task
  queryClient.setMutationDefaults(MUTATION_KEYS.updateTask, {
    scope: MUTATION_SCOPE,
    mutationFn: async ({ id, userId: _u, ...updates }: TaskUpdate & { id: string; userId?: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  // 3. Delete task (captures date and userId at call time)
  queryClient.setMutationDefaults(MUTATION_KEYS.deleteTask, {
    scope: MUTATION_SCOPE,
    mutationFn: async (vars: string | { id: string; date?: string; userId?: string }) => {
      const id = typeof vars === 'string' ? vars : vars.id
      const date = (typeof vars === 'object' && vars.date) ? vars.date : todayLocal()
      const userId = (typeof vars === 'object' && vars.userId) ? vars.userId : null

      const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id
      if (effectiveUserId) {
        await supabase
          .from('daily_todos')
          .delete()
          .eq('user_id', effectiveUserId)
          .eq('task_id', id)
          .eq('done', false)
          .lte('date', date)
      }

      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
  })

  // 4. Toggle daily todo
  queryClient.setMutationDefaults(MUTATION_KEYS.toggleDailyTodo, {
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
      const { error } = await supabase
        .from('daily_todos')
        .update({ done })
        .eq('id', id)

      if (error) throw error

      if (habitId) {
        const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id
        if (effectiveUserId) {
          const entryDate = date || todayLocal()
          await supabase.from('habit_logs').upsert(
            {
              habit_id: habitId,
              user_id: effectiveUserId,
              date: entryDate,
              completed: done,
            },
            { onConflict: 'habit_id,date' }
          )
        }
      }
    },
  })

  // 5. Toggle habit
  queryClient.setMutationDefaults(MUTATION_KEYS.toggleHabit, {
    scope: MUTATION_SCOPE,
    mutationFn: async ({
      habitId,
      date,
      completed,
      userId,
    }: {
      habitId: string
      date: string
      completed: boolean
      userId?: string | null
    }) => {
      const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id
      if (!effectiveUserId) throw new Error('Not authenticated')

      const { error } = await supabase.from('habit_logs').upsert(
        {
          habit_id: habitId,
          user_id: effectiveUserId,
          date,
          completed,
        },
        { onConflict: 'habit_id,date' }
      )

      if (error) throw error

      await supabase
        .from('daily_todos')
        .update({ done: completed })
        .eq('user_id', effectiveUserId)
        .eq('habit_id', habitId)
        .eq('date', date)
    },
  })

  // 6. Create ad-hoc todo (idempotent create, captures date and userId at call time)
  queryClient.setMutationDefaults(MUTATION_KEYS.createAdhocTodo, {
    scope: MUTATION_SCOPE,
    mutationFn: async (
      vars: string | { id?: string; title: string; date?: string; userId?: string }
    ) => {
      const id = (typeof vars === 'string' ? null : vars.id) || randomUUID()
      const title = typeof vars === 'string' ? vars : vars.title
      const date = (typeof vars === 'object' && vars.date) ? vars.date : todayLocal()
      const userId = (typeof vars === 'object' && vars.userId) ? vars.userId : null

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

      if (fetchErr) {
        return insert
      }
      return existing ?? insert
    },
  })
}
