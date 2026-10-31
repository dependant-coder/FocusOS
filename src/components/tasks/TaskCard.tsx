import type { Task, Priority, Category, TaskStatus } from '../../types'
import { PRIORITY_COLORS } from '../../lib/constants'
import PriorityBadge from './PriorityBadge'
import CategoryBadge from './CategoryBadge'
import StatusBadge from './StatusBadge'
import DateChip from './DateChip'
import Toggle from '../ui/Toggle'
import { Pin } from 'lucide-react'
import { OverdueBadge } from './OverdueBadge'

interface TaskCardProps {
  task: Task
  onPin: (id: string, pinned: boolean) => void
  onTap: (task: Task) => void
  isPinning?: boolean
}

export default function TaskCard({ task, onPin, onTap, isPinning }: TaskCardProps) {
  const priority = task.priority as Priority
  const priorityColor = PRIORITY_COLORS[priority]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap(task)
        }
      }}
      className={`
        relative bg-white dark:bg-gray-900 rounded-xl border-l-4
        ${priorityColor.border}
        shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
        active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950
      `}
    >
      <div className="p-4">
        {/* Title & pin toggle row */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-[15px] leading-snug ${
              task.status === 'done'
                ? 'text-gray-400 dark:text-gray-600 line-through'
                : 'text-gray-900 dark:text-white'
            }`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {task.description}
              </p>
            )}
          </div>
          <div className="shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={task.pin_to_today}
              onChange={(checked) => onPin(task.id, checked)}
              disabled={isPinning}
              size="sm"
              aria-label={`Pin "${task.title}" to today`}
            />
          </div>
        </div>

        {/* Badge row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityBadge priority={priority} />
          <CategoryBadge category={task.category as Category} />
          {task.status !== 'not_started' && <StatusBadge status={task.status as TaskStatus} />}
          {task.due_date && <DateChip date={task.due_date} />}
          {task.is_overdue && <OverdueBadge />}
          {task.pin_to_today && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
              <Pin size={10} /> Pinned
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
