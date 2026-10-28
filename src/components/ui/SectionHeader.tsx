import React from 'react'
import { cn } from '../../lib/cn'

export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
}

export function SectionHeader({
  title,
  icon,
  badge,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-2 mb-3 px-0.5', className)}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="shrink-0">{icon}</span>}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
          {title}
        </h3>
        {badge}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
