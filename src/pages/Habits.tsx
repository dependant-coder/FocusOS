import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import PageShell from '../components/layout/PageShell'
import HabitRow from '../components/habits/HabitRow'
import HabitForm from '../components/habits/HabitForm'
import HabitDetail from '../components/habits/HabitDetail'
import { EmptyState } from '../components/ui/EmptyState'
import FAB from '../components/ui/FAB'
import {
  useHabits,
  useArchivedHabits,
  useHabitLogs,
  useCreateHabit,
  useUpdateHabit,
  useReorderHabits,
  useArchiveHabit,
  useRestoreHabit,
  useDeleteHabitPermanently,
  useToggleHabitLog,
  type Habit,
} from '../hooks/useHabits'
import { Check, TrendingUp, Flame, Archive, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { todayLocal } from '../lib/dates'
import { isHabitDue, completionRate, currentStreak } from '../lib/habits'
import { showUndo } from '../lib/undo'

export default function Habits() {
  const qc = useQueryClient()
  const { data: habits = [], isLoading } = useHabits()
  const { data: archivedHabits = [] } = useArchivedHabits()
  const { data: logs = [] } = useHabitLogs(90)

  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const reorderHabits = useReorderHabits()
  const archiveHabit = useArchiveHabit()
  const restoreHabit = useRestoreHabit()
  const deletePermanently = useDeleteHabitPermanently()
  const toggleLog = useToggleHabitLog()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [inspectingHabit, setInspectingHabit] = useState<Habit | null>(null)
  const [showArchivedSection, setShowArchivedSection] = useState(false)

  const todayStr = todayLocal()

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 1. Today's progress (due habits only)
  const dueHabits = useMemo(
    () => habits.filter((h) => isHabitDue(h, todayStr)),
    [habits, todayStr]
  )
  const todayTotal = dueHabits.length
  const todayDone = useMemo(
    () =>
      dueHabits.filter((h) =>
        logs.some((l) => l.habit_id === h.id && l.date === todayStr && l.completed)
      ).length,
    [dueHabits, logs, todayStr]
  )

  // 2. 30-day consistency rate over due days only
  const monthStart = useMemo(() => {
    // 30 days ago
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }, [])

  const monthRate = useMemo(() => {
    if (habits.length === 0) return 0
    const rates = habits.map((h) => {
      const hCompletedDates = logs
        .filter((l) => l.habit_id === h.id && l.completed)
        .map((l) => l.date)
      return completionRate(h, hCompletedDates, monthStart, todayStr)
    })
    return Math.round(rates.reduce((acc, r) => acc + r, 0) / habits.length)
  }, [habits, logs, monthStart, todayStr])

  // 3. Best current streak across all active habits
  const bestCurrentStreak = useMemo(() => {
    if (habits.length === 0) return 0
    let best = 0
    habits.forEach((h) => {
      const hCompletedDates = logs
        .filter((l) => l.habit_id === h.id && l.completed)
        .map((l) => l.date)
      const res = currentStreak(h, hCompletedDates, todayStr)
      if (res.streak > best) best = res.streak
    })
    return best
  }, [habits, logs, todayStr])

  // DnD drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = habits.findIndex((h) => h.id === active.id)
    const newIndex = habits.findIndex((h) => h.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(habits, oldIndex, newIndex)
    const payload = reordered.map((h, idx) => ({ id: h.id, sort_order: idx }))

    reorderHabits.mutate(payload)
  }

  // Keyboard Move Up / Down
  const handleMoveUp = (id: string) => {
    const idx = habits.findIndex((h) => h.id === id)
    if (idx <= 0) return
    const reordered = arrayMove(habits, idx, idx - 1)
    reorderHabits.mutate(reordered.map((h, i) => ({ id: h.id, sort_order: i })))
  }

  const handleMoveDown = (id: string) => {
    const idx = habits.findIndex((h) => h.id === id)
    if (idx < 0 || idx >= habits.length - 1) return
    const reordered = arrayMove(habits, idx, idx + 1)
    reorderHabits.mutate(reordered.map((h, i) => ({ id: h.id, sort_order: i })))
  }

  // Archive habit with showUndo
  const handleArchive = (habit: Habit) => {
    // Optimistically remove from active list
    qc.setQueriesData<Habit[]>({ queryKey: ['habits'] }, (old) =>
      old ? old.filter((h) => h.id !== habit.id) : []
    )

    showUndo({
      message: `Archived "${habit.name}"`,
      onUndo: () => {
        qc.setQueriesData<Habit[]>({ queryKey: ['habits'] }, (old) => {
          if (!old) return [habit]
          if (old.some((h) => h.id === habit.id)) return old
          return [...old, habit].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        })
      },
      onCommit: () => {
        archiveHabit.mutate(habit.id)
      },
      ms: 5000,
    })
  }

  // Restore archived habit
  const handleRestore = (habit: Habit) => {
    restoreHabit.mutate(habit.id)
  }

  // Permanent delete with showUndo
  const handleDeletePermanently = (habit: Habit) => {
    qc.setQueriesData<Habit[]>({ queryKey: ['habits_archived'] }, (old) =>
      old ? old.filter((h) => h.id !== habit.id) : []
    )

    showUndo({
      message: `Deleted "${habit.name}"`,
      onUndo: () => {
        qc.setQueriesData<Habit[]>({ queryKey: ['habits_archived'] }, (old) => {
          if (!old) return [habit]
          if (old.some((h) => h.id === habit.id)) return old
          return [...old, habit]
        })
      },
      onCommit: () => {
        deletePermanently.mutate(habit.id)
      },
      ms: 5000,
    })
  }

  const handleUpdateHabitSubmit = (data: {
    name: string
    icon: string
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
    custom_days?: string[]
  }) => {
    if (!editingHabit) return
    updateHabit.mutate(
      {
        id: editingHabit.id,
        name: data.name,
        icon: data.icon,
        frequency: data.frequency,
        custom_days: data.custom_days || [],
      },
      {
        onSuccess: () => {
          setEditingHabit(null)
        },
      }
    )
  }

  return (
    <PageShell title="Habits">
      {/* 3-Card Stats Header */}
      {habits.length > 0 && (
        <div className="px-4 pt-4 pb-3">
          <div className="grid grid-cols-3 gap-2.5">
            {/* Today's progress */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/70 dark:border-gray-800/80 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Check size={13} className="text-emerald-500" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Today
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {todayDone}
                <span className="text-xs text-gray-400 font-normal">/{todayTotal}</span>
              </p>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                <div
                  className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                  style={{
                    width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* 30-Day consistency */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/70 dark:border-gray-800/80 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={13} className="text-indigo-500" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  30d Rate
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {monthRate}
                <span className="text-xs text-gray-400 font-normal">%</span>
              </p>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                <div
                  className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${monthRate}%` }}
                />
              </div>
            </div>

            {/* Best current streak */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/70 dark:border-gray-800/80 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={13} className="text-amber-500" />
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Top Streak
                </span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {bestCurrentStreak}
                <span className="text-xs text-gray-400 font-normal">d</span>
              </p>
              <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                <div
                  className="bg-amber-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, bestCurrentStreak * 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Habits List */}
      {isLoading ? (
        <div className="space-y-3 px-4 py-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white dark:bg-gray-900 rounded-xl h-20 border border-gray-100 dark:border-gray-800"
            />
          ))}
        </div>
      ) : (
        <div className="px-4 pb-28 space-y-2.5">
          {habits.length === 0 ? (
            <EmptyState variant="habits" onAction={() => setShowCreateForm(true)} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={habits.map((h) => h.id)}
                strategy={verticalListSortingStrategy}
              >
                {habits.map((habit, idx) => {
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
                      onArchive={handleArchive}
                      onTap={(h) => setInspectingHabit(h)}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      isFirst={idx === 0}
                      isLast={idx === habits.length - 1}
                      isToggling={
                        toggleLog.isPending &&
                        toggleLog.variables?.habitId === habit.id
                      }
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
          )}

          {/* Archived section toggle at bottom */}
          {archivedHabits.length > 0 && (
            <div className="pt-6">
              <button
                type="button"
                onClick={() => setShowArchivedSection(!showArchivedSection)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50/50 dark:hover:bg-gray-850/50 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <Archive size={14} />
                  <span>Archived habits ({archivedHabits.length})</span>
                </div>
                {showArchivedSection ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showArchivedSection && (
                <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                  {archivedHabits.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50 text-xs text-gray-600 dark:text-gray-400"
                    >
                      <div className="flex items-center gap-2">
                        <span>{habit.icon || '🎯'}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {habit.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestore(habit)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw size={11} />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePermanently(habit)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Delete permanently"
                          aria-label={`Delete "${habit.name}" permanently`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FAB to add habit */}
      <FAB onClick={() => setShowCreateForm(true)} label="Add Habit" />

      {/* Create Habit Form */}
      <HabitForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={(data) => {
          createHabit.mutate(data, {
            onSuccess: () => setShowCreateForm(false),
          })
        }}
        isPending={createHabit.isPending}
      />

      {/* Edit Habit Form */}
      <HabitForm
        open={Boolean(editingHabit)}
        onClose={() => setEditingHabit(null)}
        initialData={editingHabit}
        onSubmit={handleUpdateHabitSubmit}
        isPending={updateHabit.isPending}
      />

      {/* Habit Detail Overview Sheet */}
      <HabitDetail
        habit={inspectingHabit}
        isOpen={Boolean(inspectingHabit)}
        onClose={() => setInspectingHabit(null)}
        logs={logs}
        onEdit={(h) => setEditingHabit(h)}
        onArchive={handleArchive}
      />
    </PageShell>
  )
}
