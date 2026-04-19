import type { Priority } from '../../types'
import { PRIORITY_CONFIG } from '../../lib/constants'

interface PriorityBadgeProps {
  priority: Priority
  size?: 'sm' | 'md'
}

export default function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${sizeClasses}`}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  )
}
