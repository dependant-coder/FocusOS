import { motion } from 'framer-motion'
import { Check, Minus, MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Habit, HabitLog } from '../../hooks/useHabits'
import StreakDots from './StreakDots'
import { todayLocal } from '../../lib/dates'
import { isHabitDue, currentStreak } from '../../lib/habits'

interface HabitRowProps {
  habit: Habit
  todayLog: HabitLog | undefined
  recentLogs: HabitLog[]
  onToggle: (habitId: string, date: string, completed: boolean) => void
  onDelete: (id: string) => void
  isToggling: boolean
}

export default function HabitRow({
  habit,
  todayLog,
  recentLogs,
  onToggle,
  onDelete,
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

  const frequencyLabel = {
    daily: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    custom: habit.custom_days?.join(', ') || 'Custom',
  }[habit.frequency]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative bg-white dark:bg-gray-900 rounded-xl border
        ${!isDue
          ? 'border-gray-100 dark:border-gray-800/40 opacity-75'
          : isDone
            ? 'border-emerald-200/60 dark:border-emerald-500/15'
            : 'border-gray-200/60 dark:border-gray-800/60'
        }
        shadow-sm transition-all
      `}
    >
      <div className="flex items-center gap-3 p-3.5">
        {/* Checkbox */}
        <button
          onClick={() => {
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
            shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
            ${!isDue
              ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : isDone
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
            }
          `}
        >
          {!isDue ? (
            <Minus size={12} strokeWidth={2.5} />
          ) : (
            isDone && <Check size={14} strokeWidth={3} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{habit.icon}</span>
            <p
              className={`text-sm font-medium ${
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
                <span className="text-[10px] text-gray-500 dark:text-gray-400">0 streak</span>
              )}
            </div>
            <StreakDots completedDates={completedDates} />
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
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
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => {
                    onDelete(habit.id)
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} /> Archive
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
