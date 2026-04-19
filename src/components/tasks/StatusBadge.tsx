import type { TaskStatus } from '../../types'

const STATUS_MAP: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', color: '#64748b', bg: '#f1f5f9' },
  in_progress: { label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  done: { label: 'Done', color: '#22c55e', bg: '#f0fdf4' },
}

interface StatusBadgeProps {
  status: TaskStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_MAP[status]

  return (
    <span
      className="inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5"
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}25`,
      }}
    >
      {status === 'done' && '✓ '}
      {config.label}
    </span>
  )
}
