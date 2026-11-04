import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Settings,
  Sparkles,
  Star,
  Clock,
  Check,
  ChevronRight,
  Plus,
} from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import ProgressRing from '../components/daily/ProgressRing'
import { CheckboxRing } from '../components/ui/CheckboxRing'
import { useAuth } from '../hooks/useAuth'
import { useDailyTodos, useToggleDailyTodo } from '../hooks/useDailyTodos'
import { useTasks } from '../hooks/useTasks'
import { useHabits, useHabitLogs, useToggleHabitLog } from '../hooks/useHabits'
import { isHabitDue } from '../lib/habits'
import { DAILY_QUOTES, PRIORITY_ORDER, type Priority, PRIORITY_CONFIG } from '../lib/constants'
import { safeStorage } from '../lib/safeStorage'
import { getGreeting, format, todayLocal, getDayOfYear } from '../lib/dates'
import { supabase } from '../lib/supabase'

export default function Home() {
  const { user } = useAuth()
  const todayStr = todayLocal()

  const { data: todos = [] } = useDailyTodos()
  const toggleTodo = useToggleDailyTodo()

  const { data: allTasks = [] } = useTasks()
  const { data: overdueTasks = [] } = useTasks({ overdue: true })

  const { data: habits = [] } = useHabits()
  const { data: habitLogs = [] } = useHabitLogs(1)
  const toggleHabitLog = useToggleHabitLog()

  // Profile data for first name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data
    },
  })

  // Latest weekly reflection win (if available)
  const { data: latestWin } = useQuery({
    queryKey: ['latest_win', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_reviews')
        .select('wins')
        .eq('user_id', user!.id)
        .not('wins', 'is', null)
        .order('week_start', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.wins ? data.wins.trim() : null
    },
  })

  // Time-aware greeting and formatted date
  const firstName =
    profile?.name?.trim().split(' ')[0] ||
    user?.user_metadata?.full_name?.trim().split(' ')[0] ||
    'there'
  const greeting = `${getGreeting()}, ${firstName}`
  const todayFormatted = format(new Date(), 'EEEE, MMMM d')

  // Quote
  const showQuote = safeStorage.getItem('focusos_show_quote') !== 'false'
  const dayOfYear = getDayOfYear(new Date())
  const quote = DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]

  // Counts & stats
  const completedTodos = todos.filter((t) => t.done)
  const totalTodosCount = todos.length
  const completedTodosCount = completedTodos.length

  // Habits due today
  const dueHabits = useMemo(() => {
    return habits.filter((h) => isHabitDue(h, todayStr))
  }, [habits, todayStr])

  const habitsDoneCount = useMemo(() => {
    return dueHabits.filter((h) => {
      const matchingTodo = todos.find((t) => t.habit_id === h.id)
      if (matchingTodo) return matchingTodo.done
      return habitLogs.some((l) => l.habit_id === h.id && l.date === todayStr && l.completed)
    }).length
  }, [dueHabits, todos, habitLogs, todayStr])

  const habitsDueCount = dueHabits.length

  // Next up: top 3 incomplete items from Today (priority-sorted, excluding habits)
  const nextUpItems = useMemo(() => {
    const incomplete = todos.filter((t) => !t.done && t.type !== 'habit')
    return incomplete
      .sort((a, b) => {
        // Must-do first
        if (a.must_do && !b.must_do) return -1
        if (!a.must_do && b.must_do) return 1

        // Priority order
        const pA = a.priority ? PRIORITY_ORDER[a.priority as Priority] ?? 99 : 99
        const pB = b.priority ? PRIORITY_ORDER[b.priority as Priority] ?? 99 : 99
        if (pA !== pB) return pA - pB

        return 0
      })
      .slice(0, 3)
  }, [todos])

  // Habit toggle handler
  const handleToggleHabit = (habitId: string, currentDone: boolean) => {
    const matchingTodo = todos.find((t) => t.habit_id === habitId)
    if (matchingTodo) {
      toggleTodo.mutate({ id: matchingTodo.id, done: !currentDone })
    } else {
      toggleHabitLog.mutate({
        habitId,
        date: todayStr,
        completed: !currentDone,
      })
    }
  }

  // New user onboarding checklist (shown only until user has completed the 3 setup steps)
  const hasTask = allTasks.length > 0
  const hasHabit = habits.length > 0
  const hasDailyPlan = todos.length > 0
  const showOnboarding = !(hasTask && hasHabit && hasDailyPlan)

  return (
    <PageShell title="Home">
      <div className="pb-24 pt-4 px-1 sm:px-4 max-w-lg mx-auto space-y-6">
        {/* 1. Header: Greeting & Date */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {greeting}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {todayFormatted}
            </p>
          </div>
          <Link
            to="/settings"
            aria-label="Settings"
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Settings size={20} />
          </Link>
        </div>

        {/* 7. Quote or Last Week's Win line */}
        {showQuote && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <p className="truncate">
              {latestWin ? (
                <>
                  <span className="font-semibold">Last week&apos;s win:</span> &ldquo;{latestWin}&rdquo;
                </>
              ) : (
                <>
                  &ldquo;{quote.text}&rdquo;{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    — {quote.author}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {/* 2. Primary Action Card (P4-1 Focus hidden until shipped) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 text-white shadow-lg shadow-indigo-500/15">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/15 text-indigo-100 backdrop-blur-xs">
                Today&apos;s Command Center
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {totalTodosCount === 0
                  ? 'Plan Your Day'
                  : completedTodosCount === totalTodosCount
                    ? 'All Caught Up!'
                    : 'Execute Today&apos;s Plan'}
              </h2>
              <p className="text-xs text-indigo-150 text-indigo-100/90 max-w-xs">
                {totalTodosCount === 0
                  ? 'Start by planning your tasks and must-dos for today.'
                  : completedTodosCount === totalTodosCount
                    ? 'You have completed everything on your schedule today.'
                    : `${totalTodosCount - completedTodosCount} daily item${totalTodosCount - completedTodosCount === 1 ? '' : 's'} remaining to tackle.`}
              </p>
            </div>
            <Link
              to="/daily"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold text-sm shadow-sm hover:bg-indigo-50 active:scale-[0.98] transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span>{totalTodosCount === 0 ? 'Plan my day' : 'Go to Today'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* 4. Progress Ring & Chips */}
        <div className="space-y-3">
          {/* Progress Ring Card */}
          <Link
            to="/daily"
            aria-label="View Today's progress"
            className="flex items-center gap-5 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs hover:border-gray-200 dark:hover:border-gray-700 transition-colors group"
          >
            <div className="shrink-0">
              <ProgressRing
                completed={completedTodosCount}
                total={totalTodosCount}
                size={76}
                strokeWidth={7}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Today&apos;s Progress
                </h3>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {totalTodosCount === 0
                  ? 'No tasks planned yet'
                  : `${completedTodosCount} of ${totalTodosCount} items completed`}
              </p>
            </div>
          </Link>

          {/* 3 Clickable Chips */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Today Chip */}
            <Link
              to="/daily"
              className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                <Calendar size={14} />
                <span>Today</span>
              </div>
              <div className="mt-2 text-xl font-bold text-blue-800 dark:text-blue-200">
                {completedTodosCount}
                <span className="text-xs text-blue-500 dark:text-blue-400 font-normal">
                  /{totalTodosCount}
                </span>
              </div>
            </Link>

            {/* Habits Chip */}
            <Link
              to="/habits"
              className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={14} />
                <span>Habits</span>
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-800 dark:text-emerald-200">
                {habitsDoneCount}
                <span className="text-xs text-emerald-500 dark:text-emerald-400 font-normal">
                  /{habitsDueCount}
                </span>
              </div>
            </Link>

            {/* Overdue Chip */}
            <Link
              to="/vault?filter=overdue"
              className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 hover:bg-red-100/70 dark:hover:bg-red-900/50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                <AlertCircle size={14} />
                <span>Overdue</span>
              </div>
              <div className="mt-2 text-xl font-bold text-red-800 dark:text-red-200">
                {overdueTasks.length}
              </div>
            </Link>
          </div>
        </div>

        {/* 3. Next Up Section (Top 3 incomplete Today items, priority-sorted) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
              Next Up
            </h2>
            <Link
              to="/daily"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              View all
            </Link>
          </div>

          {nextUpItems.length > 0 ? (
            <div className="space-y-2">
              {nextUpItems.map((item) => {
                const priority = (item.priority as Priority) || 'medium'
                const pColor = PRIORITY_CONFIG[priority]?.color || '#eab308'

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 shadow-xs hover:border-gray-250 dark:hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox with optimistic toggle */}
                      <CheckboxRing
                        checked={item.done}
                        onChange={(checked) =>
                          toggleTodo.mutate({ id: item.id, done: checked })
                        }
                        priority={priority}
                        label={`Complete ${item.title}`}
                      />

                      {/* Title & metadata */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium text-gray-900 dark:text-white truncate ${
                              item.done ? 'line-through text-gray-400 dark:text-gray-500' : ''
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.must_do && (
                            <span
                              title="Must Do"
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80"
                            >
                              <Star size={10} className="fill-amber-400 text-amber-500" />
                              Must do
                            </span>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: pColor }}
                          />
                          <span className="capitalize">{priority}</span>

                          {item.tasks?.due_time && (
                            <span className="flex items-center gap-1 font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              <Clock size={10} />
                              {item.tasks.due_time.slice(0, 5)}
                            </span>
                          )}

                          {item.tasks?.estimate_min && (
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              {item.tasks.estimate_min}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/daily"
                      aria-label="View task on Today page"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {todos.some((t) => t.type !== 'habit' && t.done)
                  ? 'All tasks completed for today! 🎉'
                  : 'No tasks scheduled on today&apos;s list.'}
              </p>
              <Link
                to="/daily"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>Open Today</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* 5. Habits Due Today */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider text-xs">
              Habits Due Today
            </h2>
            <Link
              to="/habits"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              Manage
            </Link>
          </div>

          {dueHabits.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              {dueHabits.map((habit) => {
                const matchingTodo = todos.find((t) => t.habit_id === habit.id)
                const isDone = matchingTodo
                  ? matchingTodo.done
                  : habitLogs.some(
                      (l) => l.habit_id === habit.id && l.date === todayStr && l.completed
                    )

                return (
                  <button
                    key={habit.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={`Toggle habit: ${habit.name}`}
                    onClick={() => handleToggleHabit(habit.id, isDone)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border min-w-[76px] transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95 ${
                      isDone
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="relative mb-1.5 flex items-center justify-center text-xl">
                      <span>{habit.icon || '🎯'}</span>
                      {isDone && (
                        <span className="absolute -bottom-1 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium leading-tight truncate max-w-[68px]">
                      {habit.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {habits.length === 0
                  ? 'No habits created yet.'
                  : 'No habits scheduled for today.'}
              </p>
              <Link
                to="/habits"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <span>{habits.length === 0 ? 'Create your first habit' : 'View habit calendar'}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* 8. Empty state for new user: 3-step checklist (disappears once completed) */}
        {showOnboarding && (
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Getting Started with FocusOS
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  3 simple steps to take control of your day
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {[hasTask, hasHabit, hasDailyPlan].filter(Boolean).length}/3
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {/* Step 1: Add a task */}
              <Link
                to="/vault"
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      hasTask
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {hasTask ? <Check size={12} strokeWidth={3} /> : '1'}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      hasTask ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Add your first task
                  </span>
                </div>
                {!hasTask && (
                  <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                )}
              </Link>

              {/* Step 2: Add a habit */}
              <Link
                to="/habits"
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      hasHabit
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {hasHabit ? <Check size={12} strokeWidth={3} /> : '2'}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      hasHabit ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Create a daily habit
                  </span>
                </div>
                {!hasHabit && (
                  <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                )}
              </Link>

              {/* Step 3: Plan your day */}
              <Link
                to="/daily"
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      hasDailyPlan
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {hasDailyPlan ? <Check size={12} strokeWidth={3} /> : '3'}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      hasDailyPlan ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    Plan your day
                  </span>
                </div>
                {!hasDailyPlan && (
                  <ArrowRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                )}
              </Link>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
