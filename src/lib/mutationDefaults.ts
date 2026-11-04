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

export function registerMutationDefaults(queryClient: QueryClient) {
  // 1. Create task
  queryClient.setMutationDefaults(MUTATION_KEYS.createTask, {
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
  })

  // 2. Update task
  queryClient.setMutationDefaults(MUTATION_KEYS.updateTask, {
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
  })

  // 3. Delete task
  queryClient.setMutationDefaults(MUTATION_KEYS.deleteTask, {
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const today = todayLocal()
        await supabase
          .from('daily_todos')
          .delete()
          .eq('user_id', user.id)
          .eq('task_id', id)
          .eq('done', false)
          .lte('date', today)
      }

      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
  })

  // 4. Toggle daily todo
  queryClient.setMutationDefaults(MUTATION_KEYS.toggleDailyTodo, {
    mutationFn: async ({
      id,
      done,
      habitId,
      date,
    }: {
      id: string
      done: boolean
      habitId?: string | null
      date?: string | null
    }) => {
      const { error } = await supabase
        .from('daily_todos')
        .update({ done })
        .eq('id', id)

      if (error) throw error

      if (habitId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const today = todayLocal()
          await supabase.from('habit_logs').upsert(
            {
              habit_id: habitId,
              user_id: user.id,
              date: date || today,
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
    mutationFn: async ({
      habitId,
      date,
      completed,
    }: {
      habitId: string
      date: string
      completed: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('habit_logs').upsert(
        {
          habit_id: habitId,
          user_id: user.id,
          date,
          completed,
        },
        { onConflict: 'habit_id,date' }
      )

      if (error) throw error

      await supabase
        .from('daily_todos')
        .update({ done: completed })
        .eq('user_id', user.id)
        .eq('habit_id', habitId)
        .eq('date', date)
    },
  })

  // 6. Create ad-hoc todo
  queryClient.setMutationDefaults(MUTATION_KEYS.createAdhocTodo, {
    mutationFn: async (vars: string | { id?: string; title: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const id = (typeof vars === 'string' ? null : vars.id) || randomUUID()
      const title = typeof vars === 'string' ? vars : vars.title
      const insert: DailyTodoInsert = {
        id,
        user_id: user.id,
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
  })
}
