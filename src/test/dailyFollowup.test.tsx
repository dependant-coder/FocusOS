import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanDaySheet } from '../components/daily/PlanDaySheet'
import DailyTodoCard from '../components/daily/DailyTodoCard'
import type { DailyTodoWithTask } from '../types'
import { showUndo } from '../lib/undo'

const mockSetQueryData = vi.fn()
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: mockSetQueryData,
    invalidateQueries: vi.fn(),
  }),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
  }),
}))

vi.mock('../lib/undo', () => ({
  showUndo: vi.fn(),
}))

const mockDeleteMutate = vi.fn()
const mockMoveMutate = vi.fn()
const mockToggleMustDoMutate = vi.fn()

vi.mock('../hooks/useDailyTodos', () => ({
  useToggleMustDo: () => ({ mutate: mockToggleMustDoMutate }),
  useMoveTodoDate: () => ({ mutate: mockMoveMutate }),
  useDeleteDailyTodo: () => ({ mutate: mockDeleteMutate }),
}))

describe('Phase 3 Batch 2 Follow-up: B, C, D requirements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const taskTodo: DailyTodoWithTask = {
    id: 'todo-task-1',
    user_id: 'test-user-123',
    title: 'Chemistry Lab',
    done: false,
    date: '2026-10-31',
    type: 'due_today',
    category: 'college',
    priority: 'high',
    must_do: false,
    carry_over: false,
    carry_count: 0,
    task_id: 'task-456',
    habit_id: null,
    created_at: null,
    tasks: { description: 'Experiment 4', resources_url: null, due_time: '14:00:00', estimate_min: 45 },
  }

  const habitTodo: DailyTodoWithTask = {
    id: 'todo-habit-1',
    user_id: 'test-user-123',
    title: 'Morning Run',
    done: false,
    date: '2026-10-31',
    type: 'habit',
    category: 'personal',
    priority: 'medium',
    must_do: false,
    carry_over: false,
    carry_count: 0,
    task_id: null,
    habit_id: 'habit-789',
    created_at: null,
    tasks: null,
  }

  it('excludes habits from PlanDaySheet (Requirement D)', () => {
    render(<PlanDaySheet isOpen={true} onClose={vi.fn()} todos={[taskTodo, habitTodo]} />)

    expect(screen.getByText('Chemistry Lab')).toBeDefined()
    // Habit should NOT be rendered in PlanDaySheet
    expect(screen.queryByText('Morning Run')).toBeNull()
  })

  it('optimistically removes item on Drop and restores on Undo (Requirement B)', () => {
    render(<PlanDaySheet isOpen={true} onClose={vi.fn()} todos={[taskTodo]} />)

    const dropBtn = screen.getByLabelText(/Drop "Chemistry Lab" from today/)
    fireEvent.click(dropBtn)

    // Verify optimistic removal was dispatched
    expect(mockSetQueryData).toHaveBeenCalledTimes(1)
    const updater = mockSetQueryData.mock.calls[0][1]
    const filtered = updater([taskTodo])
    expect(filtered).toHaveLength(0)

    // Verify showUndo was called with restore logic and multi-key commit
    expect(showUndo).toHaveBeenCalledTimes(1)
    const options = vi.mocked(showUndo).mock.calls[0][0]
    expect(options.message).toContain('Chemistry Lab')

    // Test Undo restores item
    mockSetQueryData.mockClear()
    options.onUndo()
    expect(mockSetQueryData).toHaveBeenCalledTimes(1)
    const restoreUpdater = mockSetQueryData.mock.calls[0][1]
    const restored = restoreUpdater([])
    expect(restored).toEqual([taskTodo])

    // Test onCommit passes multi-key parameters including taskId
    options.onCommit()
    expect(mockDeleteMutate).toHaveBeenCalledWith({
      id: 'todo-task-1',
      taskId: 'task-456',
      title: 'Chemistry Lab',
      habitId: null,
    })
  })

  it('shows only Complete and Star Must-Do for habit in DailyTodoCard (Requirement D)', () => {
    render(
      <DailyTodoCard
        todo={habitTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onTap={vi.fn()}
        onMoveTomorrow={vi.fn()}
        onToggleMustDo={vi.fn()}
      />
    )

    // Open overflow menu
    const menuBtn = screen.getByLabelText(`Options for ${habitTodo.title}`)
    fireEvent.click(menuBtn)

    // Should show Complete and Star Must-Do
    expect(screen.getByText('Mark complete')).toBeDefined()
    expect(screen.getByText('Star Must-Do')).toBeDefined()

    // Should NOT show Edit, Move to Tomorrow, or Delete
    expect(screen.queryByText('Edit details')).toBeNull()
    expect(screen.queryByText('Move to Tomorrow')).toBeNull()
    expect(screen.queryByText('Delete')).toBeNull()
  })

  it('shows all actions (Edit, Move, Delete) for non-habit task in DailyTodoCard', () => {
    render(
      <DailyTodoCard
        todo={taskTodo}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onTap={vi.fn()}
        onMoveTomorrow={vi.fn()}
        onToggleMustDo={vi.fn()}
      />
    )

    // Open overflow menu
    const menuBtn = screen.getByLabelText(`Options for ${taskTodo.title}`)
    fireEvent.click(menuBtn)

    expect(screen.getByText('Mark complete')).toBeDefined()
    expect(screen.getByText('Star Must-Do')).toBeDefined()
    expect(screen.getByText('Edit details')).toBeDefined()
    expect(screen.getByText('Move to Tomorrow')).toBeDefined()
    expect(screen.getByText('Delete')).toBeDefined()
  })
})
