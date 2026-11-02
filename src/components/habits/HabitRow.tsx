import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Minus, MoreVertical, Archive, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import type { Habit, HabitLog } from '../../hooks/useHabits'
import StreakDots from './StreakDots'
import { todayLocal } from '../../lib/dates'
import { isHabitDue, currentStreak } from '../../lib/habits'

interface HabitRowProps {
  habit: Habit
  todayLog: HabitLog | undefined
  recentLogs: HabitLog[]
  onToggle: (habitId: string, date: string, completed: boolean) => void
  onArchive: (habit: Habit) => void
  onTap: (habit: Habit) => void
  onMoveUp?: (id: string) => void
  onMoveDown?: (id: string) => void
  isFirst?: boolean
  isLast?: boolean
  isToggling?: boolean
}

export default function HabitRow({
  habit,
  todayLog,
  recentLogs,
  onToggle,
  onArchive,
  onTap,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isToggling,
}: HabitRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const todayStr = todayLocal()
  const isDue = isHabitDue(habit, todayStr)
  const isDone = todayLog?.completed ?? false
  const completedDates = recentLogs
    .filter((l) => l.completed)
    .map((l) => l.date)

  const { streak, graceUsed } = currentStreak(habit, completedDates, todayStr)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 25 : 'auto',
  }

  const frequencyLabel = {
    daily: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    custom: habit.custom_days?.join(', ') || 'Custom',
  }[habit.frequency]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white dark:bg-gray-900 rounded-xl border
        ${isDragging ? 'shadow-lg border-indigo-400 opacity-90' : 'shadow-xs'}
        ${!isDue
          ? 'border-gray-100 dark:border-gray-800/40 opacity-75'
          : isDone
            ? 'border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/10'
            : 'border-gray-200/70 dark:border-gray-800/70 hover:border-gray-300 dark:hover:border-gray-700'
        }
        transition-all duration-150
      `}
    >
      <div className="flex items-center gap-2.5 p-3.5">
        {/* Drag handle & keyboard move buttons */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${habit.name}`}
            className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 cursor-grab active:cursor-grabbing rounded touch-none"
          >
            <GripVertical size={16} />
          </button>
          <div className="hidden sm:flex flex-col -space-y-1">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMoveUp?.(habit.id)}
              aria-label={`Move ${habit.name} up`}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20"
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMoveDown?.(habit.id)}
              aria-label={`Move ${habit.name} down`}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20"
            >
              <ChevronDown size={12} />
            </button>
          </div>
        </div>

        {/* Checkbox (due only) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (isDue) {
              onToggle(habit.id, todayStr, !isDone)
            }
          }}
          disabled={!isDue || isToggling}
          aria-label={
            !isDue
              ? `${habit.name} (Not scheduled today)`
              : isDone
                ? `Mark ${habit.name} incomplete`
                : `Mark ${habit.name} complete`
          }
          className={`
            shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
            ${!isDue
              ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : isDone
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 bg-white dark:bg-gray-800'
            }
          `}
        >
          {!isDue ? (
            <Minus size={12} strokeWidth={2.5} />
          ) : (
            isDone && <Check size={14} strokeWidth={3} />
          )}
        </button>

        {/* Content area: clickable to open HabitDetail */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onTap(habit)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTap(habit)
            }
          }}
          className="flex-1 min-w-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-0.5"
          aria-label={`View details for ${habit.name}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">{habit.icon || '🎯'}</span>
            <p
              className={`text-sm font-semibold truncate ${
                !isDue
                  ? 'text-gray-500 dark:text-gray-400'
                  : isDone
                    ? 'line-through text-gray-400 dark:text-gray-600'
                    : 'text-gray-900 dark:text-white'
              }`}
            >
              {habit.name}
            </p>
            {!isDue && (
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                Not scheduled today
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-1.5 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                {frequencyLabel}
              </span>
              {streak > 0 ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                  🔥 {streak}
                  {graceUsed > 0 && (
                    <span className="text-[9px] text-amber-500" title="Grace active">
                      ✦
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400">0 streak</span>
              )}
            </div>

            {/* Frequency-aware 7-day dots */}
            <StreakDots completedDates={completedDates} habit={habit} />
          </div>
        </div>

        {/* Overflow Menu with Archive (using Archive icon, NOT Trash2) */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label={`Options for ${habit.name}`}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[140px] animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    onTap(habit)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Overview & Stats
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    onArchive(habit)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  <Archive size={14} />
                  <span>Archive</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
