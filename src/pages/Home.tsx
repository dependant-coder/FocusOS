import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useDailyTodos } from '../hooks/useDailyTodos'
import { useTasks } from '../hooks/useTasks'
import { DAILY_QUOTES } from '../lib/constants'
import PageShell from '../components/layout/PageShell'
import ProgressRing from '../components/daily/ProgressRing'
import { Link } from 'react-router-dom'
import { Calendar, Inbox, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

// Helper to get day of year for the quote
const getDayOfYear = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function Home() {
  const { user } = useAuth()
  const { data: todos = [] } = useDailyTodos()
  const { data: overdueTasks = [] } = useTasks({ overdue: true })

  // Fetch profile to get name
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

  // Date formatting
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  // Quote
  const quote = DAILY_QUOTES[getDayOfYear() % DAILY_QUOTES.length]

  // Stats
  const completedTodos = todos.filter(t => t.done)
  const progressPercent = todos.length === 0 ? 0 : Math.round((completedTodos.length / todos.length) * 100)
  const habitsDone = completedTodos.filter(t => t.type === 'habit').length

  const greeting = `Good morning, ${profile?.name?.split(' ')[0] || 'there'}`

  return (
    <PageShell title="Home">
      <div className="pb-24 pt-6 px-4 max-w-md mx-auto space-y-8">
        
        {/* Header section */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {greeting}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{todayDate}</p>
        </div>

        {/* Daily Quote Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex gap-2">
            <Sparkles className="w-5 h-5 text-indigo-200 shrink-0 mt-0.5" />
            <div>
              <p className="text-lg font-medium leading-tight mb-2">"{quote.text}"</p>
              <p className="text-sm text-indigo-200 font-medium">— {quote.author}</p>
            </div>
          </div>
        </div>

        {/* Action Ring row */}
        <div className="flex items-center gap-6 bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="shrink-0">
            <ProgressRing completed={completedTodos.length} total={todos.length} size={80} strokeWidth={8} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Today's Progress</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {completedTodos.length} of {todos.length} tasks completed
            </p>
          </div>
        </div>

        {/* Mini Stats Chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-semibold mb-1">
              <Calendar className="w-4 h-4" /> Today
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {todos.length}
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950/40 rounded-xl p-3 border border-green-100 dark:border-green-900">
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4" /> Habits
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {habitsDone}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-3 border border-red-100 dark:border-red-900">
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-sm font-semibold mb-1">
              <AlertCircle className="w-4 h-4" /> Overdue
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {overdueTasks.length}
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white px-1">Quick Access</h2>
          <div className="space-y-3">
            <Link to="/daily" className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Daily Command Center</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Execute today's plan</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link to="/vault" className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Inbox className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Master Task Vault</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage all your blocks</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link to="/habits" className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Habit Tracker</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Build consistency</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>

      </div>
    </PageShell>
  )
}
