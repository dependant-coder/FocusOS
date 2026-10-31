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
    ['#ef4444', '#dc2626', 'transparent', '#16a34a', '#22c55e']
  )
  const leftOpacity = useTransform(x, [0, 50], [0, 1])
  const rightOpacity = useTransform(x, [-50, 0], [1, 0])

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (info.offset.x > 72 || info.velocity.x > 400) {
      onComplete()
    } else if (info.offset.x < -72 || info.velocity.x < -400) {
      onDelete()
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      {/* Background action layer */}
      <motion.div
        className="absolute inset-0 flex items-center justify-between px-5 pointer-events-none rounded-xl"
        style={{ background }}
      >
        <motion.div style={{ opacity: leftOpacity }} aria-hidden="true">
          <Check className="text-white w-5 h-5" strokeWidth={3} />
        </motion.div>
        <motion.div style={{ opacity: rightOpacity }} aria-hidden="true">
          <Trash2 className="text-white w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragSnapToOrigin
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-white dark:bg-gray-900 cursor-grab active:cursor-grabbing rounded-xl"
        whileTap={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  )
}
