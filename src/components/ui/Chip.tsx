import React from 'react'
import { cn } from '../../lib/cn'

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  icon?: React.ReactNode
  count?: number | string
}

export function Chip({
  active = false,
  icon,
  count,
  children,
  className,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        'min-h-[44px] shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 inline-flex items-center gap-1.5 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        active
          ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.97]',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
            active
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
