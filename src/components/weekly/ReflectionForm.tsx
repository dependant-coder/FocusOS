import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WeeklyReviewWithLive } from '../../hooks/useWeekly'
import { useUpdateWeekly, usePlanNextWeek } from '../../hooks/useWeekly'
import { addDaysLocal, formatShortDate } from '../../lib/dates'
import { Check, CalendarPlus, Loader2 } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'

export function ReflectionForm({ review }: { review: WeeklyReviewWithLive }) {
  const { mutate: updateWeekly, isPending: isSaving } = useUpdateWeekly()
  const planNextWeek = usePlanNextWeek()

  const [wins, setWins] = useState(review.wins || '')
  const [blockers, setBlockers] = useState(review.blockers || '')
  const [nextPriorities, setNextPriorities] = useState(review.next_priorities || '')
  const [showSavedIndicator, setShowSavedIndicator] = useState(false)

  // Plan next week sheet state
  const [showPlanSheet, setShowPlanSheet] = useState(false)
  const [planItems, setPlanItems] = useState<{ id: string; title: string; selected: boolean }[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasPendingSaveRef = useRef(false)
  const currentWeekStartRef = useRef(review.week_start)

  const latestValuesRef = useRef({
    weekStart: review.week_start,
    wins: review.wins || '',
    blockers: review.blockers || '',
    nextPriorities: review.next_priorities || '',
  })

  // Flush any pending debounced save immediately
  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (hasPendingSaveRef.current) {
      hasPendingSaveRef.current = false
      const current = latestValuesRef.current
      updateWeekly(
        {
          weekStart: current.weekStart,
          wins: current.wins,
          blockers: current.blockers,
          nextPriorities: current.nextPriorities,
        },
        {
          onSuccess: () => {
            setShowSavedIndicator(true)
            setTimeout(() => setShowSavedIndicator(false), 2500)
          },
        }
      )
    }
  }, [updateWeekly])

  // Sync state only when week_start changes (do NOT include review.wins/blockers/next_priorities)
  useEffect(() => {
    if (currentWeekStartRef.current !== review.week_start) {
      flushSave()
      currentWeekStartRef.current = review.week_start
      setWins(review.wins || '')
      setBlockers(review.blockers || '')
      setNextPriorities(review.next_priorities || '')
      latestValuesRef.current = {
        weekStart: review.week_start,
        wins: review.wins || '',
        blockers: review.blockers || '',
        nextPriorities: review.next_priorities || '',
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.week_start, flushSave])

  // Keep latestValuesRef up to date with state outside of render
  useEffect(() => {
    latestValuesRef.current = {
      weekStart: currentWeekStartRef.current,
      wins,
      blockers,
      nextPriorities,
    }
  }, [wins, blockers, nextPriorities])

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      flushSave()
    }
  }, [flushSave])

  // Debounced auto-save handler (500ms)
  const triggerSave = (w: string, b: string, p: string) => {
    hasPendingSaveRef.current = true
    latestValuesRef.current = {
      weekStart: currentWeekStartRef.current,
      wins: w,
      blockers: b,
      nextPriorities: p,
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      flushSave()
    }, 500)
  }

  const handleWinsChange = (val: string) => {
    setWins(val)
    latestValuesRef.current.wins = val
    triggerSave(val, blockers, nextPriorities)
  }

  const handleBlockersChange = (val: string) => {
    setBlockers(val)
    latestValuesRef.current.blockers = val
    triggerSave(wins, val, nextPriorities)
  }

  const handleNextPrioritiesChange = (val: string) => {
    setNextPriorities(val)
    latestValuesRef.current.nextPriorities = val
    triggerSave(wins, blockers, val)
  }

  // Parse next_priorities into line items for "Plan Next Week"
  const handleOpenPlanNextWeek = () => {
    const lines = nextPriorities
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''))
      .filter((l) => l.length > 0)

    if (lines.length === 0) {
      setPlanItems([{ id: '1', title: 'Plan my week', selected: true }])
    } else {
      setPlanItems(lines.map((text, idx) => ({ id: String(idx), title: text, selected: true })))
    }
    setShowPlanSheet(true)
  }

  const handleCreatePlanTasks = () => {
    const selected = planItems.filter((i) => i.selected).map((i) => i.title)
    if (selected.length === 0) return

    const nextMonday = addDaysLocal(review.week_start, 7)
    planNextWeek.mutate(
      { items: selected, nextMonday },
      {
        onSuccess: () => {
          setShowPlanSheet(false)
        },
      }
    )
  }

  const nextMondayDate = addDaysLocal(review.week_start, 7)

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {/* Header with Autosave status */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Weekly Reflection
          </h3>
          <div className="flex items-center gap-2 h-5">
            <AnimatePresence>
              {isSaving ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-gray-400"
                >
                  <Loader2 size={12} className="animate-spin text-indigo-500" />
                  <span>Saving...</span>
                </motion.div>
              ) : showSavedIndicator ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                >
                  <Check size={13} />
                  <span>Saved</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* Wins */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <label
            htmlFor="wins-input"
            className="block text-sm font-semibold text-gray-900 dark:text-white mb-2"
          >
            🏆 Wins this week
          </label>
          <textarea
            id="wins-input"
            value={wins}
            onChange={(e) => handleWinsChange(e.target.value)}
            onBlur={flushSave}
            placeholder="What went well? Big milestones, good habits, wins..."
            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none h-24 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {/* Blockers */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <label
            htmlFor="blockers-input"
            className="block text-sm font-semibold text-gray-900 dark:text-white mb-2"
          >
            🚧 Blockers &amp; Friction
          </label>
          <textarea
            id="blockers-input"
            value={blockers}
            onChange={(e) => handleBlockersChange(e.target.value)}
            onBlur={flushSave}
            placeholder="What held you back? Distractions, unrealistic estimates, unexpected events..."
            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none h-24 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>

        {/* Next priorities */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="priorities-input"
              className="block text-sm font-semibold text-gray-900 dark:text-white"
            >
              🎯 Next week&apos;s priorities
            </label>
            <button
              type="button"
              onClick={handleOpenPlanNextWeek}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <CalendarPlus size={13} />
              <span>Plan next week</span>
            </button>
          </div>
          <textarea
            id="priorities-input"
            value={nextPriorities}
            onChange={(e) => handleNextPrioritiesChange(e.target.value)}
            onBlur={flushSave}
            placeholder="List your top priorities for next week (one per line)..."
            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none h-24 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
      </motion.div>

      {/* Plan Next Week Bottom Sheet */}
      <BottomSheet
        open={showPlanSheet}
        onClose={() => setShowPlanSheet(false)}
        title="Plan Next Week"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Select items from your reflection to turn into tasks due next Monday (
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {formatShortDate(nextMondayDate)}
            </span>
            ):
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto py-1">
            {planItems.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-gray-100/50 dark:hover:bg-gray-800/70 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={(e) =>
                    setPlanItems((prev) =>
                      prev.map((i) => (i.id === item.id ? { ...i, selected: e.target.checked } : i))
                    )
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                  {item.title}
                </span>
              </label>
            ))}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPlanSheet(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreatePlanTasks}
              disabled={planNextWeek.isPending || !planItems.some((i) => i.selected)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-xs inline-flex items-center justify-center gap-1.5"
            >
              {planNextWeek.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>
                  Create {planItems.filter((i) => i.selected).length} Task
                  {planItems.filter((i) => i.selected).length === 1 ? '' : 's'}
                </span>
              )}
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
