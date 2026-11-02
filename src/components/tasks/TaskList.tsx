import type { Task } from '../../types'
import TaskCard from './TaskCard'
import { EmptyState } from '../ui/EmptyState'

interface TaskListProps {
  tasks: Task[]
  onPin: (id: string, pinned: boolean) => void
  onTap: (task: Task) => void
  onToggleComplete?: (task: Task) => void
  isPinning?: boolean
  onAddFirst?: () => void
  // Bulk selection props
  isSelectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (taskId: string) => void
}

export default function TaskList({
  tasks,
  onPin,
  onTap,
  onToggleComplete,
  isPinning,
  onAddFirst,
  isSelectionMode,
  selectedIds,
  onToggleSelect,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        variant="vault"
        onAction={onAddFirst}
      />
    )
  }

  return (
    <div className="space-y-3 px-4 py-3">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onPin={onPin}
          onTap={onTap}
          onToggleComplete={onToggleComplete}
          isPinning={isPinning}
          isSelectionMode={isSelectionMode}
          isSelected={selectedIds?.has(task.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  )
}
