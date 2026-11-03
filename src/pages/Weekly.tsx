import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageShell from '../components/layout/PageShell'
import { useWeekly } from '../hooks/useWeekly'
import { WeekSummaryCard } from '../components/weekly/WeekSummaryCard'
import { ReflectionForm } from '../components/weekly/ReflectionForm'
import { EmptyState } from '../components/ui/EmptyState'
import {
  todayLocal,
  startOfWeekLocal,
  addDaysLocal,
  parseLocalDate,
  format,
} from '../lib/dates'
import { Link } from 'react-router-dom'
import { LineChart, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

export default function Weekly() {
  const currentLocalMonday = useMemo(() => startOfWeekLocal(todayLocal()), [])
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(currentLocalMonday)

  const { data: review, isLoading } = useWeekly(selectedWeekStart)

  const handlePrevWeek = () => {
    setSelectedWeekStart((prev) => addDaysLocal(prev, -7))
  }

  const handleNextWeek = () => {
    if (selectedWeekStart < currentLocalMonday) {
      setSelectedWeekStart((prev) => addDaysLocal(prev, 7))
    }
  }

  const handleThisWeekJump = () => {
    setSelectedWeekStart(currentLocalMonday)
  }

  const isCurrentWeek = selectedWeekStart === currentLocalMonday
  const isNextDisabled = selectedWeekStart >= currentLocalMonday

  // Swipe detection for mobile week navigation
  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null

    // Threshold of 60px
    if (diff > 60) {
      handlePrevWeek()
    } else if (diff < -60 && !isNextDisabled) {
      handleNextWeek()
    }
  }

  const formattedWeekLabel = useMemo(() => {
    const d = parseLocalDate(selectedWeekStart)
    return format(d, 'MMM d, yyyy')
  }, [selectedWeekStart])

  return (
    <PageShell title="Weekly">
      <div
        className="max-w-2xl mx-auto space-y-6 pb-24 px-1 sm:px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Review</h1>
            <Link
              to="/analytics"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
            >
              <LineChart size={14} />
              <span>Analytics</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={handleThisWeekJump}
                aria-label="Jump to this week"
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors inline-flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>This week</span>
              </button>
            )}

            <div className="flex items-center bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-800 shadow-2xs">
              <button
                type="button"
                onClick={handlePrevWeek}
                aria-label="Previous week"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 tabular-nums select-none min-w-[95px] text-center">
                {formattedWeekLabel}
              </span>
              <button
                type="button"
                onClick={handleNextWeek}
                disabled={isNextDisabled}
                aria-label="Next week"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-44 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
            <div className="h-32 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
            <div className="h-32 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse" />
          </div>
        ) : !review ? (
          <EmptyState variant="weekly" />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedWeekStart}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
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
