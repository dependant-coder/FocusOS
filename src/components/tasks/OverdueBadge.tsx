import { motion } from 'framer-motion'

export function OverdueBadge() {
  return (
    <span className="relative inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full">
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-red-500"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      Overdue
    </span>
  )
}
