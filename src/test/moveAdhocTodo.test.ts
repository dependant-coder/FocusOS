import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useMoveTodoDate } from '../hooks/useDailyTodos'
import { todayLocal, addDaysLocal } from '../lib/dates'
import { supabase } from '../lib/supabase'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-test-456' },
  }),
}))

interface MockTodo {
  id: string
  user_id: string
  title: string
  done: boolean
  date: string
  task_id: string | null
  habit_id: string | null
}

describe('useMoveTodoDate ad-hoc multi-row cleanup', () => {
  let inMemoryDb: MockTodo[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    const today = todayLocal()
    const yesterday = addDaysLocal(today, -1)
    const threeDaysAgo = addDaysLocal(today, -3)

    inMemoryDb = [
      {
        id: 'todo-carried-1',
        user_id: 'user-test-456',
        title: 'Buy groceries',
        done: false,
        date: threeDaysAgo,
        task_id: null,
        habit_id: null,
      },
      {
        id: 'todo-carried-2',
        user_id: 'user-test-456',
        title: 'Buy groceries',
        done: false,
        date: yesterday,
        task_id: null,
        habit_id: null,
      },
      {
        id: 'todo-today',
        user_id: 'user-test-456',
        title: 'Buy groceries',
        done: false,
        date: today,
        task_id: null,
        habit_id: null,
      },
      {
        id: 'todo-completed-yesterday',
        user_id: 'user-test-456',
        title: 'Buy groceries',
        done: true,
        date: yesterday,
        task_id: null,
        habit_id: null,
      },
      {
        id: 'todo-other-task',
        user_id: 'user-test-456',
        title: 'Read chapter 3',
        done: false,
        date: today,
        task_id: null,
        habit_id: null,
      },
    ]

    // Mock supabase.from('daily_todos') operations
    type FilterFn = (item: MockTodo) => boolean

    interface MockQueryBuilder {
      _filters: FilterFn[]
      _isDelete: boolean
      _updateData: Partial<MockTodo> | null
      select: () => MockQueryBuilder
      eq: (col: keyof MockTodo, val: unknown) => MockQueryBuilder
      neq: (col: keyof MockTodo, val: unknown) => MockQueryBuilder
      is: (col: keyof MockTodo, val: unknown) => MockQueryBuilder
      lte: (col: keyof MockTodo, val: string) => MockQueryBuilder
      delete: () => MockQueryBuilder
      update: (data: Partial<MockTodo>) => MockQueryBuilder
      then: (resolve: (res: { error: null }) => void) => void
    }

    vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'daily_todos') {
        const queryBuilder: MockQueryBuilder = {
          _filters: [],
          _isDelete: false,
          _updateData: null,
          select: vi.fn(() => queryBuilder),
          eq: vi.fn((col: keyof MockTodo, val: unknown) => {
            queryBuilder._filters.push((item: MockTodo) => item[col] === val)
            return queryBuilder
          }),
          neq: vi.fn((col: keyof MockTodo, val: unknown) => {
            queryBuilder._filters.push((item: MockTodo) => item[col] !== val)
            return queryBuilder
          }),
          is: vi.fn((col: keyof MockTodo, val: unknown) => {
            queryBuilder._filters.push((item: MockTodo) => item[col] === val)
            return queryBuilder
          }),
          lte: vi.fn((col: keyof MockTodo, val: string) => {
            queryBuilder._filters.push((item: MockTodo) => {
              const itemVal = item[col]
              return itemVal !== null && typeof itemVal === 'string' && itemVal <= val
            })
            return queryBuilder
          }),
          delete: vi.fn(() => {
            queryBuilder._isDelete = true
            return queryBuilder
          }),
          update: vi.fn((data: Partial<MockTodo>) => {
            queryBuilder._updateData = data
            return queryBuilder
          }),
          then: vi.fn((resolve: (res: { error: null }) => void) => {
            if (queryBuilder._isDelete) {
              inMemoryDb = inMemoryDb.filter((item) => {
                const matchesAll = queryBuilder._filters.every((f) => f(item))
                return !matchesAll
              })
              resolve({ error: null })
            } else if (queryBuilder._updateData) {
              const data = queryBuilder._updateData
              inMemoryDb = inMemoryDb.map((item) => {
                const matchesAll = queryBuilder._filters.every((f) => f(item))
                return matchesAll ? { ...item, ...data } : item
              })
              resolve({ error: null })
            } else {
              resolve({ error: null })
            }
          }),
        }
        return queryBuilder as unknown as ReturnType<typeof supabase.from>
      }
      return {} as unknown as ReturnType<typeof supabase.from>
    }) as unknown as typeof supabase.from)
  })

  it('moving ad-hoc todo to next week leaves no undone same-title rows dated <= today', async () => {
    const today = todayLocal()
    const nextWeek = addDaysLocal(today, 7)

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useMoveTodoDate(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        todoId: 'todo-today',
        title: 'Buy groceries',
        taskId: null,
        habitId: null,
        newDate: nextWeek,
      })
    })

    // 1. The moved item is now on next week
    const movedItem = inMemoryDb.find((item) => item.id === 'todo-today')
    expect(movedItem).toBeDefined()
    expect(movedItem?.date).toBe(nextWeek)

    // 2. CRITICAL: No undone 'Buy groceries' rows dated <= today remain
    const remainingUndonePastOrToday = inMemoryDb.filter(
      (item) => item.title === 'Buy groceries' && !item.done && item.date <= today
    )
    expect(remainingUndonePastOrToday).toHaveLength(0)

    // 3. Completed history row is preserved
    const completedHistory = inMemoryDb.find((item) => item.id === 'todo-completed-yesterday')
    expect(completedHistory).toBeDefined()
    expect(completedHistory?.done).toBe(true)

    // 4. Other task is untouched
    const otherTask = inMemoryDb.find((item) => item.id === 'todo-other-task')
    expect(otherTask).toBeDefined()
    expect(otherTask?.date).toBe(today)
  })
})
