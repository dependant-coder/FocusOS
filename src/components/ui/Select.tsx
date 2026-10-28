import React, { forwardRef } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options?: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, id, className, children, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full min-h-[44px] rounded-xl border bg-gray-50 dark:bg-gray-800 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-colors pl-3.5 pr-10 py-2.5 appearance-none',
              'focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-200 dark:border-gray-700',
              className
            )}
            {...props}
          >
            {options
              ? options.map(opt => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="text-xs font-medium text-red-500">{error}</p>
        ) : hint ? (
          <p className="text-xs text-gray-400">{hint}</p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'
