import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import PageShell from '../components/layout/PageShell'
import DailyTodoCard from '../components/daily/DailyTodoCard'
import { DailyProgressHeader } from '../components/daily/DailyProgressHeader'
import { PlanDaySheet } from '../components/daily/PlanDaySheet'
import { TodoSheet } from '../components/daily/TodoSheet'
import { EmptyState } from '../components/ui/EmptyState'
import { QuickAddBar, type QuickAddBarHandle } from '../components/daily/QuickAddBar'
import { DailySkeleton } from '../components/ui/Skeleton'
import {
  useDailyTodos,
  useToggleDailyTodo,
  useDeleteDailyTodo,
  useToggleMustDo,
  useMoveTodoDate,
} from '../hooks/useDailyTodos'
import { showUndo } from '../lib/undo'
import { todayLocal, addDaysLocal } from '../lib/dates'
import { PRIORITY_ORDER } from '../lib/constants'
import {
  Star,
  Crosshair,
  Leaf,
  ListChecks,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  PartyPopper,
} from 'lucide-react'
import type { DailyTodoWithTask } from '../types'
import toast from 'react-hot-toast'

export default function Daily() {
  const { data: rawTodos = [], isLoading } = useDailyTodos()
  const toggleTodo = useToggleDailyTodo()
  const deleteTodo = useDeleteDailyTodo()
  const toggleMustDo = useToggleMustDo()
  const moveTodoDate = useMoveTodoDate()

  const quickAddRef = useRef<QuickAddBarHandle>(null)
  const [isPlanOpen, setIsPlanOpen] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<DailyTodoWithTask | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [celebrationDismissed, setCelebrationDismissed] = useState(false)

  const prefersReducedMotion = useReducedMotion()
  const todayKey = todayLocal()

  const todos = rawTodos as DailyTodoWithTask[]

  // Separate todos into sections
  const mustDos = todos.filter((t) => t.must_do && !t.done)
  const priorities = todos
    .filter((t) => (t.type === 'pinned' || t.type === 'due_today') && !t.must_do && !t.done)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99
      const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99
      return pa - pb
    })
  const habits = todos.filter((t) => t.type === 'habit' && !t.done)
  const adhocs = todos.filter((t) => t.type === 'adhoc' && !t.must_do && !t.done)
  const completed = todos.filter((t) => t.done)

  const totalCount = todos.length
  const doneCount = completed.length
  const allCompleted = totalCount > 0 && doneCount === totalCount

  // Check once-per-day 100% completion celebration
  const celebrationStorageKey = `focusos-celebrated-${todayKey}`
  const alreadyCelebrated = typeof window !== 'undefined' && Boolean(localStorage.getItem(celebrationStorageKey))
  const showCelebrationBanner = allCompleted && !alreadyCelebrated && !celebrationDismissed

  useEffect(() => {
    if (showCelebrationBanner) {
      try {
        localStorage.setItem(celebrationStorageKey, '1')
      } catch {
        // Safe fallback
      }
    }
  }, [showCelebrationBanner, celebrationStorageKey])

  // Auto-open Plan my day once per day if carried-over items exist
  useEffect(() => {
    if (isLoading) return
    const planStorageKey = `focusos-plan-${todayKey}`
    const alreadyPlanned = Boolean(localStorage.getItem(planStorageKey))
    const hasCarriedOver = todos.some((t) => (t.carry_over || t.carry_count > 0) && !t.done)

    if (hasCarriedOver && !alreadyPlanned) {
      setIsPlanOpen(true)
    }
  }, [isLoading, todos, todayKey])

  const handleClosePlan = () => {
    setIsPlanOpen(false)
    try {
      localStorage.setItem(`focusos-plan-${todayKey}`, '1')
    } catch {
      // Ignore storage errors
    }
  }

  const handleDelete = (id: string, title?: string) => {
    const todoToDelete = todos.find((t) => t.id === id)
    showUndo({
      message: `Deleted "${title || todoToDelete?.title || 'task'}"`,
      onUndo: () => {
        // Undo simply retains the item in the active query cache
      },
      onCommit: () => {
        deleteTodo.mutate(id)
      },
      ms: 5000,
    })
  }

  const handleMoveTomorrow = (todo: DailyTodoWithTask) => {
    moveTodoDate.mutate(
      {
        todoId: todo.id,
        taskId: todo.task_id,
        newDate: addDaysLocal(todayLocal(), 1),
      },
      {
        onSuccess: () => {
          toast.success(`Moved "${todo.title}" to tomorrow`)
        },
      }
    )
  }

  const handleToggleMustDo = (todo: DailyTodoWithTask) => {
    const currentMustDos = todos.filter((t) => t.must_do && !t.done).length
    if (!todo.must_do && currentMustDos >= 3) {
      toast.error('You can only select up to 3 Must-Do tasks for today')
      return
    }
    toggleMustDo.mutate({ id: todo.id, must_do: !todo.must_do })
  }

  return (
    <PageShell title="Daily" size="narrow">
      <DailyProgressHeader
        completed={doneCount}
        total={totalCount}
        date={new Date()}
        onOpenPlanDay={() => setIsPlanOpen(true)}
      />

      {/* 100% Completion once-per-day celebration banner (respects reduced motion) */}
      {showCelebrationBanner && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-4 mt-3 mb-2 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <PartyPopper className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                All caught up for today! Outstanding work.
              </p>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Enjoy your evening or capture anything on your mind.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCelebrationDismissed(true)}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Quick Add Bar: Always at top */}
      <div className="px-4 mt-3 mb-4">
        <QuickAddBar ref={quickAddRef} />
      </div>

      {/* Content */}
      {isLoading ? (
        <DailySkeleton />
      ) : totalCount === 0 ? (
        <EmptyState
          variant="daily"
          onAction={() => quickAddRef.current?.focus()}
          secondaryAction={{
            label: 'Plan My Day',
            onClick: () => setIsPlanOpen(true),
          }}
        />
      ) : (
        <div className="px-4 pb-32 space-y-6">
          {/* Section 1: Must-do (Max 3, Starred) */}
          {mustDos.length > 0 && (
            <section aria-labelledby="section-must-do">
              <div className="flex items-center gap-2 mb-2.5">
                <Star size={15} className="text-amber-500 fill-amber-500" />
                <h2 id="section-must-do" className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Must-Do Focus
                </h2>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full font-semibold">
                  {mustDos.length}/3
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {mustDos.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => handleDelete(id, todo.title)}
                      onTap={() => setSelectedTodo(todo)}
                      onMoveTomorrow={handleMoveTomorrow}
                      onToggleMustDo={handleToggleMustDo}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section 2: Priorities (Pinned + Due Today) */}
          {priorities.length > 0 && (
            <section aria-labelledby="section-priorities">
              <div className="flex items-center gap-2 mb-2.5">
                <Crosshair size={15} className="text-indigo-600 dark:text-indigo-400" />
                <h2 id="section-priorities" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Priorities
                </h2>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-semibold">
                  {priorities.length}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {priorities.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => handleDelete(id, todo.title)}
                      onTap={() => setSelectedTodo(todo)}
                      onMoveTomorrow={handleMoveTomorrow}
                      onToggleMustDo={handleToggleMustDo}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section 3: Habits */}
          {habits.length > 0 && (
            <section aria-labelledby="section-habits">
              <div className="flex items-center gap-2 mb-2.5">
                <Leaf size={15} className="text-emerald-600 dark:text-emerald-400" />
                <h2 id="section-habits" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Habits
                </h2>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-semibold">
                  {habits.length}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {habits.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => handleDelete(id, todo.title)}
                      onTap={() => setSelectedTodo(todo)}
                      onMoveTomorrow={handleMoveTomorrow}
                      onToggleMustDo={handleToggleMustDo}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section 4: Quick tasks (Adhoc) */}
          {adhocs.length > 0 && (
            <section aria-labelledby="section-quick-tasks">
              <div className="flex items-center gap-2 mb-2.5">
                <ListChecks size={15} className="text-gray-500" />
                <h2 id="section-quick-tasks" className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Quick Tasks
                </h2>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-semibold">
                  {adhocs.length}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {adhocs.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => handleDelete(id, todo.title)}
                      onTap={() => setSelectedTodo(todo)}
                      onMoveTomorrow={handleMoveTomorrow}
                      onToggleMustDo={handleToggleMustDo}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section 5: Completed (Collapsed by default, count shown) */}
          {completed.length > 0 && (
            <section className="pt-2 border-t border-gray-100 dark:border-gray-800" aria-labelledby="section-completed">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center justify-between w-full py-2 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
                aria-expanded={showCompleted}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  <h2 id="section-completed" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                    Completed ({completed.length})
                  </h2>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {showCompleted ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>

              <AnimatePresence>
                {showCompleted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 mt-2"
                  >
                    {completed.map((todo) => (
                      <DailyTodoCard
                        key={todo.id}
                        todo={todo}
                        onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                        onDelete={(id) => handleDelete(id, todo.title)}
                        onTap={() => setSelectedTodo(todo)}
                        onMoveTomorrow={handleMoveTomorrow}
                        onToggleMustDo={handleToggleMustDo}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}
        </div>
      )}

      {/* Plan My Day Sheet */}
      <PlanDaySheet
        isOpen={isPlanOpen}
        onClose={handleClosePlan}
        todos={todos}
      />

      {/* Task Edit Sheet */}
      <TodoSheet
        isOpen={Boolean(selectedTodo)}
        onClose={() => setSelectedTodo(null)}
        todo={selectedTodo}
      />
    </PageShell>
  )
}
