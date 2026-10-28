import { useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import PageShell from '../components/layout/PageShell'
import DailyTodoCard from '../components/daily/DailyTodoCard'
import { DailyProgressHeader } from '../components/daily/DailyProgressHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { MorningBanner } from '../components/daily/MorningBanner'
import { QuickAddBar, type QuickAddBarHandle } from '../components/daily/QuickAddBar'
import { useAuth } from '../hooks/useAuth'

import { DailySkeleton } from '../components/ui/Skeleton'
import { useDailyTodos, useToggleDailyTodo, useDeleteDailyTodo } from '../hooks/useDailyTodos'
import { PRIORITY_ORDER } from '../lib/constants'
import { Crosshair, Leaf, ListChecks, RefreshCw } from 'lucide-react'
import type { DailyTodo } from '../types'

export default function Daily() {
  const { user } = useAuth()
  const { data: rawTodos = [], isLoading } = useDailyTodos()
  const toggleTodo = useToggleDailyTodo()
  const deleteTodo = useDeleteDailyTodo()
  const quickAddRef = useRef<QuickAddBarHandle>(null)

  // Split todos into sections
  const todos = rawTodos as (DailyTodo & { tasks?: { description: string | null; resources_url: string | null } | null })[]
  const priorities = todos
    .filter((t) => t.type === 'pinned' || t.type === 'due_today')
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99
      const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99
      return pa - pb
    })
  const habits = todos.filter((t) => t.type === 'habit')
  const adhocs = todos.filter((t) => t.type === 'adhoc')
  const carryOvers = todos.filter((t) => t.carry_over)

  // Stats
  const totalCount = todos.length
  const doneCount = todos.filter((t) => t.done).length

  // Today's info
  const now = new Date()

  return (
    <PageShell title="Daily">
      <DailyProgressHeader completed={doneCount} total={totalCount} date={now} />

      <MorningBanner name={user?.user_metadata?.full_name || user?.email || 'there'} taskCount={totalCount} />

      {/* Carry-over banner */}
      {carryOvers.length > 0 && (
        <div className="mx-4 mb-3 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/15 flex items-center gap-2">
          <RefreshCw size={14} className="text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            {carryOvers.length} task{carryOvers.length !== 1 ? 's' : ''} carried over from yesterday
          </p>
        </div>
      )}

      {/* Quick Add Bar — Always available at the top directly under header */}
      <div className="px-4 mb-4">
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
            label: 'Pick from Tasks',
            href: '/vault',
          }}
        />
      ) : (
        <div className="px-4 pb-32 space-y-6">
          {/* Section: Priorities */}
          {priorities.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Crosshair size={15} className="text-indigo-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Today's Priorities
                </h3>
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-medium">
                  {priorities.filter((t) => t.done).length}/{priorities.length}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {priorities.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => deleteTodo.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section: Habits */}
          {habits.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Leaf size={15} className="text-emerald-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Habits
                </h3>
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-medium">
                  {habits.filter((t) => t.done).length}/{habits.length}
                </span>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {habits.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => deleteTodo.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section: Quick Tasks */}
          {adhocs.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks size={15} className="text-gray-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Quick Tasks
                </h3>
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-medium">
                  {adhocs.filter((t) => t.done).length}/{adhocs.length}
                </span>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {adhocs.map((todo) => (
                    <DailyTodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                      onDelete={(id) => deleteTodo.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}
