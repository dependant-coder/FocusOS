import React from 'react'
import { cn } from '../../lib/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'outline'
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default:
      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    brand:
      'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60',
    success:
      'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border border-green-200/60 dark:border-green-800/60',
    warning:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60',
    danger:
      'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/60 dark:border-red-800/60',
    outline:
      'bg-transparent border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
  }

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full shrink-0 select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
