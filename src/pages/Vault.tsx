import { useState } from 'react'
import PageShell from '../components/layout/PageShell'
import TaskList from '../components/tasks/TaskList'
import TaskForm, { type TaskFormData } from '../components/tasks/TaskForm'
import BottomSheet from '../components/ui/BottomSheet'
import FAB from '../components/ui/FAB'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, usePinTask } from '../hooks/useTasks'
import type { Task, TaskFilters, SortField } from '../types'
import { PRIORITY_ORDER } from '../lib/constants'
import { Layers, GraduationCap, Brain, Lightbulb, AlertCircle, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const FILTER_PILLS: { label: string; icon: LucideIcon; value: Partial<TaskFilters> }[] = [
  { label: 'All', icon: Layers, value: {} },
  { label: 'College', icon: GraduationCap, value: { category: 'college' } },
  { label: 'Personal', icon: Brain, value: { category: 'personal' } },
  { label: 'Skill', icon: Lightbulb, value: { category: 'skill' } },
  { label: 'Overdue', icon: AlertCircle, value: { overdue: true } },
]

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: 'Priority', value: 'priority' },
  { label: 'Due Date', value: 'due_date' },
  { label: 'Created', value: 'created_at' },
]

export default function Vault() {
  const [filters, setFilters] = useState<TaskFilters>({})
  const [sortBy, setSortBy] = useState<SortField>('priority')
  const [activeFilter, setActiveFilter] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { data: tasks = [], isLoading } = useTasks(filters)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const pinTask = usePinTask()

  // Client-side sort
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99
      const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99
      return pa - pb
    }
    if (sortBy === 'due_date') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    }
    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })

  const handleFilterChange = (index: number) => {
    setActiveFilter(index)
    setFilters(FILTER_PILLS[index].value as TaskFilters)
  }

  const handleCreateTask = (data: TaskFormData) => {
    createTask.mutate(
      {
        title: data.title,
        category: data.category,
        priority: data.priority,
        due_date: data.due_date || null,
        description: data.description || null,
        resources_url: data.resources_url || null,
        energy_level: data.energy_level || null,
        pin_to_today: data.pin_to_today,
      },
      {
        onSuccess: () => {
          setIsFormOpen(false)
        },
      }
    )
  }

  const handleUpdateTask = (data: TaskFormData) => {
    if (!editingTask) return
    updateTask.mutate(
      {
        id: editingTask.id,
        title: data.title,
        category: data.category,
        priority: data.priority,
        due_date: data.due_date || null,
        description: data.description || null,
        resources_url: data.resources_url || null,
        energy_level: data.energy_level || null,
        pin_to_today: data.pin_to_today,
      },
      {
        onSuccess: () => {
          setEditingTask(null)
        },
      }
    )
  }

  const handleDelete = () => {
    if (!editingTask) return
    if (window.confirm('Delete this task?')) {
      deleteTask.mutate(editingTask.id, {
        onSuccess: () => setEditingTask(null),
      })
    }
  }

  return (
    <PageShell title="Task Vault">
      {/* Filter pills */}
      <div className="sticky top-14 z-10 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {FILTER_PILLS.map((pill, i) => (
            <button
              key={i}
              onClick={() => handleFilterChange(i)}
              className={`
                shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1
                ${activeFilter === i
                  ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/25'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }
              `}
            >
              <pill.icon size={14} className="shrink-0" />
              {pill.label}
            </button>
          ))}
        </div>

        {/* Sort row */}
        <div className="flex items-center gap-2 px-4 pb-2.5">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`
                text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors
                ${sortBy === opt.value
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 font-medium">
            {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3 px-4 py-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-gray-900 rounded-xl h-24 border-l-4 border-gray-200 dark:border-gray-700" />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={sortedTasks}
          onPin={(id, pinned) => pinTask.mutate({ id, pinned })}
          onTap={(task) => setEditingTask(task)}
          isPinning={pinTask.isPending}
          onAddFirst={() => setIsFormOpen(true)}
        />
      )}

      {/* FAB */}
      <FAB onClick={() => setIsFormOpen(true)} label="Add Task" />

      {/* Create form */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="New Task"
      >
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setIsFormOpen(false)}
          isSubmitting={createTask.isPending}
        />
      </BottomSheet>

      {/* Edit form */}
      <BottomSheet
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <div>
            <TaskForm
              initialData={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
              isSubmitting={updateTask.isPending}
            />
            <button
              onClick={handleDelete}
              disabled={deleteTask.isPending}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            >
              {deleteTask.isPending ? 'Deleting...' : <span className="inline-flex items-center gap-1.5"><Trash2 size={14} /> Delete Task</span>}
            </button>
          </div>
        )}
      </BottomSheet>
    </PageShell>
  )
}
