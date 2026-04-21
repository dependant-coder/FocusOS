import { motion } from 'framer-motion'

const greetings = ['morning', 'afternoon', 'evening']

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return greetings[0]
  if (h < 17) return greetings[1]
  return greetings[2]
}

export function MorningBanner({ name, taskCount }: { name: string; taskCount: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35 }}
      className="px-4 pt-5 pb-4"
    >
      <p className="text-2xl font-semibold text-gray-900 dark:text-white truncate">
        Good {getGreeting()}, {name.split(' ')[0]} 👋
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
        {taskCount === 0
          ? 'No tasks yet — clean slate. Add something.'
          : `You have ${taskCount} thing${taskCount > 1 ? 's' : ''} to tackle today.`}
      </p>
    </motion.div>
  )
}
