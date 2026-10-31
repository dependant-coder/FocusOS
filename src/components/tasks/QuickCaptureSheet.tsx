import { useState, useEffect, useRef } from 'react'
import {
  Calendar,
  Clock,
  Timer,
  ChevronDown,
  Sparkles,
  Check,
  X,
  Plus,
} from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import TaskForm, { type TaskFormData } from './TaskForm'
import { parseQuickAdd, type QuickAddParsed } from '../../lib/quickAdd'
import { useCreateTask } from '../../hooks/useTasks'
import { useCreateAdhocTodo } from '../../hooks/useDailyTodos'
import { PRIORITY_CONFIG } from '../../lib/constants'
import { getDateLabel } from '../../lib/dates'
import type { Priority, Category } from '../../types'

interface QuickCaptureSheetProps {
  isOpen: boolean
  onClose: () => void
  initialText?: string
}

export default function QuickCaptureSheet({
  isOpen,
  onClose,
  initialText = '',
}: QuickCaptureSheetProps) {
  const [text, setText] = useState(initialText)
  const [showFullForm, setShowFullForm] = useState(false)
  const [lastSavedTitle, setLastSavedTitle] = useState<string | null>(null)
  const [saveCount, setSaveCount] = useState(0)

  // Overrides if user clicks 'x' on parsed chips
  const [priorityOverride, setPriorityOverride] = useState<Priority | null | undefined>(undefined)
  const [categoryOverride, setCategoryOverride] = useState<Category | null | undefined>(undefined)
  const [dueDateOverride, setDueDateOverride] = useState<string | null | undefined>(undefined)
  const [dueTimeOverride, setDueTimeOverride] = useState<string | null | undefined>(undefined)
  const [estimateOverride, setEstimateOverride] = useState<number | null | undefined>(undefined)

  const inputRef = useRef<HTMLInputElement>(null)
  const createTask = useCreateTask()
  const createAdhocTodo = useCreateAdhocTodo()

  // Update text when initialText prop changes (e.g. from share target)
  useEffect(() => {
    if (initialText) {
      setText(initialText)
    }
  }, [initialText])

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setShowFullForm(false)
      setLastSavedTitle(null)
      setSaveCount(0)
      resetOverrides()
      setTimeout(() => {
        inputRef.current?.focus()
      }, 80)
    }
  }, [isOpen])

  function resetOverrides() {
    setPriorityOverride(undefined)
    setCategoryOverride(undefined)
    setDueDateOverride(undefined)
    setDueTimeOverride(undefined)
    setEstimateOverride(undefined)
  }

  // Parse text live
  const parsed: QuickAddParsed = parseQuickAdd(text)

  const activePriority = priorityOverride !== undefined ? (priorityOverride ?? undefined) : parsed.priority
  const activeCategory = categoryOverride !== undefined ? (categoryOverride ?? undefined) : parsed.category
  const activeDueDate = dueDateOverride !== undefined ? (dueDateOverride ?? undefined) : parsed.dueDate
  const activeDueTime = dueTimeOverride !== undefined ? (dueTimeOverride ?? undefined) : parsed.dueTime
  const activeEstimate = estimateOverride !== undefined ? (estimateOverride ?? undefined) : parsed.estimateMin

  const titleToSave = parsed.title.trim()

  const hasTokens =
    Boolean(activePriority) ||
    Boolean(activeCategory) ||
    Boolean(parsed.courseId) ||
    Boolean(activeDueDate) ||
    Boolean(activeDueTime) ||
    Boolean(activeEstimate)

  const handleSave = (target: 'today' | 'tasks') => {
    if (!titleToSave) return

    const pinToToday = target === 'today'

    // If it's a simple ad-hoc task with no structured attributes for Today:
    if (target === 'today' && !hasTokens) {
      createAdhocTodo.mutate(titleToSave, {
        onSuccess: () => {
          setLastSavedTitle(titleToSave)
          setSaveCount((c) => c + 1)
          setText('')
          resetOverrides()
          inputRef.current?.focus()
        },
      })
      return
    }

    // Otherwise create structured task
    createTask.mutate(
      {
        title: titleToSave,
        priority: activePriority || 'medium',
        category: activeCategory || 'personal',
        due_date: activeDueDate || null,
        description: parsed.courseId ? `Course: #${parsed.courseId}` : null,
        resources_url: null,
        energy_level: activeEstimate && activeEstimate >= 45 ? 'deep_work' : activeEstimate ? 'quick_task' : null,
        pin_to_today: pinToToday,
      },
      {
        onSuccess: () => {
          setLastSavedTitle(titleToSave)
          setSaveCount((c) => c + 1)
          setText('')
          resetOverrides()
          inputRef.current?.focus()
        },
      }
    )
  }

  const handleFullFormSubmit = (data: TaskFormData) => {
    createTask.mutate(
      {
        title: data.title,
        priority: data.priority,
        category: data.category,
        due_date: data.due_date || null,
        description: data.description || null,
        resources_url: data.resources_url || null,
        energy_level: data.energy_level || null,
        pin_to_today: data.pin_to_today,
      },
      {
        onSuccess: () => {
          setLastSavedTitle(data.title)
          setSaveCount((c) => c + 1)
          setText('')
          setShowFullForm(false)
          resetOverrides()
          inputRef.current?.focus()
        },
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.metaKey || e.ctrlKey || !parsed.toToday) {
        handleSave('tasks')
      } else {
        handleSave('today')
      }
    }
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={showFullForm ? 'Detailed Task Options' : 'Quick Capture'}
    >
      <div className="space-y-4">
        {/* Subtle persistent saved banner (P3-2: stays open after submit) */}
        {lastSavedTitle && (
          <div
            role="status"
            className="flex items-center justify-between py-2 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="flex items-center gap-2 truncate">
              <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span className="truncate">
                Saved &quot;{lastSavedTitle}&quot; ({saveCount} added)
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0">
              Add another below
            </span>
          </div>
        )}

        {!showFullForm ? (
          <>
            {/* Single fast input field */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Finish chemistry essay !high #college tomorrow 45m"
                className="w-full text-base sm:text-sm px-4 py-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-xs"
                autoComplete="off"
                aria-label="Task title and smart tokens"
              />
            </div>

            {/* Smart Parsed Preview Chips */}
            {hasTokens && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-500" />
                  Parsed:
                </span>

                {/* Priority Chip */}
                {activePriority && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: PRIORITY_CONFIG[activePriority as Priority].color }}
                    />
                    <span className="capitalize">{activePriority}</span>
                    <button
                      type="button"
                      onClick={() => setPriorityOverride(null)}
                      className="p-0.5 hover:text-red-500 transition-colors ml-0.5"
                      aria-label="Remove priority"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Category Chip */}
                {activeCategory && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50"
                  >
                    <span>#{activeCategory}</span>
                    <button
                      type="button"
                      onClick={() => setCategoryOverride(null)}
                      className="p-0.5 hover:text-red-500 transition-colors ml-0.5"
                      aria-label="Remove category"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Course Chip */}
                {parsed.courseId && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50"
                  >
                    <span>#{parsed.courseId}</span>
                  </span>
                )}

                {/* Due Date Chip */}
                {activeDueDate && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50"
                  >
                    <Calendar size={12} className="text-amber-600 dark:text-amber-400" />
                    <span>{getDateLabel(activeDueDate) || activeDueDate}</span>
                    <button
                      type="button"
                      onClick={() => setDueDateOverride(null)}
                      className="p-0.5 hover:text-red-500 transition-colors ml-0.5"
                      aria-label="Remove due date"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Due Time Chip */}
                {activeDueTime && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  >
                    <Clock size={12} className="text-gray-500" />
                    <span>{activeDueTime.slice(0, 5)}</span>
                    <button
                      type="button"
                      onClick={() => setDueTimeOverride(null)}
                      className="p-0.5 hover:text-red-500 transition-colors ml-0.5"
                      aria-label="Remove time"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {/* Estimate Chip */}
                {activeEstimate && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50"
                  >
                    <Timer size={12} className="text-purple-500" />
                    <span>{activeEstimate >= 60 ? `${Math.floor(activeEstimate / 60)}h ${activeEstimate % 60 ? `${activeEstimate % 60}m` : ''}` : `${activeEstimate}m`}</span>
                    <button
                      type="button"
                      onClick={() => setEstimateOverride(null)}
                      className="p-0.5 hover:text-red-500 transition-colors ml-0.5"
                      aria-label="Remove estimate"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Quick helper shortcuts guide */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 px-1">
              <span>Tokens:</span>
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">!crit</code>
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">#college</code>
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">tomorrow</code>
              <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">45m</code>
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowFullForm(true)}
                className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>More options</span>
                <ChevronDown size={14} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave('tasks')}
                  disabled={!titleToSave || createTask.isPending}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  Add to Tasks
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('today')}
                  disabled={!titleToSave || createTask.isPending || createAdhocTodo.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add to Today</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Full TaskForm View */
          <div>
            <TaskForm
              initialData={{
                title: titleToSave,
                priority: activePriority || 'medium',
                category: activeCategory || 'personal',
                due_date: activeDueDate || undefined,
                pin_to_today: parsed.toToday,
              }}
              onSubmit={handleFullFormSubmit}
              onCancel={() => setShowFullForm(false)}
              isSubmitting={createTask.isPending}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
