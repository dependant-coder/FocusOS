import { useState, useMemo } from 'react'
import BottomSheet from '../ui/BottomSheet'
import type { Habit, HabitLog } from '../../hooks/useHabits'
import { todayLocal, addDaysLocal, formatShortDate } from '../../lib/dates'
import { isHabitDue, currentStreak, longestStreak, completionRate } from '../../lib/habits'
import { Archive, Edit3, Flame, Trophy, CheckCircle, Percent } from 'lucide-react'

interface HabitDetailProps {
  habit: Habit | null
  isOpen: boolean
  onClose: () => void
  logs: HabitLog[]
  onEdit: (habit: Habit) => void
  onArchive: (habit: Habit) => void
}

export default function HabitDetail({
  habit,
  isOpen,
  onClose,
  logs,
  onEdit,
  onArchive,
}: HabitDetailProps) {
  const [rangeDays, setRangeDays] = useState<30 | 90>(30)

  const todayStr = todayLocal()

  const completedDates = useMemo(() => {
    if (!habit) return []
    return logs
      .filter((l) => l.habit_id === habit.id && l.completed)
      .map((l) => l.date)
  }, [habit, logs])

  const stats = useMemo(() => {
    if (!habit) {
      return { streak: 0, graceUsed: 0, longest: 0, total: 0, rate: 0 }
    }
    const { streak, graceUsed } = currentStreak(habit, completedDates, todayStr)
    const startDate = addDaysLocal(todayStr, -(rangeDays - 1))
    const longest = longestStreak(habit, completedDates, startDate, todayStr)
    const total = completedDates.length
    const rate = completionRate(habit, completedDates, startDate, todayStr)

    return { streak, graceUsed, longest, total, rate }
  }, [habit, completedDates, todayStr, rangeDays])

  // Calendar cells for the selected range (30 or 90 days)
  const calendarCells = useMemo(() => {
    if (!habit) return []
    const cells = []
    const completedSet = new Set(completedDates)

    for (let i = rangeDays - 1; i >= 0; i--) {
      const dateStr = addDaysLocal(todayStr, -i)
      const isDue = isHabitDue(habit, dateStr)
      const isCompleted = completedSet.has(dateStr)
      const isToday = dateStr === todayStr
      cells.push({ dateStr, isDue, isCompleted, isToday })
    }

    return cells
  }, [habit, completedDates, todayStr, rangeDays])

  if (!habit) return null

  const frequencyLabel = {
    daily: 'Every day',
    weekdays: 'Weekdays (Mon–Fri)',
    weekends: 'Weekends (Sat–Sun)',
    custom: habit.custom_days?.join(', ') || 'Custom',
  }[habit.frequency]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Habit Overview">
      <div className="px-5 pb-6 space-y-6">
        {/* Habit header info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-2xl border border-emerald-200/50 dark:border-emerald-800/40">
            {habit.icon || '🎯'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {habit.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {frequencyLabel}
            </p>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Current streak */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-amber-500 mb-1">
              <Flame size={14} />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                Current Streak
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.streak}
              </span>
              <span className="text-xs text-gray-400">days</span>
              {stats.graceUsed > 0 && (
                <span className="text-[10px] text-amber-500 font-medium ml-auto" title="Grace period active">
                  ✦ Grace
                </span>
              )}
            </div>
          </div>

          {/* Longest streak */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-indigo-500 mb-1">
              <Trophy size={14} />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                Best Streak
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.longest}
              </span>
              <span className="text-xs text-gray-400">days</span>
            </div>
          </div>

          {/* Consistency % */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
              <Percent size={14} />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                {rangeDays}d Consistency
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.rate}%
              </span>
            </div>
          </div>

          {/* Total completions */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5 text-blue-500 mb-1">
              <CheckCircle size={14} />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                Total Done
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </span>
              <span className="text-xs text-gray-400">times</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid View (30 / 90 days) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Completion Calendar
            </h3>
            <div className="inline-flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setRangeDays(30)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  rangeDays === 30
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setRangeDays(90)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  rangeDays === 90
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>

          {/* Day squares grid */}
          <div
            className={`grid gap-1.5 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/50 dark:border-gray-700/50 ${
              rangeDays === 30 ? 'grid-cols-6 sm:grid-cols-10' : 'grid-cols-10 sm:grid-cols-15'
            }`}
          >
            {calendarCells.map((cell) => {
              let cellClass = ''
              let label = formatShortDate(cell.dateStr)

              if (!cell.isDue) {
                cellClass = 'bg-gray-200/50 dark:bg-gray-700/40 text-gray-400 opacity-40'
                label += ' (Not scheduled)'
              } else if (cell.isCompleted) {
                cellClass = 'bg-emerald-500 text-white shadow-2xs'
                label += ' (Completed ✓)'
              } else if (cell.isToday) {
                cellClass = 'border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                label += ' (Due today)'
              } else {
                cellClass = 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-400'
                label += ' (Missed)'
              }

              return (
                <div
                  key={cell.dateStr}
                  className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-transform hover:scale-110 ${cellClass}`}
                  title={label}
                >
                  {cell.dateStr.slice(8)}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500 justify-end">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
              <span>Done</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800" />
              <span>Missed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-gray-200/60 dark:bg-gray-700/50" />
              <span>Rest day</span>
            </div>
          </div>
        </div>

        {/* Actions: Edit & Archive */}
        <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              onClose()
              onEdit(habit)
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Edit3 size={15} />
            <span>Edit Habit</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onArchive(habit)
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Archive size={15} />
            <span>Archive</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
