import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../components/layout/PageShell'
import DailyTodoCard from '../components/daily/DailyTodoCard'
import ProgressRing from '../components/daily/ProgressRing'
import EmptyState from '../components/ui/EmptyState'
import { useDailyTodos, useToggleDailyTodo, useCreateAdhocTodo } from '../hooks/useDailyTodos'
import { DAILY_QUOTES, PRIORITY_ORDER } from '../lib/constants'
import { getDayOfYear } from '../lib/dates'
import {
  Crosshair, Plus, Leaf, ListChecks, ArrowUpRight,
  CalendarDays, Sparkles, RefreshCw
} from 'lucide-react'
import type { DailyTodo } from '../types'

export default function Daily() {
  const { data: rawTodos = [], isLoading } = useDailyTodos()
  const toggleTodo = useToggleDailyTodo()
  const createAdhoc = useCreateAdhocTodo()
  const [adhocInput, setAdhocInput] = useState('')
  const [showAdhocInput, setShowAdhocInput] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const greeting = (() => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const todayQuote = DAILY_QUOTES[getDayOfYear(now) % DAILY_QUOTES.length]

  const handleAdhocSubmit = () => {
    if (!adhocInput.trim()) return
    createAdhoc.mutate(adhocInput.trim(), {
      onSuccess: () => {
        setAdhocInput('')
        setShowAdhocInput(false)
      },
    })
  }

  return (
    <PageShell title="Daily">
      {/* Hero Section */}
      <div className="px-4 pt-4 pb-5">
        {/* Date & Greeting */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs font-medium text-indigo-500 tracking-wider uppercase flex items-center gap-1">
              <CalendarDays size={12} /> {dayName}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {greeting}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{dateStr}</p>
          </div>
          <ProgressRing completed={doneCount} total={totalCount} />
        </div>

        {/* Motivational quote */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/5 dark:to-purple-500/5 rounded-xl px-4 py-3 border border-indigo-100/50 dark:border-indigo-500/10">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                "{todayQuote.text}"
              </p>
              <p className="text-[10px] text-gray-400 mt-1">— {todayQuote.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Carry-over banner */}
      {carryOvers.length > 0 && (
        <div className="mx-4 mb-3 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/15 flex items-center gap-2">
          <RefreshCw size={14} className="text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            {carryOvers.length} task{carryOvers.length !== 1 ? 's' : ''} carried over from yesterday
          </p>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 px-4 py-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-xl h-16 border border-gray-100 dark:border-gray-800" />
          ))}
        </div>
      ) : totalCount === 0 && !showAdhocInput ? (
        <EmptyState
          icon={Crosshair}
          title="No tasks for today"
          description="Pin tasks from the Vault or add an ad-hoc task to get started."
          actionLabel="Add Quick Task"
          onAction={() => {
            setShowAdhocInput(true)
            setTimeout(() => inputRef.current?.focus(), 100)
          }}
        />
      ) : totalCount === 0 && showAdhocInput ? (
        <div className="px-4 py-8">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add a quick task</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">What do you need to do today?</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={adhocInput}
              onChange={(e) => setAdhocInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdhocSubmit()}
              placeholder="What needs to be done?"
              className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleAdhocSubmit}
              disabled={!adhocInput.trim() || createAdhoc.isPending}
              className="shrink-0 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <ArrowUpRight size={14} />
              Add
            </button>
          </div>
        </div>
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
                      isToggling={toggleTodo.isPending}
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
                      isToggling={toggleTodo.isPending}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Section: Ad-hoc */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <ListChecks size={15} className="text-gray-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Quick Tasks
              </h3>
              {adhocs.length > 0 && (
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full font-medium">
                  {adhocs.filter((t) => t.done).length}/{adhocs.length}
                </span>
              )}
            </div>

            {/* Existing ad-hoc items */}
            <div className="space-y-2">
              <AnimatePresence>
                {adhocs.map((todo) => (
                  <DailyTodoCard
                    key={todo.id}
                    todo={todo}
                    onToggle={(id, done) => toggleTodo.mutate({ id, done })}
                    isToggling={toggleTodo.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Inline add */}
            {showAdhocInput ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={adhocInput}
                  onChange={(e) => setAdhocInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdhocSubmit()}
                  placeholder="What needs to be done?"
                  className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleAdhocSubmit}
                  disabled={!adhocInput.trim() || createAdhoc.isPending}
                  className="shrink-0 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <ArrowUpRight size={14} />
                  Add
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => {
                  setShowAdhocInput(true)
                  setTimeout(() => inputRef.current?.focus(), 100)
                }}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 text-sm font-medium transition-colors"
              >
                <Plus size={16} /> Add quick task
              </button>
            )}
          </section>
        </div>
      )}
    </PageShell>
  )
}
