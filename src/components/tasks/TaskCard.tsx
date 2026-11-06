import { useSafeNavigate } from '../../lib/safeNavigate'
import type { Task, Priority, Category, TaskStatus } from '../../types'
import PriorityBadge from './PriorityBadge'
import CategoryBadge from './CategoryBadge'
import StatusBadge from './StatusBadge'
import DateChip from './DateChip'
import { OverdueBadge } from './OverdueBadge'
import { Check, Pin, Plus, Clock, BrainCircuit, Zap, Play } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onPin: (id: string, pinned: boolean) => void
  onTap: (task: Task) => void
  onToggleComplete?: (task: Task) => void
  isPinning?: boolean
  isSelectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (taskId: string) => void
}

function formatEstimate(min: number | null | undefined): string | null {
  if (!min || min <= 0) return null
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const remainder = min % 60
  return remainder > 0 ? `${h}h ${remainder}m` : `${h}h`
}

export default function TaskCard({
  task,
  onPin,
  onTap,
  onToggleComplete,
  isPinning,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: TaskCardProps) {
  const navigate = useSafeNavigate()
  const priority = task.priority as Priority
  const isDone = task.status === 'done'
  const estimateText = formatEstimate(task.estimate_min)

  const handleCardClick = () => {
    if (isSelectionMode) {
      onToggleSelect?.(task.id)
    } else {
      onTap(task)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-selected={isSelectionMode ? isSelected : undefined}
      className={`
        group relative bg-white dark:bg-gray-900 rounded-xl border
        ${isSelected
          ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
          : 'border-gray-200/70 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700'
        }
        shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer
        active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950
      `}
    >
      <div className="p-4">
        {/* Main top row: Checkbox, Title, +Today/On Today chip button */}
        <div className="flex items-start gap-3">
          {/* Left Checkbox (Bulk select or Complete) */}
          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isSelectionMode ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`Select task "${task.title}"`}
                onClick={() => onToggleSelect?.(task.id)}
                className={`
                  w-5 h-5 rounded-md border flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-400'
                  }
                `}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </button>
            ) : (
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={isDone ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                onClick={() => onToggleComplete?.(task)}
                className={`
                  w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 bg-white dark:bg-gray-800'
                  }
                `}
              >
                {isDone && <Check size={12} strokeWidth={3} />}
              </button>
            )}
          </div>

          {/* Title & description */}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-[15px] leading-snug transition-colors ${
                isDone
                  ? 'text-gray-400 dark:text-gray-600 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* Actions: Focus & "+ Today" chip buttons */}
          {!isSelectionMode && (
            <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {!isDone && (
                <button
                  type="button"
                  onClick={() => navigate('/focus', { state: { taskId: task.id } })}
                  aria-label={`Start focus session for "${task.title}"`}
                  title="Start Focus"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/50 dark:border-indigo-800/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <Play size={10} className="fill-current" />
                  <span>Focus</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onPin(task.id, !task.pin_to_today)}
                disabled={isPinning}
                aria-label={task.pin_to_today ? `Remove "${task.title}" from today` : `Add "${task.title}" to today`}
                className={`
                  inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  ${task.pin_to_today
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-500/30 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }
                `}
              >
                {task.pin_to_today ? (
                  <>
                    <Pin size={11} className="rotate-45 fill-current" />
                    <span>On Today</span>
                  </>
                ) : (
                  <>
                    <Plus size={12} />
                    <span>+ Today</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Metadata row: Priority, Category, Status, Due date/time, Estimate, Overdue, Type */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2 border-t border-gray-100/80 dark:border-gray-800/60">
          <PriorityBadge priority={priority} />
          <CategoryBadge category={task.category as Category} />
          {task.status !== 'not_started' && <StatusBadge status={task.status as TaskStatus} />}

          {task.due_date && <DateChip date={task.due_date} dueTime={task.due_time} />}
          {task.is_overdue && !isDone && <OverdueBadge />}

          {estimateText && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60"
              title={`Estimated duration: ${estimateText}`}
            >
              <Clock size={11} className="text-gray-400" />
              <span>{estimateText}</span>
            </span>
          )}

          {task.energy_level === 'deep_work' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50">
              <BrainCircuit size={11} /> Deep work
            </span>
          )}

          {task.energy_level === 'quick_task' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50">
              <Zap size={11} /> Quick
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
