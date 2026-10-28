import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Check, Trash2 } from 'lucide-react'

interface SwipeableItemProps {
  onComplete: () => void
  onDelete: () => void
  children: React.ReactNode
}

export function SwipeableItem({ onComplete, onDelete, children }: SwipeableItemProps) {
  const x = useMotionValue(0)
  const background = useTransform(
    x,
    [-80, -20, 0, 20, 80],
    ['#ef4444', '#fca5a5', '#ffffff', '#bbf7d0', '#22c55e']
  )
  const leftOpacity  = useTransform(x, [0, 60], [0, 1])
  const rightOpacity = useTransform(x, [-60, 0], [1, 0])

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 72)       onComplete()
    else if (info.offset.x < -72) onDelete()
  }

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      {/* Background action layer */}
      <motion.div
        className="absolute inset-0 flex items-center justify-between px-5"
        style={{ background }}
      >
        <motion.div style={{ opacity: leftOpacity }}>
          <Check className="text-white w-5 h-5" />
        </motion.div>
        <motion.div style={{ opacity: rightOpacity }}>
          <Trash2 className="text-white w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  )
}
