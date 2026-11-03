import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Habits from '../pages/Habits'
import StreakDots from '../components/habits/StreakDots'
import HabitDetail from '../components/habits/HabitDetail'
import type { Habit, HabitLog } from '../hooks/useHabits'
import { todayLocal, addDaysLocal } from '../lib/dates'

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-habits', email: 'habits@example.com' },
  }),
}))

// Mock showUndo
const mockShowUndo = vi.fn()
vi.mock('../lib/undo', () => ({
  showUndo: (opts: unknown) => mockShowUndo(opts),
}))

const mockCreateHabitMutate = vi.fn()
const mockUpdateHabitMutate = vi.fn()
const mockReorderHabitsMutate = vi.fn()
const mockArchiveHabitMutate = vi.fn()
const mockRestoreHabitMutate = vi.fn()
const mockDeletePermanentlyMutate = vi.fn()
const mockToggleHabitLogMutate = vi.fn()

const mockHabits: Habit[] = []
const mockArchivedHabits: Habit[] = []
const mockLogs: HabitLog[] = []

vi.mock('../hooks/useHabits', () => ({
  useHabits: () => ({
    data: mockHabits,
    isLoading: false,
  }),
  useArchivedHabits: () => ({
    data: mockArchivedHabits,
    isLoading: false,
  }),
  useHabitLogs: () => ({
    data: mockLogs,
    isLoading: false,
  }),
  useCreateHabit: () => ({ mutate: mockCreateHabitMutate, isPending: false }),
  useUpdateHabit: () => ({ mutate: mockUpdateHabitMutate, isPending: false }),
  useReorderHabits: () => ({ mutate: mockReorderHabitsMutate, isPending: false }),
  useArchiveHabit: () => ({ mutate: mockArchiveHabitMutate, isPending: false }),
  useRestoreHabit: () => ({ mutate: mockRestoreHabitMutate, isPending: false }),
  useDeleteHabitPermanently: () => ({ mutate: mockDeletePermanentlyMutate, isPending: false }),
  useToggleHabitLog: () => ({ mutate: mockToggleHabitLogMutate, isPending: false }),
}))

// Mock QueryClient
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueriesData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({ data: mockHabits, isLoading: false }),
  useMutation: () => ({ mutate: vi.fn() }),
}))

