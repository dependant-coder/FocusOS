import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../components/layout/PageShell'
import { useWeekly } from '../hooks/useWeekly'
import { WeekSummaryCard } from '../components/weekly/WeekSummaryCard'
import { ReflectionForm } from '../components/weekly/ReflectionForm'
import { format, startOfWeek, subWeeks, addWeeks } from 'date-fns'

import { Link } from 'react-router-dom'
import { LineChart } from 'lucide-react'

export default function Weekly() {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Calculate the Monday of the selected week
  const weekStart = useMemo(() => {
    return format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  }, [currentDate])

  const { data: review, isLoading } = useWeekly(weekStart)

  const handlePrevWeek = () => setCurrentDate(prev => subWeeks(prev, 1))
  const handleNextWeek = () => setCurrentDate(prev => addWeeks(prev, 1))
  
  // Disable next week if it's in the future
  const isNextDisabled = startOfWeek(currentDate, { weekStartsOn: 1 }) >= startOfWeek(new Date(), { weekStartsOn: 1 })

  return (
    <PageShell title="Weekly">
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Review</h1>
            <Link 
              to="/analytics" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
            >
              <LineChart size={16} />
              Analytics
            </Link>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
            <button 
              onClick={handlePrevWeek}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-white px-2">
              {format(new Date(weekStart), 'MMM d, yyyy')}
            </span>
            <button 
              onClick={handleNextWeek}
              disabled={isNextDisabled}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          </div>
        ) : !review ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data for this week</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              Keep tracking your daily tasks. Your weekly review will be generated automatically at the end of the week.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={weekStart}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <WeekSummaryCard review={review} />
              <ReflectionForm review={review} />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </PageShell>
  )
}
