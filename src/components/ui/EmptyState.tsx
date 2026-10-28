import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const configs = {
  vault: {
    emoji: '📋',
    title: 'No tasks yet',
    body: 'Start by adding something you need to get done.',
    cta: 'Add your first task',
  },
  daily: {
    emoji: '☀️',
    title: "You're free today",
    body: 'No tasks pinned or due. Enjoy it — or add something.',
    cta: 'Add a task',
  },
  habits: {
    emoji: '🌱',
    title: 'No habits yet',
    body: 'Small daily actions compound into big results. Start one.',
    cta: 'Add a habit',
  },
  weekly: {
    emoji: '📆',
    title: 'Nothing to review',
    body: 'Complete some tasks this week and come back Sunday.',
    cta: null,
  },
}

export function EmptyState({
  variant,
  onAction,
  secondaryAction,
}: {
  variant: keyof typeof configs
  onAction?: () => void
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
}) {
  const c = configs[variant]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <motion.span
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="text-5xl mb-4 block select-none"
        role="img"
        aria-hidden="true"
      >
        {c.emoji}
      </motion.span>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{c.title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-[240px]">{c.body}</p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {c.cta && onAction && (
          <motion.button
            onClick={onAction}
            whileTap={{ scale: 0.96 }}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors shadow-sm shadow-brand-500/20"
          >
            {c.cta}
          </motion.button>
        )}

        {secondaryAction && (
          secondaryAction.href ? (
            <Link
              to={secondaryAction.href}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-sm font-medium transition-colors"
            >
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-sm font-medium transition-colors"
            >
              {secondaryAction.label}
            </button>
          )
        )}
      </div>
    </motion.div>
  )
}
