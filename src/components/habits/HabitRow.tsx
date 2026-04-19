import { motion } from 'framer-motion'
import { Check, MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Habit, HabitLog } from '../../hooks/useHabits'
import StreakDots from './StreakDots'

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
  const todayStr = new Date().toISOString().split('T')[0]
  const isDone = todayLog?.completed ?? false
  const completedDates = recentLogs
    .filter((l) => l.completed)
    .map((l) => l.date)

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
        ${isDone
          ? 'border-emerald-200/60 dark:border-emerald-500/15'
          : 'border-gray-200/60 dark:border-gray-800/60'
        }
        shadow-sm transition-all
      `}
    >
      <div className="flex items-center gap-3 p-3.5">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(habit.id, todayStr, !isDone)}
          disabled={isToggling}
          className={`
            shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
            ${isDone
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
            }
          `}
        >
          {isDone && <Check size={14} strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{habit.icon}</span>
            <p
              className={`text-sm font-medium ${
                isDone
                  ? 'line-through text-gray-400 dark:text-gray-600'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {habit.name}
            </p>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              {frequencyLabel}
            </span>
            <StreakDots completedDates={completedDates} />
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
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