describe('Phase 3 Batch 4: Habits (/habits Habits) P3-6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHabits.length = 0
    mockArchivedHabits.length = 0
    mockLogs.length = 0
  })

  it('computes stats header: Today done/due for due habits only and 30-day rate', () => {
    const today = todayLocal()
    // Habit 1: Daily, completed today
    mockHabits.push({
      id: 'h-1',
      user_id: 'test-user-habits',
      name: 'Drink Water',
      icon: '💧',
      frequency: 'daily',
      custom_days: null,
      active: true,
      sort_order: 0,
      created_at: '2026-03-01T00:00:00Z',
    })
    mockLogs.push({
      id: 'log-1',
      habit_id: 'h-1',
      user_id: 'test-user-habits',
      date: today,
      completed: true,
    })

    // Habit 2: Daily, not completed today
    mockHabits.push({
      id: 'h-2',
      user_id: 'test-user-habits',
      name: 'Read 20 pages',
      icon: '📚',
      frequency: 'daily',
      custom_days: null,
      active: true,
      sort_order: 1,
      created_at: '2026-03-01T00:00:00Z',
    })

    render(<Habits />)

    // Today progress should show 1/2
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('/2')).toBeDefined()
  })

  it('StreakDots is frequency-aware and greys out not-due days', () => {
    // Habit that is scheduled on weekdays only
    const weekdaysHabit: Partial<Habit> = {
      frequency: 'weekdays',
      created_at: '2026-01-01T00:00:00Z',
    }

    const { container } = render(
      <StreakDots
        completedDates={[]}
        habit={weekdaysHabit as Habit}
        days={7}
      />
    )

    // Check that not-scheduled dots have the grey styling
    const notScheduledDots = container.querySelectorAll('[title*="Not scheduled"]')
    // In any 7 consecutive days, exactly 2 days are weekends (Sat, Sun)
    expect(notScheduledDots.length).toBe(2)
  })

  it('disables checkbox and displays "Not scheduled today" when habit is not due today', () => {
    // Habit scheduled on a custom day that is guaranteed not today
    const d = new Date()
    const weekdayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const todayDayName = weekdayNames[d.getDay()]
    const otherDayName = todayDayName === 'mon' ? 'tue' : 'mon'

    mockHabits.push({
      id: 'h-not-due',
      user_id: 'test-user-habits',
      name: 'Special Weekly Review',
      icon: '📝',
      frequency: 'custom',
      custom_days: [otherDayName],
      active: true,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    })

    render(<Habits />)

    expect(screen.getByText('Special Weekly Review')).toBeDefined()
    expect(screen.getByText('Not scheduled today')).toBeDefined()

    const checkbox = screen.getByRole('button', { name: /Not scheduled today/i })
    expect((checkbox as HTMLButtonElement).disabled).toBe(true)
  })

  it('opens HabitDetail with 30/90-day calendar on tapping a habit row', () => {
    const today = todayLocal()
    const habit: Habit = {
      id: 'h-detail',
      user_id: 'test-user-habits',
      name: 'Workout',
      icon: '💪',
      frequency: 'daily',
      custom_days: null,
      active: true,
      sort_order: 0,
      created_at: '2026-03-01T00:00:00Z',
    }

    mockHabits.push(habit)
    mockLogs.push({
      id: 'log-w1',
      habit_id: 'h-detail',
      user_id: 'test-user-habits',
      date: today,
      completed: true,
    })

    render(<Habits />)

    // Tap habit row
    const row = screen.getByLabelText(/View details for Workout/i)
    fireEvent.click(row)

    // HabitDetail bottom sheet opens
    expect(screen.getByText('Habit Overview')).toBeDefined()
    expect(screen.getByText('Current Streak')).toBeDefined()
    expect(screen.getByText('Best Streak')).toBeDefined()
    expect(screen.getByText('Completion Calendar')).toBeDefined()

    // Can toggle between 30 and 90 days
    const ninetyDayBtn = screen.getByRole('button', { name: '90 Days' })
    fireEvent.click(ninetyDayBtn)
    expect(screen.getByText('90d Consistency')).toBeDefined()
  })

  it('HabitDetail archive calls showUndo', () => {
    const habit: Habit = {
      id: 'h-archive-test',
      user_id: 'test-user-habits',
      name: 'Old Habit',
      icon: '🌱',
      frequency: 'daily',
      custom_days: null,
      active: true,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    }

    const mockArchive = vi.fn()
    const mockEdit = vi.fn()

    render(
      <HabitDetail
        habit={habit}
        isOpen={true}
        onClose={vi.fn()}
        logs={[]}
        onEdit={mockEdit}
        onArchive={mockArchive}
      />
    )

    const archiveBtn = screen.getByRole('button', { name: /^archive$/i })
    fireEvent.click(archiveBtn)

    expect(mockArchive).toHaveBeenCalledWith(habit)
  })

  it('renders archived habits section with restore button', () => {
    mockArchivedHabits.push({
      id: 'h-archived-1',
      user_id: 'test-user-habits',
      name: 'Archived Meditation',
      icon: '🧘',
      frequency: 'daily',
      custom_days: null,
      active: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
    })

    render(<Habits />)

    // Open archived section
    const toggleArchived = screen.getByText(/Archived habits \(1\)/i)
    fireEvent.click(toggleArchived)

    expect(screen.getByText('Archived Meditation')).toBeDefined()
    const restoreBtn = screen.getByRole('button', { name: /Restore/i })
    fireEvent.click(restoreBtn)

    expect(mockRestoreHabitMutate).toHaveBeenCalledWith('h-archived-1')
  })

  it('monthStart calculation in Habits is TZ-sensitive at 00:30 Asia/Kolkata and exactly 30 days before todayLocal', () => {
    // 00:30 on 2026-04-15 Asia/Kolkata (which is 19:00 on 2026-04-14 UTC)
    vi.useFakeTimers()
    const fakeTime = new Date('2026-04-14T19:00:00.000Z')
    vi.setSystemTime(fakeTime)

    try {
      const today = todayLocal()
      expect(today).toBe('2026-04-15')

      const expectedMonthStart = addDaysLocal(today, -30)
      expect(expectedMonthStart).toBe('2026-03-16')

      // Buggy toISOString approach would have yielded 2026-03-15
      const buggyDate = new Date()
      buggyDate.setDate(buggyDate.getDate() - 30)
      const buggyMonthStart = buggyDate.toISOString().slice(0, 10)
      expect(buggyMonthStart).toBe('2026-03-15')
      expect(expectedMonthStart).not.toBe(buggyMonthStart)

      // Add a habit that was completed on exactly the expectedMonthStart (2026-03-16)
      mockHabits.push({
        id: 'h-tz-test',
        user_id: 'test-user-habits',
        name: 'Early Morning Run',
        icon: '🏃',
        frequency: 'daily',
        custom_days: null,
        active: true,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
      })
      // Only 1 log in the last 30 days, right on monthStart
      mockLogs.push({
        id: 'log-tz-1',
        habit_id: 'h-tz-test',
        user_id: 'test-user-habits',
        date: '2026-03-16',
        completed: true,
      })

      render(<Habits />)

      // Rate is calculated using completionRate(h, hCompletedDates, monthStart, todayStr)
      // Since monthStart is 2026-03-16, the log on 2026-03-16 is counted!
      // Total days in interval 2026-03-16 to 2026-04-15 is 31 days. 1/31 = 3%
      expect(screen.getByText('30d Rate')).toBeDefined()
      expect(screen.getByText('3')).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })
})
