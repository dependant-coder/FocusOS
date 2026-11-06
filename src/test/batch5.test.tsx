import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Weekly from '../pages/Weekly'
import { Analytics } from '../pages/Analytics'
import Settings from '../pages/Settings'
import { todayLocal, startOfWeekLocal, addDaysLocal } from '../lib/dates'
import type { WeeklyReviewWithLive } from '../hooks/useWeekly'

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-b5', email: 'batch5@example.com' },
    signOut: vi.fn(),
  }),
}))

// Mock useWeekly
const mockWeeklyReview: WeeklyReviewWithLive = {
  id: 'wr-1',
  user_id: 'test-user-b5',
  week_start: startOfWeekLocal(todayLocal()),
  tasks_completed: 12,
  tasks_missed: 3,
  completion_rate: 80,
  habits_due: 14,
  habits_done: 12,
  habit_completion_rate: 86,
  carried_over_count: 2,
  focus_minutes: 0,
  wins: 'Aced midterms',
  blockers: 'Slept late',
  next_priorities: '- Study biology\n- Math assignment',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  isLive: false,
  bestDay: '2026-04-14',
}

const mockUpdateWeeklyMutate = vi.fn()
const mockPlanNextWeekMutate = vi.fn()

vi.mock('../hooks/useWeekly', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useWeekly')>()
  return {
    ...actual,
    useWeekly: () => ({
      data: mockWeeklyReview,
      isLoading: false,
    }),
    useUpdateWeekly: () => ({
      mutate: mockUpdateWeeklyMutate,
      isPending: false,
    }),
    usePlanNextWeek: () => ({
      mutate: mockPlanNextWeekMutate,
      isPending: false,
    }),
  }
})

// Mock useAnalytics
vi.mock('../hooks/useAnalytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useAnalytics')>()
  return {
    ...actual,
    useAnalyticsSummary: () => ({
      data: {
        tasksInRange: 15,
        allTimeCompleted: 42,
        bestWeekday: 'Tuesday',
        longestStreak: 9,
        habitConsistencyRate: 88,
      },
      isLoading: false,
    }),
    useTaskCompletionTrend: () => ({
      data: [
        { fullDate: '2026-04-14', date: 'Apr 14', completed: 5 },
        { fullDate: '2026-04-15', date: 'Apr 15', completed: 10 },
      ],
      isLoading: false,
    }),
    useCategoryDistribution: () => ({
      data: [
        { name: 'college', value: 8 },
        { name: 'personal', value: 5 },
        { name: 'skill', value: 2 },
      ],
      isLoading: false,
    }),
    useWeeklyCompletionTrend: () => ({
      data: [{ week: 'Apr 7', rate: 75 }, { week: 'Apr 14', rate: 80 }],
      isLoading: false,
    }),
    useFocusTrend: () => ({
      data: [
        { fullDate: '2026-04-14', date: 'Apr 14', minutes: 50 },
        { fullDate: '2026-04-15', date: 'Apr 15', minutes: 75 },
      ],
      isLoading: false,
    }),
    useHabitHeatmap: () => ({
      data: [
        {
          id: 'h1',
          name: 'Morning Meditation',
          icon: '🧘',
          days: [
            { date: '2026-04-14', isDue: true, completed: true },
            { date: '2026-04-15', isDue: true, completed: false },
          ],
        },
      ],
      isLoading: false,
    }),
  }
})

// Mock useSettings
const mockProfile = {
  id: 'test-user-b5',
  name: 'Focus Student',
  timezone: 'Asia/Kolkata',
  notif_on: true,
  notif_time: '08:30:00',
  weekly_reminder_on: true,
  weekly_reminder_time: '18:00:00',
  weekly_reminder_day: 0,
}

const mockUpdateProfileMutate = vi.fn()
const mockExportDataMutate = vi.fn()
const mockExportCsvMutate = vi.fn()

