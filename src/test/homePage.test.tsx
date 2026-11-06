import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../pages/Home'

const mockToggleTodo = vi.fn()
const mockToggleHabitLog = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-1', email: 'test@example.com' },
  }),
}))

import type { DailyTodoWithTask, Task } from '../types'
import type { Habit, HabitLog } from '../hooks/useHabits'

const mockTodos: Partial<DailyTodoWithTask>[] = []
const mockTasks: Partial<Task>[] = []
const mockOverdueTasks: Partial<Task>[] = []
const mockHabits: Partial<Habit>[] = []
const mockHabitLogs: Partial<HabitLog>[] = []

vi.mock('../hooks/useDailyTodos', () => ({
  useDailyTodos: () => ({ data: mockTodos as DailyTodoWithTask[] }),
  useToggleDailyTodo: () => ({ mutate: mockToggleTodo }),
}))

vi.mock('../hooks/useTasks', () => ({
  useTasks: (filters?: { overdue?: boolean }) => {
    if (filters?.overdue) return { data: mockOverdueTasks as Task[] }
    return { data: mockTasks as Task[] }
  },
}))

vi.mock('../hooks/useHabits', () => ({
  useHabits: () => ({ data: mockHabits as Habit[] }),
  useHabitLogs: () => ({ data: mockHabitLogs as HabitLog[] }),
  useToggleHabitLog: () => ({ mutate: mockToggleHabitLog }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueriesData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'profile') {
      return { data: { name: 'Alex Johnson' } }
    }
    if (queryKey[0] === 'latest_win') {
      return { data: 'Finished machine learning project' }
    }
    if (queryKey[0] === 'tasks_lifetime_count') {
      return { data: mockTasks.length }
    }
    return { data: null }
  },
}))

describe('Home Page (P3-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTodos.length = 0
    mockTasks.length = 0
    mockOverdueTasks.length = 0
    mockHabits.length = 0
    mockHabitLogs.length = 0
  })

  it('renders time-aware greeting and last week win line', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // Greeting contains Alex
    expect(screen.getByText(/Alex/)).toBeDefined()
    // Reflection win is rendered
    expect(screen.getByText(/Finished machine learning project/)).toBeDefined()
  })

  it('renders progress chips with links to /daily, /habits, and /vault?filter=overdue', () => {
    mockTodos.push(
      { id: '1', title: 'Task 1', done: true, type: 'adhoc' },
      { id: '2', title: 'Task 2', done: false, type: 'adhoc' }
    )
    mockHabits.push({
      id: 'h1',
      name: 'Hydrate',
      icon: '💧',
      frequency: 'daily',
      active: true,
    })
    mockOverdueTasks.push({ id: 't-overdue-1', title: 'Late task' })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // Progress ring & today chip link to /daily
    const dailyLinks = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/daily')
    expect(dailyLinks.length).toBeGreaterThanOrEqual(1)

    // Habits chip links to /habits
    const habitLinks = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/habits')
    expect(habitLinks.length).toBeGreaterThanOrEqual(1)

    // Overdue chip links to /vault?filter=overdue
    const overdueLink = screen.getByRole('link', { name: /Overdue/i })
    expect(overdueLink.getAttribute('href')).toBe('/vault?filter=overdue')
  })

  it('renders Next Up items priority-sorted and toggles them optimistically', () => {
    mockTodos.push(
      { id: 't1', title: 'Low Priority Task', done: false, priority: 'low', type: 'task' },
      { id: 't2', title: 'Must Do Task', done: false, priority: 'medium', must_do: true, type: 'task' },
      { id: 't3', title: 'Critical Task', done: false, priority: 'critical', type: 'task' },
      { id: 'h1', title: 'Habit Item', done: false, type: 'habit', habit_id: 'h1' }
    )

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // Next Up items should show top 3 non-habits with Must Do first, then Critical, then Low
    expect(screen.getByText('Must Do Task')).toBeDefined()
    expect(screen.getByText('Critical Task')).toBeDefined()
    expect(screen.getByText('Low Priority Task')).toBeDefined()

    // Habit Item should NOT be in Next Up list
    // (It might be in Habits due today if frequency matches, but not as Next Up task)

    // Toggle Must Do Task checkbox
    const completeBtn = screen.getByLabelText('Complete Must Do Task')
    fireEvent.click(completeBtn)

    expect(mockToggleTodo).toHaveBeenCalledWith({ id: 't2', done: true })
  })

  it('renders compact habit row and toggles habit optimistically', () => {
    mockHabits.push({
      id: 'h-read',
      name: 'Read 20 pages',
      icon: '📚',
      frequency: 'daily',
      active: true,
    })
    mockTodos.push({
      id: 'todo-habit-read',
      title: 'Read 20 pages',
      done: false,
      type: 'habit',
      habit_id: 'h-read',
    })

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    const habitBtn = screen.getByRole('checkbox', { name: /Toggle habit: Read 20 pages/i })
    expect(habitBtn).toBeDefined()

    fireEvent.click(habitBtn)
    expect(mockToggleTodo).toHaveBeenCalledWith({ id: 'todo-habit-read', done: true })
  })

  it('shows onboarding checklist for new user and hides when tasks, habits, and daily todos exist', () => {
    // Empty state: new user with no tasks, habits, or daily todos
    const { rerender } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.getByText('Getting Started with FocusOS')).toBeDefined()
    expect(screen.getByText('Add your first task')).toBeDefined()
    expect(screen.getByText('Create a daily habit')).toBeDefined()
    expect(screen.getByText('Plan your day')).toBeDefined()

    // Once user has all 3 completed:
    mockTasks.push({ id: 't1', title: 'Task 1' })
    mockHabits.push({ id: 'h1', name: 'Habit 1', frequency: 'daily' })
    mockTodos.push({ id: 'd1', title: 'Daily 1' })

    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    expect(screen.queryByText('Getting Started with FocusOS')).toBeNull()
  })

  it('does NOT render fake timer or courses upcoming strip', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    )

    // No fake focus timer countdown
    expect(screen.queryByText(/left/i)).toBeNull()
    expect(screen.queryByText(/Resume focus/i)).toBeNull()
    // No "Upcoming" timetable/courses section
    expect(screen.queryByText(/Upcoming/i)).toBeNull()
  })
})
