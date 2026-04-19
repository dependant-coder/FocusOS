import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
  label?: string
}

export default function FAB({ onClick, label = 'Add' }: FABProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      aria-label={label}
      className="
        fixed bottom-24 right-5 z-30
        w-14 h-14 rounded-2xl
        bg-gradient-to-br from-indigo-500 to-purple-600
        text-white shadow-lg shadow-indigo-500/30
        flex items-center justify-center
        active:shadow-md transition-shadow
        hover:shadow-xl hover:shadow-indigo-500/40
      "
    >
      <Plus size={28} strokeWidth={2.5} />
    </motion.button>
  )
}