vi.mock('../hooks/useSettings', () => ({
  useProfile: () => ({
    data: mockProfile,
    isLoading: false,
  }),
  useUpdateProfile: () => ({
    mutate: mockUpdateProfileMutate,
    isPending: false,
  }),
  useExportData: () => ({
    mutate: mockExportDataMutate,
    isPending: false,
  }),
  useExportCsv: () => ({
    mutate: mockExportCsvMutate,
    isPending: false,
  }),
}))

describe('Phase 3 Batch 5: Weekly (P3-7), Analytics (P3-8), Settings (P3-9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('P3-7: /weekly Weekly Review', () => {
    it('renders weekly summary card and reflection form without placeholder focus minutes', () => {
      render(
        <MemoryRouter>
          <Weekly />
        </MemoryRouter>
      )

      expect(screen.getByText('Weekly Review')).toBeDefined()
      expect(screen.getByText('80% Done')).toBeDefined()
      expect(screen.getByText('12')).toBeDefined() // tasks completed
      expect(screen.getByText('3')).toBeDefined() // tasks missed
      expect(screen.getByText('86%')).toBeDefined() // habit completion
      expect(screen.getByText('2')).toBeDefined() // carried over

      // Focus minutes UI must be omitted (no placeholder numbers)
      expect(screen.queryByText(/focus minutes/i)).toBeNull()

      // Reflection fields
      expect(screen.getByLabelText(/Wins this week/i)).toBeDefined()
      expect(screen.getByLabelText(/Blockers/i)).toBeDefined()
      expect(screen.getByLabelText(/Next week's priorities/i)).toBeDefined()
    })

    it('has accessible week navigation controls and This Week jump', () => {
      render(
        <MemoryRouter>
          <Weekly />
        </MemoryRouter>
      )

      const prevBtn = screen.getByRole('button', { name: 'Previous week' })
      expect(prevBtn).toBeDefined()

      const nextBtn = screen.getByRole('button', { name: 'Next week' })
      expect(nextBtn).toBeDefined()

      // When on current week, next week is disabled
      expect((nextBtn as HTMLButtonElement).disabled).toBe(true)

      // Navigate to previous week
      fireEvent.click(prevBtn)

      // "This week" jump button should now appear
      const thisWeekBtn = screen.getByRole('button', { name: 'Jump to this week' })
      expect(thisWeekBtn).toBeDefined()

      fireEvent.click(thisWeekBtn)
      expect(screen.queryByRole('button', { name: 'Jump to this week' })).toBeNull()
    })

    it('opens plan next week sheet and creates tasks due next Monday', () => {
      render(
        <MemoryRouter>
          <Weekly />
        </MemoryRouter>
      )

      const planBtn = screen.getByRole('button', { name: /Plan next week/i })
      fireEvent.click(planBtn)

      expect(screen.getByText('Plan Next Week')).toBeDefined()
      expect(screen.getByText('Study biology')).toBeDefined()
      expect(screen.getByText('Math assignment')).toBeDefined()

      const createTasksBtn = screen.getByRole('button', { name: /Create 2 Tasks/i })
      fireEvent.click(createTasksBtn)

      expect(mockPlanNextWeekMutate).toHaveBeenCalled()
      const callArgs = mockPlanNextWeekMutate.mock.calls[0][0]
      expect(callArgs.items).toEqual(['Study biology', 'Math assignment'])
      const nextMon = addDaysLocal(startOfWeekLocal(todayLocal()), 7)
      expect(callArgs.nextMonday).toBe(nextMon)
    })
  })

  describe('P3-8: /analytics Analytics', () => {
    it('renders 7/30/90 range toggle, productivity pattern, and charts', () => {
      render(
        <MemoryRouter>
          <Analytics />
        </MemoryRouter>
      )

      expect(screen.getByText('Analytics')).toBeDefined()

      // 7/30/90 Range toggle buttons
      expect(screen.getByRole('tab', { name: '7 Days' })).toBeDefined()
      expect(screen.getByRole('tab', { name: '30 Days' })).toBeDefined()
      expect(screen.getByRole('tab', { name: '90 Days' })).toBeDefined()

      // Productivity pattern insight from completed_at
      expect(screen.getByText(/You complete the most tasks on/i)).toBeDefined()
      expect(screen.getByText(/Tuesdays/i)).toBeDefined()

      // Stat cards
      expect(screen.getByText('15')).toBeDefined() // tasks in range
      expect(screen.getByText('42')).toBeDefined() // all-time done
      expect(screen.getByText('88%')).toBeDefined() // habit consistency
      expect(screen.getByText('9 d')).toBeDefined() // top streak

      // Charts sections
      expect(screen.getByText(/Tasks Completed \(30 Days\)/i)).toBeDefined()
      expect(screen.getByText(/Category Distribution \(30 Days\)/i)).toBeDefined()
      expect(screen.getByText(/Weekly Completion Rate \(Last 12 Weeks\)/i)).toBeDefined()
      expect(screen.getByText(/Habit Consistency \(30 Days\)/i)).toBeDefined()

      // Focus minutes UI must be omitted
      expect(screen.queryByText(/focus minutes/i)).toBeNull()
    })

    it('switching time range updates active tab', () => {
      render(
        <MemoryRouter>
          <Analytics />
        </MemoryRouter>
      )

      const sevenDaysTab = screen.getByRole('tab', { name: '7 Days' })
      fireEvent.click(sevenDaysTab)

      expect(sevenDaysTab.getAttribute('aria-selected')).toBe('true')
    })
  })

  describe('P3-9: /settings Settings', () => {
    it('renders profile section with editable timezone select and password change link', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      )

      expect(screen.getByText('Profile')).toBeDefined()
      expect(screen.getByText('Focus Student')).toBeDefined()
      expect(screen.getByText('batch5@example.com')).toBeDefined()

      // Timezone selector
      const tzSelect = screen.getByLabelText('User timezone') as HTMLSelectElement
      expect(tzSelect).toBeDefined()
      expect(tzSelect.value).toBe('Asia/Kolkata')

      // Change timezone
      fireEvent.change(tzSelect, { target: { value: 'America/New_York' } })
      expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
        { timezone: 'America/New_York' },
        expect.anything()
      )

      // Change password link
      expect(screen.getByText('Change Password')).toBeDefined()
    })

    it('renders notification controls and debounced reminder time inputs', async () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      )

      expect(screen.getByText('Push Reminders')).toBeDefined()
      expect(screen.getByText('Daily Focus Reminders')).toBeDefined()
      expect(screen.getByText('Weekly Review Prompt')).toBeDefined()

      // Notification time inputs
      const timeInputs = screen.getAllByDisplayValue(/\d\d:\d\d/)
      expect(timeInputs.length).toBeGreaterThanOrEqual(1)

      // Change daily reminder time
      fireEvent.change(timeInputs[0], { target: { value: '09:15' } })

      // Debounce wait (500 ms)
      await waitFor(
        () => {
          expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
            { notif_time: '09:15:00' },
            expect.anything()
          )
        },
        { timeout: 1000 }
      )
    })

    it('renders appearance options and CSV export buttons', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      )

      // Appearance options
      expect(screen.getByText('Light')).toBeDefined()
      expect(screen.getByText('Dark')).toBeDefined()
      expect(screen.getByText('System')).toBeDefined()
      expect(screen.getByText('Reduce Motion')).toBeDefined()
      expect(screen.getByText('Daily Quote')).toBeDefined()

      // Export CSV buttons
      const exportJsonBtn = screen.getByText('Export All Data (JSON)')
      expect(exportJsonBtn).toBeDefined()

      const tasksCsvBtn = screen.getByRole('button', { name: 'Tasks.csv' })
      expect(tasksCsvBtn).toBeDefined()
      fireEvent.click(tasksCsvBtn)
      expect(mockExportCsvMutate).toHaveBeenCalledWith('tasks')

      const habitsCsvBtn = screen.getByRole('button', { name: 'Habits.csv' })
      fireEvent.click(habitsCsvBtn)
      expect(mockExportCsvMutate).toHaveBeenCalledWith('habits')
    })
  })
})
