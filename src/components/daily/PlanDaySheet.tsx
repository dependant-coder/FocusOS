import { useState } from 'react'
import {
  Star,
  Calendar,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import { todayLocal, addDaysLocal, formatShortDate } from '../../lib/dates'
import { useToggleMustDo, useMoveTodoDate, useDeleteDailyTodo } from '../../hooks/useDailyTodos'
import { showUndo } from '../../lib/undo'
import toast from 'react-hot-toast'
import type { DailyTodoWithTask } from '../../types'

interface PlanDaySheetProps {
  isOpen: boolean
  onClose: () => void
  todos: DailyTodoWithTask[]
}

export function PlanDaySheet({ isOpen, onClose, todos }: PlanDaySheetProps) {
  const [customDateTodoId, setCustomDateTodoId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(addDaysLocal(todayLocal(), 2))

  const toggleMustDo = useToggleMustDo()
  const moveTodoDate = useMoveTodoDate()
  const deleteTodo = useDeleteDailyTodo()

  // Items to plan: uncompleted todos (especially carried over and priorities)
  const uncompletedTodos = todos.filter((t) => !t.done)
  const mustDoCount = uncompletedTodos.filter((t) => t.must_do).length

  const handleToggleMustDo = (todo: DailyTodoWithTask) => {
    if (!todo.must_do && mustDoCount >= 3) {
      toast.error('You can only select up to 3 Must-Do tasks for today')
      return
    }
    toggleMustDo.mutate({ id: todo.id, must_do: !todo.must_do })
  }

  const handleMoveTomorrow = (todo: DailyTodoWithTask) => {
    const tomorrow = addDaysLocal(todayLocal(), 1)
    moveTodoDate.mutate(
      {
        todoId: todo.id,
        taskId: todo.task_id,
        newDate: tomorrow,
      },
      {
        onSuccess: () => {
          toast.success(`Moved "${todo.title}" to tomorrow`)
        },
      }
    )
  }

  const handleCustomDateSubmit = (todo: DailyTodoWithTask) => {
    if (!selectedDate) return
    moveTodoDate.mutate(
      {
        todoId: todo.id,
        taskId: todo.task_id,
        newDate: selectedDate,
      },
      {
        onSuccess: () => {
          toast.success(`Rescheduled "${todo.title}" for ${formatShortDate(selectedDate)}`)
          setCustomDateTodoId(null)
        },
      }
    )
  }

  const handleDrop = (todo: DailyTodoWithTask) => {
    showUndo({
      message: `Dropped "${todo.title}" from today`,
      onUndo: () => {
        // Undo: keep item on today by doing nothing (since deletion was delayed)
      },
      onCommit: () => {
        deleteTodo.mutate(todo.id)
      },
      ms: 5000,
    })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Plan Your Day"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-amber-500">{mustDoCount}/3</span> Must-Dos chosen
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Done Planning
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Choose up to <strong>3 Must-Do</strong> tasks to star for high focus today. Move any
            non-critical tasks to tomorrow or drop them.
          </p>
        </div>

        {uncompletedTodos.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
            No tasks to plan right now! Add some tasks to get started.
          </div>
        ) : (
          <div className="space-y-2.5">
            {uncompletedTodos.map((todo) => {
              const isMustDo = Boolean(todo.must_do)
              const isCustomDateOpen = customDateTodoId === todo.id

              return (
                <div
                  key={todo.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isMustDo
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs'
                      : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5 mb-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleMustDo(todo)}
                        aria-label={isMustDo ? `Remove "${todo.title}" from must do` : `Star "${todo.title}" as must do`}
                        className={`p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                          isMustDo
                            ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/40'
                            : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'
                        }`}
                      >
                        <Star size={16} fill={isMustDo ? 'currentColor' : 'none'} />
                      </button>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium leading-snug truncate ${
                            isMustDo
                              ? 'text-gray-900 dark:text-white font-semibold'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {todo.title}
                        </p>
                        {todo.carry_over && (
                          <span className="inline-block mt-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Carried over {todo.carry_count > 1 ? `${todo.carry_count}×` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this task */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/60 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveTomorrow(todo)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ArrowRight size={12} />
                        <span>Tomorrow</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCustomDateTodoId(isCustomDateOpen ? null : todo.id)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Calendar size={12} />
                        <span>Pick date</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDrop(todo)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      aria-label={`Drop "${todo.title}" from today`}
                      title="Drop from today"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Pick date popover inline */}
                  {isCustomDateOpen && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                      <input
                        type="date"
                        value={selectedDate}
                        min={addDaysLocal(todayLocal(), 1)}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleCustomDateSubmit(todo)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Move
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
