import type { Category } from '../../types'
import { CATEGORY_CONFIG } from '../../lib/constants'
import { GraduationCap, Brain, Lightbulb } from 'lucide-react'

const ICON_MAP = {
  'graduation-cap': GraduationCap,
  'brain': Brain,
  'lightbulb': Lightbulb,
} as const

interface CategoryBadgeProps {
  category: Category
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'sm' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  const iconSize = size === 'sm' ? 10 : 12
  const IconComponent = ICON_MAP[config.icon]

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${sizeClasses}`}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color,
        border: `1px solid ${config.color}25`,
      }}
    >
      <IconComponent size={iconSize} /> {config.label}
    </span>
  )
}
