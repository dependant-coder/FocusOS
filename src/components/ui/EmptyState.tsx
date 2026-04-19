import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
        <Icon size={40} className="text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-indigo-500/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
