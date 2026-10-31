interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md'
  'aria-label'?: string
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
  'aria-label': ariaLabel,
}: ToggleProps) {
  const trackSize = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6'
  const dotSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  const dotTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-5'
  const dotOffset = 'translate-x-0.5'

  return (
    <label
      className={`inline-flex items-center gap-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || 'Toggle switch'}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex items-center shrink-0 rounded-full transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900
          ${trackSize}
          ${
            checked
              ? 'bg-indigo-600 dark:bg-indigo-500'
              : 'bg-gray-200 dark:bg-gray-700'
          }
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-xs ring-0 transition-transform duration-200 ease-in-out
            ${dotSize}
            ${checked ? dotTranslate : dotOffset}
          `}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
          {label}
        </span>
      )}
    </label>
  )
}
