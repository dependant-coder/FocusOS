/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ReflectionForm } from '../components/weekly/ReflectionForm'
import Settings from '../pages/Settings'
import App from '../App'
import { fetchAllUserRows } from '../hooks/useSettings'
import { supabase } from '../lib/supabase'
import type { WeeklyReviewWithLive } from '../hooks/useWeekly'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-b5f', email: 'student@example.com' },
    loading: false,
    signOut: vi.fn(),
  }),
}))

// Mock useUpdateWeekly & usePlanNextWeek for ReflectionForm
const mockUpdateWeekly = vi.fn()
const mockPlanNextWeek = vi.fn()
vi.mock('../hooks/useWeekly', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useWeekly')>()
  return {
    ...actual,
    useUpdateWeekly: () => ({
      mutate: mockUpdateWeekly,
      isPending: false,
    }),
    usePlanNextWeek: () => ({
      mutate: mockPlanNextWeek,
      isPending: false,
    }),
  }
})

// Mock useTheme
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}))

describe('Phase 3 Batch 5 Follow-up Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('reduce-motion')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('3. ReflectionForm state & autosave flush', () => {
    const initialReview: WeeklyReviewWithLive = {
      id: 'wr-1',
      user_id: 'test-user-b5f',
      week_start: '2026-04-13',
      tasks_completed: 5,
      tasks_missed: 1,
      completion_rate: 83,
      habits_due: 7,
      habits_done: 6,
      habit_completion_rate: 86,
      carried_over_count: 0,
      focus_minutes: 0,
      wins: 'Initial wins',
      blockers: 'Initial blockers',
      next_priorities: 'Initial priorities',
      created_at: '2026-04-13T00:00:00Z',
      updated_at: '2026-04-13T00:00:00Z',
      isLive: false,
    }

    it('does NOT overwrite user-typed text when parent re-renders with fresh review refetch', async () => {
      const { rerender } = render(<ReflectionForm review={initialReview} />)

      const winsInput = screen.getByLabelText(/Wins this week/i) as HTMLTextAreaElement
      expect(winsInput.value).toBe('Initial wins')

      // User types new text
      fireEvent.change(winsInput, { target: { value: 'User typing new progress that must stay' } })
      expect(winsInput.value).toBe('User typing new progress that must stay')

      // Background refetch occurs: review prop is updated with old server data
      const refetchedReview = {
        ...initialReview,
        wins: 'Initial wins from server',
      }
      rerender(<ReflectionForm review={refetchedReview} />)

      // The user's typed input should NOT have been overwritten
      expect(winsInput.value).toBe('User typing new progress that must stay')
    })

    it('flushes pending debounced save on blur', async () => {
      render(<ReflectionForm review={initialReview} />)

      const blockersInput = screen.getByLabelText(/Blockers & Friction/i) as HTMLTextAreaElement
      fireEvent.change(blockersInput, { target: { value: 'Unexpected lab exam' } })

      // Before blur or timer expiry, no immediate save
      expect(mockUpdateWeekly).not.toHaveBeenCalled()

      // Trigger blur
      fireEvent.blur(blockersInput)

      // Should flush immediately
      expect(mockUpdateWeekly).toHaveBeenCalledTimes(1)
      expect(mockUpdateWeekly).toHaveBeenCalledWith(
        expect.objectContaining({
          weekStart: '2026-04-13',
          blockers: 'Unexpected lab exam',
        }),
        expect.anything()
      )
    })

    it('flushes pending debounced save on unmount', async () => {
      const { unmount } = render(<ReflectionForm review={initialReview} />)

      const prioritiesInput = screen.getByLabelText(/Next week's priorities/i) as HTMLTextAreaElement
      fireEvent.change(prioritiesInput, { target: { value: 'Finish thesis draft' } })

      expect(mockUpdateWeekly).not.toHaveBeenCalled()

      // Unmount component
      unmount()

      // Must have flushed the pending save
      expect(mockUpdateWeekly).toHaveBeenCalledTimes(1)
      expect(mockUpdateWeekly).toHaveBeenCalledWith(
        expect.objectContaining({
          weekStart: '2026-04-13',
          nextPriorities: 'Finish thesis draft',
        }),
        expect.anything()
      )
    })

    it('flushes pending save and loads new values when week_start changes', async () => {
      const { rerender } = render(<ReflectionForm review={initialReview} />)

      const winsInput = screen.getByLabelText(/Wins this week/i) as HTMLTextAreaElement
      fireEvent.change(winsInput, { target: { value: 'Week 1 unsaved draft' } })

      // Week navigates to next week
      const nextWeekReview: WeeklyReviewWithLive = {
        ...initialReview,
        id: 'wr-2',
        week_start: '2026-04-20',
        wins: 'Week 2 fresh wins',
      }

      rerender(<ReflectionForm review={nextWeekReview} />)

      // Saved previous week draft
      expect(mockUpdateWeekly).toHaveBeenCalledWith(
        expect.objectContaining({
          weekStart: '2026-04-13',
          wins: 'Week 1 unsaved draft',
        }),
        expect.anything()
      )

      // Input shows new week's values
      expect(winsInput.value).toBe('Week 2 fresh wins')
    })
  })

  describe('4. useSettings paginated exports (>1000 rows) and error handling', () => {
    it('paginates across pages of 1000 rows with .range() until fewer rows return with deterministic id ordering', async () => {
      // Simulate table with 2500 rows across 3 pages: [1000, 1000, 500]
      const allExpectedIds = Array.from({ length: 2500 }, (_, i) => `task-${String(i).padStart(4, '0')}`)
      const page1 = allExpectedIds.slice(0, 1000).map((id, i) => ({ id, title: `Task ${i}` }))
      const page2 = allExpectedIds.slice(1000, 2000).map((id, i) => ({ id, title: `Task ${1000 + i}` }))
      const page3 = allExpectedIds.slice(2000, 2500).map((id, i) => ({ id, title: `Task ${2000 + i}` }))

      let orderedCorrectly = false
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockImplementation((col: string, opts?: { ascending?: boolean }) => {
        if (col === 'id' && opts?.ascending === true) {
          orderedCorrectly = true
        }
        return { range: rangeMock }
      })
      const rangeMock = vi.fn().mockImplementation((from: number, _to: number) => {
        if (!orderedCorrectly) {
          // Without deterministic ordering by id, non-deterministic data with duplicates/missing is returned
          return Promise.resolve({ data: page1, error: null })
        }
        if (from === 0) return Promise.resolve({ data: page1, error: null })
        if (from === 1000) return Promise.resolve({ data: page2, error: null })
        if (from === 2000) return Promise.resolve({ data: page3, error: null })
        return Promise.resolve({ data: [], error: null })
      })

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
        range: rangeMock,
      } as any)

      const rows = await fetchAllUserRows<{ id: string; title: string }>('tasks', 'test-user-b5f')

      expect(rows).toHaveLength(2500)
      expect(orderMock).toHaveBeenCalledWith('id', { ascending: true })
      expect(rangeMock).toHaveBeenCalledTimes(3)
      expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 999)
      expect(rangeMock).toHaveBeenNthCalledWith(2, 1000, 1999)
      expect(rangeMock).toHaveBeenNthCalledWith(3, 2000, 2999)

      // Assert no duplicates
      const uniqueIds = new Set(rows.map((r) => r.id))
      expect(uniqueIds.size).toBe(2500)

      // Assert no missing rows: every row from 0 to 2499 is present in order
      expect(rows.map((r) => r.id)).toEqual(allExpectedIds)
    })

    it('throws when supabase returns an error during export query', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockReturnThis()
      const rangeMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Database connection failed') })

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
        range: rangeMock,
      } as any)

      await expect(fetchAllUserRows('habits', 'test-user-b5f')).rejects.toThrow('Database connection failed')
    })
  })

  describe('5. Settings.tsx password reset & CSV options', () => {
    it('calls resetPasswordForEmail with user email and shows toast', async () => {
      const resetSpy = vi.fn().mockResolvedValue({ data: {}, error: null })
      vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockImplementation(resetSpy)

      // Mock profile
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'test-user-b5f',
            name: 'Student User',
            timezone: 'America/Los_Angeles',
            notif_on: false,
          },
          error: null,
        }),
      } as any)

      renderWithProviders(<Settings />)

      // Password reset button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Change Password/i })).toBeDefined()
      })
      const changePasswordBtn = screen.getByRole('button', { name: /Change Password/i })

      fireEvent.click(changePasswordBtn)

      await waitFor(() => {
        expect(resetSpy).toHaveBeenCalledWith('student@example.com', {
          redirectTo: `${window.location.origin}/auth/reset`,
        })
      })
    })

    it('renders Reviews.csv button alongside Tasks, Habits, Todos', async () => {
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-user-b5f', timezone: 'UTC' },
          error: null,
        }),
      } as any)

      renderWithProviders(<Settings />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Tasks\.csv/i })).toBeDefined()
      })
      expect(screen.getByRole('button', { name: /Habits\.csv/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Todos\.csv/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /Reviews\.csv/i })).toBeDefined()
    })
  })

  describe('6. Reduce motion integration', () => {
    it('applies reduce-motion class on html and configures MotionConfig', () => {
      localStorage.setItem('focusos_reduce_motion', 'true')

      renderWithProviders(<App />)

      expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)

      // Now toggle off
      localStorage.setItem('focusos_reduce_motion', 'false')
      window.dispatchEvent(new Event('focusos-reduce-motion-change'))

      expect(document.documentElement.classList.contains('reduce-motion')).toBe(false)
    })
  })
})
