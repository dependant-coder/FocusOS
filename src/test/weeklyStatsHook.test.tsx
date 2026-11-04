/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useWeekly } from '../hooks/useWeekly'
import { useWeeklyCompletionTrend, useTaskCompletionTrend } from '../hooks/useAnalytics'
import { supabase } from '../lib/supabase'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-stats', email: 'stats@example.com' },
    loading: false,
    signOut: vi.fn(),
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function createQueryMock(resolveValue: any) {
  const mock: any = {}
  const chainMethods = ['select', 'eq', 'neq', 'gte', 'lte', 'lt', 'or', 'not', 'order', 'limit', 'range']
  chainMethods.forEach((method) => {
    mock[method] = vi.fn().mockImplementation(() => mock)
  })
  mock.maybeSingle = vi.fn().mockResolvedValue(resolveValue)
  mock.single = vi.fn().mockResolvedValue(resolveValue)
  mock.then = (resolve: any, reject: any) => Promise.resolve(resolveValue).then(resolve, reject)
  return mock
}

describe('useWeekly stats and useAnalytics hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1 & 2. useWeekly stored reflection row with null completion_rate', () => {
    it('computes live stats and merges with stored reflection fields when completion_rate is null', async () => {
      const weekStart = '2026-04-13'

      // Mock stored review with completion_rate null (reflection-only row)
      const mockStored = {
        id: 'stored-reflection-id-123',
        user_id: 'test-user-stats',
        week_start: weekStart,
        tasks_completed: 0,
        tasks_missed: 0,
        completion_rate: null, // NULL completion rate
        habits_due: 0,
        habits_done: 0,
        habit_completion_rate: null,
        carried_over_count: 0,
        focus_minutes: 0,
        wins: 'Saved draft wins',
        blockers: 'Saved draft blockers',
        next_priorities: 'Saved draft priorities',
        created_at: '2026-04-14T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z',
      }

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'weekly_reviews') {
          return createQueryMock({ data: mockStored, error: null })
        }
        if (table === 'daily_todos') {
          const dtMock = createQueryMock({
            data: [
              { date: '2026-04-14', done: true, type: 'adhoc' },
              { date: '2026-04-14', done: true, type: 'adhoc' },
              { date: '2026-04-15', done: true, type: 'adhoc' },
            ],
            count: 2,
            error: null,
          })
          return dtMock
        }
        if (table === 'tasks') {
          const tasksMock = createQueryMock({
            data: [],
            count: 8,
            error: null,
          })
          // Distinguish missed count query (neq) from completed count query (eq)
          tasksMock.neq = vi.fn().mockImplementation(() => {
            return createQueryMock({ count: 2, error: null })
          })
          return tasksMock
        }
        if (table === 'habits') {
          return createQueryMock({
            data: [
              { id: 'h1', name: 'Read', frequency: 'daily', created_at: '2026-04-01T00:00:00Z', active: true },
            ],
            error: null,
          })
        }
        if (table === 'habit_logs') {
          return createQueryMock({
            data: [],
            count: 5,
            error: null,
          })
        }
        return createQueryMock({ data: null, error: null })
      })

      const { result } = renderHook(() => useWeekly(weekStart), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const data = result.current.data
      expect(data).toBeDefined()
      // Kept stored ID and reflections
      expect(data?.id).toBe('stored-reflection-id-123')
      expect(data?.wins).toBe('Saved draft wins')
      expect(data?.blockers).toBe('Saved draft blockers')
      expect(data?.next_priorities).toBe('Saved draft priorities')

      // But marked as live and computed stats
      expect(data?.isLive).toBe(true)
      expect(data?.tasks_completed).toBe(8)
      expect(data?.tasks_missed).toBe(2)
      // total = 10, completed = 8 -> 80%
      expect(data?.completion_rate).toBe(80)
      expect(data?.carried_over_count).toBe(2)
      expect(data?.habits_done).toBe(5)
      expect(data?.bestDay).toBe('2026-04-14')
    })

    it('returns stored stats directly when stored.completion_rate is NOT null', async () => {
      const weekStart = '2026-04-06'
      const mockStoredCompleted = {
        id: 'stored-final-id-456',
        user_id: 'test-user-stats',
        week_start: weekStart,
        tasks_completed: 15,
        tasks_missed: 1,
        completion_rate: 94,
        habits_due: 14,
        habits_done: 14,
        habit_completion_rate: 100,
        carried_over_count: 1,
        focus_minutes: 0,
        wins: 'Final wins',
        blockers: null,
        next_priorities: null,
        created_at: '2026-04-13T02:00:00Z',
        updated_at: '2026-04-13T02:00:00Z',
      }

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'weekly_reviews') {
          return createQueryMock({ data: mockStoredCompleted, error: null })
        }
        if (table === 'daily_todos') {
          return createQueryMock({ data: [], error: null })
        }
        return createQueryMock({ data: null, error: null })
      })

      const { result } = renderHook(() => useWeekly(weekStart), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const data = result.current.data
      expect(data?.id).toBe('stored-final-id-456')
      expect(data?.isLive).toBe(false)
      expect(data?.completion_rate).toBe(94)
      expect(data?.tasks_completed).toBe(15)
    })
  })

  describe('7. useAnalytics queries and skipping null completion_rate', () => {
    it('skips weeks where completion_rate is null in useWeeklyCompletionTrend', async () => {
      const mockReviewsFromDb = [
        { week_start: '2026-04-13', completion_rate: null }, // Reflection only: must be skipped
        { week_start: '2026-04-06', completion_rate: 85 },
        { week_start: '2026-03-30', completion_rate: 90 },
      ]

      vi.spyOn(supabase, 'from').mockReturnValue(
        createQueryMock({ data: mockReviewsFromDb, error: null })
      )

      const { result } = renderHook(() => useWeeklyCompletionTrend(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // The week with completion_rate null should be skipped completely
      expect(result.current.data).toHaveLength(2)
      expect(result.current.data?.find((d) => d.rate === 85)).toBeDefined()
      expect(result.current.data?.find((d) => d.rate === 90)).toBeDefined()
    })

    it('filters completed tasks by completed_at >= rangeStartIso with updated_at fallback', async () => {
      const taskMock = createQueryMock({
        data: [
          {
            id: 't-1',
            category: 'college',
            completed_at: '2026-04-14T10:00:00.000Z',
            updated_at: '2026-04-14T10:00:00.000Z',
          },
        ],
        error: null,
      })

      vi.spyOn(supabase, 'from').mockReturnValue(taskMock)

      const { result } = renderHook(() => useTaskCompletionTrend(7), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(taskMock.or).toHaveBeenCalledTimes(1)
      const orArg = taskMock.or.mock.calls[0][0]
      expect(orArg).toMatch(/^completed_at\.gte\..*,and\(completed_at\.is\.null,updated_at\.gte\..*\)$/)
    })
  })
})
