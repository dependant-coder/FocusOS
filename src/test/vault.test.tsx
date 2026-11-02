import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Vault from '../pages/Vault'
import TaskCard from '../components/tasks/TaskCard'
import type { Task } from '../types'
import { todayLocal, addDaysLocal } from '../lib/dates'

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-vault', email: 'vault@example.com' },
  }),
}))

// Mock showUndo
const mockShowUndo = vi.fn()
vi.mock('../lib/undo', () => ({
  showUndo: (opts: unknown) => mockShowUndo(opts),
}))

const mockCreateTaskMutate = vi.fn()
const mockUpdateTaskMutate = vi.fn()
const mockDeleteTaskMutate = vi.fn()
const mockPinTaskMutate = vi.fn()
const mockToggleCompleteMutate = vi.fn()
const mockBulkCompleteMutate = vi.fn()
const mockBulkPinMutate = vi.fn()
const mockBulkSetPriorityMutate = vi.fn()
const mockBulkDeleteMutate = vi.fn()

const mockTasks: Task[] = []

vi.mock('../hooks/useTasks', () => ({
  useTasks: () => ({
    data: mockTasks,
    isLoading: false,
  }),
  useCreateTask: () => ({ mutate: mockCreateTaskMutate, isPending: false }),
  useUpdateTask: () => ({ mutate: mockUpdateTaskMutate, isPending: false }),
  useDeleteTask: () => ({ mutate: mockDeleteTaskMutate, isPending: false }),
  usePinTask: () => ({ mutate: mockPinTaskMutate, isPending: false }),
  useToggleTaskComplete: () => ({ mutate: mockToggleCompleteMutate, isPending: false }),
  useBulkCompleteTasks: () => ({ mutate: mockBulkCompleteMutate, isPending: false }),
  useBulkPinTasks: () => ({ mutate: mockBulkPinMutate, isPending: false }),
  useBulkSetPriority: () => ({ mutate: mockBulkSetPriorityMutate, isPending: false }),
  useBulkDeleteTasks: () => ({ mutate: mockBulkDeleteMutate, isPending: false }),
}))

// Mock QueryClient
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueriesData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({ data: mockTasks, isLoading: false }),
  useMutation: () => ({ mutate: vi.fn() }),
}))

