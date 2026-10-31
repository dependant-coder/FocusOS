import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanDaySheet } from '../components/daily/PlanDaySheet'
import type { DailyTodoWithTask } from '../types'

// Mock dependencies
vi.mock('../lib/undo', () => ({
  showUndo: vi.fn(),
}))

vi.mock('../hooks/useDailyTodos', () => ({
  useToggleMustDo: () => ({
    mutate: vi.fn(),
  }),
  useMoveTodoDate: () => ({
    mutate: vi.fn(),
  }),
  useDeleteDailyTodo: () => ({
    mutate: vi.fn(),
  }),
}))

describe('PlanDaySheet component', () => {
  const mockTodos: DailyTodoWithTask[] = [
    {
      id: 'todo-1',
      user_id: 'user-1',
      title: 'Finish lab assignment',
      done: false,
      date: '2026-10-31',
      type: 'due_today',
      category: 'college',
      priority: 'high',
      must_do: true,
      carry_over: false,
      carry_count: 0,
      task_id: 'task-1',
      habit_id: null,
      created_at: null,
      tasks: { description: null, resources_url: null, due_time: null, estimate_min: 60 },
    },
    {
      id: 'todo-2',
      user_id: 'user-1',
      title: 'Read paper',
      done: false,
      date: '2026-10-31',
      type: 'adhoc',
      category: 'personal',
      priority: 'medium',
      must_do: false,
      carry_over: true,
      carry_count: 1,
      task_id: null,
      habit_id: null,
      created_at: null,
      tasks: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders uncompleted tasks with carry over badges and must do stars', () => {
    render(<PlanDaySheet isOpen={true} onClose={vi.fn()} todos={mockTodos} />)

    expect(screen.getByText('Plan Your Day')).toBeDefined()
    expect(screen.getByText('Finish lab assignment')).toBeDefined()
    expect(screen.getByText('Read paper')).toBeDefined()
    expect(screen.getByText(/Carried over/)).toBeDefined()
    expect(screen.getByText('1/3')).toBeDefined()
  })

  it('calls onClose when Done Planning button is clicked', () => {
    const onClose = vi.fn()
    render(<PlanDaySheet isOpen={true} onClose={onClose} todos={mockTodos} />)

    const doneBtn = screen.getByText('Done Planning')
    fireEvent.click(doneBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
