import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { WeeklyReview } from '../../types'
import { useUpdateWeekly } from '../../hooks/useWeekly'

export function ReflectionForm({ review }: { review: WeeklyReview }) {
  const { mutate: updateWeekly } = useUpdateWeekly()
  
  const [wins, setWins] = useState(review.wins || '')
  const [blockers, setBlockers] = useState(review.blockers || '')
  const [nextPriorities, setNextPriorities] = useState(review.next_priorities || '')

  useEffect(() => {
    setWins(review.wins || '')
    setBlockers(review.blockers || '')
    setNextPriorities(review.next_priorities || '')
  }, [review])

  const handleBlur = (field: 'wins' | 'blockers' | 'nextPriorities', value: string) => {
    updateWeekly({ 
      weekStart: review.week_start,
      [field]: value 
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">🏆 Wins this week</label>
        <textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          onBlur={(e) => handleBlur('wins', e.target.value)}
          placeholder="What went well?"
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-base sm:text-sm p-3 focus:ring-2 focus:ring-brand-500 resize-none h-24 text-gray-900 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">🚧 Blockers</label>
        <textarea
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          onBlur={(e) => handleBlur('blockers', e.target.value)}
          placeholder="What held you back?"
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-base sm:text-sm p-3 focus:ring-2 focus:ring-brand-500 resize-none h-24 text-gray-900 dark:text-white"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">🎯 Next week's priorities</label>
        <textarea
          value={nextPriorities}
          onChange={(e) => setNextPriorities(e.target.value)}
          onBlur={(e) => handleBlur('nextPriorities', e.target.value)}
          placeholder="Top 3 things to focus on..."
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-base sm:text-sm p-3 focus:ring-2 focus:ring-brand-500 resize-none h-24 text-gray-900 dark:text-white"
        />
      </div>
    </motion.div>
  )
}
