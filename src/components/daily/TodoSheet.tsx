import { useState, useEffect } from 'react'
import { Star, ArrowRight, Trash2 } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import { useUpdateTask } from '../../hooks/useTasks'
import { useToggleMustDo, useMoveTodoDate, useDeleteDailyTodo } from '../../hooks/useDailyTodos'
import { todayLocal, addDaysLocal } from '../../lib/dates'
import { showUndo } from '../../lib/undo'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../lib/constants'
import type { DailyTodoWithTask, Priority, Category } from '../../types'

interface TodoSheetProps {
  isOpen: boolean
  onClose: () => void
  todo: DailyTodoWithTask | null
}

export function TodoSheet({ isOpen, onClose, todo }: TodoSheetProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [category, setCategory] = useState<Category>('personal')
  const [description, setDescription] = useState('')

  const updateTask = useUpdateTask()
  const toggleMustDo = useToggleMustDo()
  const moveTodoDate = useMoveTodoDate()
  const deleteTodo = useDeleteDailyTodo()

  useEffect(() => {
    if (todo) {
      setTitle(todo.title)
      setPriority((todo.priority as Priority) || 'medium')
      setCategory((todo.category as Category) || 'personal')
      setDescription(todo.tasks?.description || '')
    }
  }, [todo])

  if (!todo) return null

  const handleSave = () => {
    if (todo.task_id) {
      updateTask.mutate({
        id: todo.task_id,
        title,
        priority,
        category,
        description: description || null,
      })
    }
    onClose()
  }

  const handleMoveTomorrow = () => {
    const tomorrow = addDaysLocal(todayLocal(), 1)
    moveTodoDate.mutate({
      todoId: todo.id,
      taskId: todo.task_id,
      newDate: tomorrow,
    })
    onClose()
  }

  const handleDelete = () => {
    onClose()
    showUndo({
      message: `Deleted "${todo.title}"`,
      onUndo: () => {},
      onCommit: () => {
        deleteTodo.mutate(todo.id)
      },
    })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label="Delete task"
          >
            <Trash2 size={16} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Priority & Category Pickers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
            >
              {Object.keys(PRIORITY_CONFIG).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
            >
              {Object.keys(CATEGORY_CONFIG).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any extra context or instructions..."
            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => toggleMustDo.mutate({ id: todo.id, must_do: !todo.must_do })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              todo.must_do
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-700 dark:text-amber-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            <Star size={13} fill={todo.must_do ? 'currentColor' : 'none'} />
            <span>{todo.must_do ? 'Must-Do (Starred)' : 'Mark Must-Do'}</span>
          </button>

          <button
            type="button"
            onClick={handleMoveTomorrow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowRight size={13} />
            <span>Move to Tomorrow</span>
          </button>
        </div>

        {/* Metadata info */}
        <div className="pt-2 text-[11px] text-gray-400 space-y-1">
          {todo.carry_over && (
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              Carried over from yesterday {todo.carry_count > 1 ? `(${todo.carry_count}×)` : ''}
            </p>
          )}
          {todo.tasks?.due_time && (
            <p>Due time: {todo.tasks.due_time.slice(0, 5)}</p>
          )}
          {todo.tasks?.estimate_min && (
            <p>Estimate: {todo.tasks.estimate_min} minutes</p>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
