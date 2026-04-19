import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import PageShell from '../components/layout/PageShell'
import HabitRow from '../components/habits/HabitRow'
import HabitForm from '../components/habits/HabitForm'
import EmptyState from '../components/ui/EmptyState'
import FAB from '../components/ui/FAB'
import {
  useHabits,
  useHabitLogs,
  useCreateHabit,
  useToggleHabitLog,
  useDeleteHabit,
} from '../hooks/useHabits'
import { Leaf, Check, TrendingUp } from 'lucide-react'

export default function Habits() {
  const { data: habits = [], isLoading } = useHabits()
  const { data: logs = [] } = useHabitLogs(30)
  const createHabit = useCreateHabit()
  const toggleLog = useToggleHabitLog()
  const deleteHabit = useDeleteHabit()
  const [showForm, setShowForm] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Today's completion stats
  const todayLogs = logs.filter((l) => l.date === todayStr)
  const todayDone = todayLogs.filter((l) => l.completed).length
  const todayTotal = habits.length

  // Monthly completion rate
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthLogs = logs.filter(
    (l) => l.date.startsWith(thisMonth) && l.completed
  )
  const monthRate =
    habits.length > 0
      ? Math.round((monthLogs.length / (habits.length * new Date().getDate())) * 100)
      : 0

  return (
    <PageShell title="Habits">
      {/* Stats Header */}
      {habits.length > 0 && (
        <div className="px-4 pt-4 pb-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Today's progress */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800/60 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Check size={14} className="text-emerald-500" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Today
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {todayDone}
                <span className="text-sm text-gray-400 font-normal">
                  /{todayTotal}
                </span>
              </p>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Monthly rate */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/60 dark:border-gray-800/60 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp size={14} className="text-indigo-500" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  This month
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {monthRate}
                <span className="text-sm text-gray-400 font-normal">%</span>
              </p>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${monthRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 px-4 py-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white dark:bg-gray-900 rounded-xl h-20 border border-gray-100 dark:border-gray-800"
            />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title="No habits yet"
          description="Build consistency by tracking small daily habits."
          actionLabel="Create First Habit"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="px-4 pb-32 space-y-2.5">
          <AnimatePresence>
            {habits.map((habit) => {
              const habitLogs = logs.filter((l) => l.habit_id === habit.id)
              const todayLog = habitLogs.find((l) => l.date === todayStr)

              return (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  todayLog={todayLog}
                  recentLogs={habitLogs}
                  onToggle={(habitId, date, completed) =>
                    toggleLog.mutate({ habitId, date, completed })
                  }
                  onDelete={(id) => deleteHabit.mutate(id)}
                  isToggling={toggleLog.isPending}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* FAB */}
      <FAB onClick={() => setShowForm(true)} />

      {/* Create form */}
      <HabitForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(habit) => {
          createHabit.mutate(habit, {
            onSuccess: () => setShowForm(false),
          })
        }}
        isPending={createHabit.isPending}
      />
    </PageShell>
  )
}