describe('Phase 3 Batch 4: Vault (/vault Tasks) P3-5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTasks.length = 0
    localStorage.clear()
  })

  it('reads ?filter=overdue from the URL and filters overdue tasks', () => {
    const today = todayLocal()
    mockTasks.push(
      {
        id: 'task-1',
        user_id: 'test-user-vault',
        title: 'Overdue assignment',
        priority: 'high',
        category: 'college',
        status: 'not_started',
        due_date: addDaysLocal(today, -2),
        due_time: '14:00:00',
        estimate_min: 45,
        is_overdue: true,
        pin_to_today: false,
        auto_escalate: false,
        description: null,
        resources_url: null,
        energy_level: 'deep_work',
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      },
      {
        id: 'task-2',
        user_id: 'test-user-vault',
        title: 'Normal today task',
        priority: 'medium',
        category: 'personal',
        status: 'not_started',
        due_date: today,
        due_time: null,
        estimate_min: 30,
        is_overdue: false,
        pin_to_today: false,
        auto_escalate: false,
        description: null,
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      }
    )

    render(
      <MemoryRouter initialEntries={['/vault?filter=overdue']}>
        <Vault />
      </MemoryRouter>
    )

    expect(screen.getByText('Overdue assignment')).toBeDefined()
    expect(screen.queryByText('Normal today task')).toBeNull()
  })

  it('reads ?filter=pinned from the URL and filters pinned tasks', () => {
    mockTasks.push(
      {
        id: 'task-1',
        user_id: 'test-user-vault',
        title: 'Pinned task',
        priority: 'high',
        category: 'college',
        status: 'not_started',
        due_date: null,
        due_time: null,
        estimate_min: null,
        is_overdue: false,
        pin_to_today: true,
        auto_escalate: false,
        description: null,
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      },
      {
        id: 'task-2',
        user_id: 'test-user-vault',
        title: 'Unpinned task',
        priority: 'low',
        category: 'personal',
        status: 'not_started',
        due_date: null,
        due_time: null,
        estimate_min: null,
        is_overdue: false,
        pin_to_today: false,
        auto_escalate: false,
        description: null,
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      }
    )

    render(
      <MemoryRouter initialEntries={['/vault?filter=pinned']}>
        <Vault />
      </MemoryRouter>
    )

    expect(screen.getByText('Pinned task')).toBeDefined()
    expect(screen.queryByText('Unpinned task')).toBeNull()
  })

  it('renders due time, estimate chip, left checkbox, and + Today button on TaskCard', () => {
    const task: Task = {
      id: 'task-card-test',
      user_id: 'test-user-vault',
      title: 'Prepare presentation',
      priority: 'critical',
      category: 'college',
      status: 'not_started',
      due_date: todayLocal(),
      due_time: '16:30:00',
      estimate_min: 45,
      is_overdue: false,
      pin_to_today: false,
      auto_escalate: false,
      description: 'Slide deck for project',
      resources_url: null,
      energy_level: 'deep_work',
      created_at: '2026-04-01T10:00:00Z',
      updated_at: '2026-04-01T10:00:00Z',
      completed_at: null,
    }

    const mockPin = vi.fn()
    const mockTap = vi.fn()
    const mockToggleComplete = vi.fn()

    render(
      <TaskCard
        task={task}
        onPin={mockPin}
        onTap={mockTap}
        onToggleComplete={mockToggleComplete}
      />
    )

    // Check title & description
    expect(screen.getByText('Prepare presentation')).toBeDefined()
    expect(screen.getByText('Slide deck for project')).toBeDefined()

    // Check due time in DateChip
    expect(screen.getByText(/16:30/)).toBeDefined()

    // Check estimate chip
    expect(screen.getByText('45m')).toBeDefined()

    // Check Deep work tag
    expect(screen.getByText(/Deep work/i)).toBeDefined()

    // Check + Today button (replaces unlabeled toggle switch)
    const pinBtn = screen.getByRole('button', { name: /Add "Prepare presentation" to today/i })
    expect(pinBtn).toBeDefined()
    fireEvent.click(pinBtn)
    expect(mockPin).toHaveBeenCalledWith('task-card-test', true)

    // Check left completion checkbox
    const completeBtn = screen.getByRole('checkbox', { name: /Mark "Prepare presentation" complete/i })
    expect(completeBtn).toBeDefined()
    fireEvent.click(completeBtn)
    expect(mockToggleComplete).toHaveBeenCalledWith(task)
  })

  it('shows Overdue badge when task.is_overdue is true and not done', () => {
    const task: Task = {
      id: 'overdue-task',
      user_id: 'test-user-vault',
      title: 'Lab Report',
      priority: 'high',
      category: 'college',
      status: 'not_started',
      due_date: '2026-04-10',
      due_time: null,
      estimate_min: null,
      is_overdue: true,
      pin_to_today: false,
      auto_escalate: false,
      description: null,
      resources_url: null,
      energy_level: null,
      created_at: '2026-04-01T10:00:00Z',
      updated_at: '2026-04-01T10:00:00Z',
      completed_at: null,
    }

    render(
      <TaskCard
        task={task}
        onPin={vi.fn()}
        onTap={vi.fn()}
      />
    )

    expect(screen.getByText('Overdue')).toBeDefined()
  })

  it('filters by status: Active hides done tasks, Done shows only done tasks', () => {
    mockTasks.push(
      {
        id: 'active-1',
        user_id: 'test-user-vault',
        title: 'Active Task',
        priority: 'medium',
        category: 'personal',
        status: 'not_started',
        due_date: null,
        due_time: null,
        estimate_min: null,
        is_overdue: false,
        pin_to_today: false,
        auto_escalate: false,
        description: null,
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      },
      {
        id: 'done-1',
        user_id: 'test-user-vault',
        title: 'Completed Task',
        priority: 'low',
        category: 'personal',
        status: 'done',
        due_date: null,
        due_time: null,
        estimate_min: null,
        is_overdue: false,
        pin_to_today: false,
        auto_escalate: false,
        description: null,
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: '2026-04-12T10:00:00Z',
      }
    )

    render(
      <MemoryRouter initialEntries={['/vault']}>
        <Vault />
      </MemoryRouter>
    )

    // Default status is Active: only Active Task is shown
    expect(screen.getByText('Active Task')).toBeDefined()
    expect(screen.queryByText('Completed Task')).toBeNull()

    // Switch to 'done'
    const doneTab = screen.getByRole('button', { name: 'Status: done' })
    fireEvent.click(doneTab)

    expect(screen.queryByText('Active Task')).toBeNull()
    expect(screen.getByText('Completed Task')).toBeDefined()

    // Switch to 'all'
    const allTab = screen.getByRole('button', { name: 'Status: all' })
    fireEvent.click(allTab)

    expect(screen.getByText('Active Task')).toBeDefined()
    expect(screen.getByText('Completed Task')).toBeDefined()
  })

  it('filters by search input query matching title or description', () => {
    mockTasks.push(
      {
        id: 'search-1',
        user_id: 'test-user-vault',
        title: 'Physics Homework',
        priority: 'high',
        category: 'college',
        status: 'not_started',
        due_date: null,
        due_time: null,
        estimate_min: null,
        is_overdue: false,
        pin_to_today: false,
        auto_escalate: false,
        description: 'Chapter 4 problems',
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      },
      {
        id: 'search-2',
        user_id: 'test-user-vault',
        title: 'Grocery shopping',
        priority: 'low',
        category: 'personal',
        status: 'not_started',
        due_date: null,
        due_time: null,
        estimate_min: null,
        is_overdue: false,
        pin_to_today: false,
        auto_escalate: false,
        description: 'Buy milk and eggs',
        resources_url: null,
        energy_level: null,
        created_at: '2026-04-01T10:00:00Z',
        updated_at: '2026-04-01T10:00:00Z',
        completed_at: null,
      }
    )

    render(
      <MemoryRouter initialEntries={['/vault']}>
        <Vault />
      </MemoryRouter>
    )

    const searchInput = screen.getByPlaceholderText(/Search tasks by title/i)
    fireEvent.change(searchInput, { target: { value: 'physics' } })

    expect(screen.getByText('Physics Homework')).toBeDefined()
    expect(screen.queryByText('Grocery shopping')).toBeNull()

    // Search by description text
    fireEvent.change(searchInput, { target: { value: 'milk' } })
    expect(screen.queryByText('Physics Homework')).toBeNull()
    expect(screen.getByText('Grocery shopping')).toBeDefined()
  })

  it('deleting a task uses showUndo without window.confirm', () => {
    const task: Task = {
      id: 'task-to-delete',
      user_id: 'test-user-vault',
      title: 'Task to be removed',
      priority: 'low',
      category: 'personal',
      status: 'not_started',
      due_date: null,
      due_time: null,
      estimate_min: null,
      is_overdue: false,
      pin_to_today: false,
      auto_escalate: false,
      description: null,
      resources_url: null,
      energy_level: null,
      created_at: '2026-04-01T10:00:00Z',
      updated_at: '2026-04-01T10:00:00Z',
      completed_at: null,
    }
    mockTasks.push(task)

    const confirmSpy = vi.spyOn(window, 'confirm')

    render(
      <MemoryRouter initialEntries={['/vault']}>
        <Vault />
      </MemoryRouter>
    )

    // Tap card to open edit sheet
    const card = screen.getByText('Task to be removed')
    fireEvent.click(card)

    // Find and click Delete Task
    const deleteBtn = screen.getByRole('button', { name: /Delete Task/i })
    fireEvent.click(deleteBtn)

    // Verify window.confirm was NOT called
    expect(confirmSpy).not.toHaveBeenCalled()

    // Verify showUndo was called
    expect(mockShowUndo).toHaveBeenCalled()
    const undoArg = mockShowUndo.mock.calls[0][0]
    expect(undoArg.message).toContain('Deleted "Task to be removed"')

    confirmSpy.mockRestore()
  })
})
