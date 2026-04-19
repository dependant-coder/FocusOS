import type { Task } from '../../types'
import TaskCard from './TaskCard'
import EmptyState from '../ui/EmptyState'
import { PackageOpen } from 'lucide-react'

interface TaskListProps {
  tasks: Task[]
  onPin: (id: string, pinned: boolean) => void
  onTap: (task: Task) => void
  isPinning?: boolean
  onAddFirst?: () => void
}

export default function TaskList({ tasks, onPin, onTap, isPinning, onAddFirst }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="No tasks yet"
        description="Your master vault is empty. Add your first task to get started!"
        actionLabel="Add Task"
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
          isPinning={isPinning}
        />
      ))}
    </div>
  )
}
