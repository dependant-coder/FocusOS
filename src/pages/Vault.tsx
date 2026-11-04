import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageShell from '../components/layout/PageShell'
import TaskCard from '../components/tasks/TaskCard'
import TaskForm, { type TaskFormData } from '../components/tasks/TaskForm'
import BottomSheet from '../components/ui/BottomSheet'
import FAB from '../components/ui/FAB'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  usePinTask,
  useToggleTaskComplete,
  useBulkCompleteTasks,
  useBulkPinTasks,
  useBulkSetPriority,
  useBulkDeleteTasks,
} from '../hooks/useTasks'
import type { Task, Priority } from '../types'
import { PRIORITY_ORDER } from '../lib/constants'
import { todayLocal, endOfWeekLocal } from '../lib/dates'
import { showUndo } from '../lib/undo'
import { safeStorage } from '../lib/safeStorage'
import { VaultSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import {
  Search,
  X,
  Layers,
  GraduationCap,
  Brain,
  Lightbulb,
  AlertCircle,
  Pin,
  Trash2,
  CheckCircle2,
  CheckSquare,
  ArrowUpDown,
  Filter,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type StatusFilter = 'active' | 'done' | 'all'
type CategoryFilter = 'all' | 'college' | 'personal' | 'skill' | 'overdue' | 'pinned'
type SortBy = 'priority' | 'due_date' | 'created_at'
type GroupBy = 'none' | 'due'

interface VaultPreferences {
  status: StatusFilter
  category: CategoryFilter
  sortBy: SortBy
  groupBy: GroupBy
}

const STORAGE_KEY = 'focusos_vault_prefs'

const DEFAULT_PREFS: VaultPreferences = {
  status: 'active',
  category: 'all',
  sortBy: 'priority',
  groupBy: 'none',
}

const BASE_CATEGORIES: CategoryFilter[] = ['all', 'college', 'personal', 'skill']

function loadSavedPrefs(): VaultPreferences {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw) as Partial<VaultPreferences>
    return {
      status: parsed.status || DEFAULT_PREFS.status,
      category: BASE_CATEGORIES.includes(parsed.category as CategoryFilter)
        ? (parsed.category as CategoryFilter)
        : DEFAULT_PREFS.category,
      sortBy: parsed.sortBy || DEFAULT_PREFS.sortBy,
      groupBy: parsed.groupBy || DEFAULT_PREFS.groupBy,
    }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

const FILTER_PILLS: { label: string; icon: LucideIcon; key: CategoryFilter }[] = [
  { label: 'All', icon: Layers, key: 'all' },
  { label: 'College', icon: GraduationCap, key: 'college' },
  { label: 'Personal', icon: Brain, key: 'personal' },
  { label: 'Skill', icon: Lightbulb, key: 'skill' },
  { label: 'Overdue', icon: AlertCircle, key: 'overdue' },
  { label: 'Pinned', icon: Pin, key: 'pinned' },
]

export default function Vault() {
  const [searchParams] = useSearchParams()
  const urlFilter = searchParams.get('filter') // 'overdue' | 'today' | 'pinned'

  const initialPrefs = useMemo(() => {
    const p = { ...loadSavedPrefs() }
    if (urlFilter === 'overdue') p.category = 'overdue'
    else if (urlFilter === 'pinned') p.category = 'pinned'
    return p
  }, [urlFilter])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialPrefs.status)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(initialPrefs.category)
  const [sortBy, setSortBy] = useState<SortBy>(initialPrefs.sortBy)
  const [groupBy, setGroupBy] = useState<GroupBy>(initialPrefs.groupBy)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Bulk selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)

  const qc = useQueryClient()
  const { data: rawTasks = [], isLoading } = useTasks({
    includeDone: statusFilter === 'done' || statusFilter === 'all',
    status: statusFilter === 'done' ? 'done' : undefined,
  })
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const pinTask = usePinTask()
  const toggleComplete = useToggleTaskComplete()
  const bulkComplete = useBulkCompleteTasks()
  const bulkPin = useBulkPinTasks()
  const bulkSetPriority = useBulkSetPriority()
  const bulkDelete = useBulkDeleteTasks()

  // Sync URL param if changed
  useEffect(() => {
    if (urlFilter === 'overdue') {
      setCategoryFilter('overdue')
    } else if (urlFilter === 'pinned') {
      setCategoryFilter('pinned')
    }
  }, [urlFilter])

  // Save prefs to localStorage on change
  useEffect(() => {
    try {
      const prefs: VaultPreferences = {
        status: statusFilter,
        category: categoryFilter,
        sortBy,
        groupBy,
      }
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
      // Safe fallback
    }
  }, [statusFilter, categoryFilter, sortBy, groupBy])

  // Filter tasks client-side
  const filteredTasks = useMemo(() => {
    const todayStr = todayLocal()

    return rawTasks.filter((task) => {
      // 1. Status filter
      if (statusFilter === 'active' && task.status === 'done') return false
      if (statusFilter === 'done' && task.status !== 'done') return false

      // 2. Category / Pill filter
      if (categoryFilter === 'college' && task.category !== 'college') return false
      if (categoryFilter === 'personal' && task.category !== 'personal') return false
      if (categoryFilter === 'skill' && task.category !== 'skill') return false
      if (categoryFilter === 'overdue' && (!task.is_overdue || task.status === 'done')) return false
      if (categoryFilter === 'pinned' && !task.pin_to_today) return false

      // URL param filter for 'today'
      if (urlFilter === 'today') {
        const isToday = task.due_date === todayStr || task.pin_to_today
        if (!isToday) return false
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesTitle = task.title.toLowerCase().includes(query)
        const matchesDesc = task.description?.toLowerCase().includes(query) ?? false
        const matchesCategory = task.category?.toLowerCase().includes(query) ?? false
        if (!matchesTitle && !matchesDesc && !matchesCategory) return false
      }

      return true
    })
  }, [rawTasks, statusFilter, categoryFilter, urlFilter, searchQuery])

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const pa = PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 99
        const pb = PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 99
        if (pa !== pb) return pa - pb
        // Secondary sort: due date
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      }
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
  }, [filteredTasks, sortBy])

  // Grouped tasks by Due Date
  const groupedTasks = useMemo(() => {
    if (groupBy !== 'due') return null

    const todayStr = todayLocal()
    const endOfWeekStr = endOfWeekLocal(todayStr)

    const groups: {
      overdue: Task[]
      today: Task[]
      thisWeek: Task[]
      later: Task[]
      noDate: Task[]
    } = {
      overdue: [],
      today: [],
      thisWeek: [],
      later: [],
      noDate: [],
    }

    sortedTasks.forEach((task) => {
      if (task.is_overdue && task.status !== 'done') {
        groups.overdue.push(task)
      } else if (task.due_date === todayStr) {
        groups.today.push(task)
      } else if (task.due_date && task.due_date > todayStr && task.due_date <= endOfWeekStr) {
        groups.thisWeek.push(task)
      } else if (task.due_date && task.due_date > endOfWeekStr) {
        groups.later.push(task)
      } else {
        groups.noDate.push(task)
      }
    })

    return groups
  }, [sortedTasks, groupBy])

  const handleCreateTask = (data: TaskFormData) => {
    createTask.mutate(
      {
        title: data.title,
        category: data.category,
        priority: data.priority,
        due_date: data.due_date,
        due_time: data.due_time,
        estimate_min: data.estimate_min,
        status: data.status,
        completed_at: data.status === 'done' ? new Date().toISOString() : null,
        description: data.description,
        resources_url: data.resources_url,
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
        due_date: data.due_date,
        due_time: data.due_time,
        estimate_min: data.estimate_min,
        status: data.status,
        completed_at: data.status === 'done' ? new Date().toISOString() : null,
        description: data.description,
        resources_url: data.resources_url,
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

  // Delete task with showUndo
  const handleDeleteTask = (task: Task) => {
    setEditingTask(null)

    // Optimistically remove from React Query tasks cache
    qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
      old ? old.filter((t) => t.id !== task.id) : []
    )

    showUndo({
      message: `Deleted "${task.title}"`,
      onUndo: () => {
        // Restore task to cache
        qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
          if (!old) return [task]
          if (old.some((t) => t.id === task.id)) return old
          return [...old, task]
        })
      },
      onCommit: () => {
        deleteTask.mutate(task.id)
      },
      ms: 5000,
    })
  }

  // Toggle complete on a single task
  const handleToggleComplete = (task: Task) => {
    const nextDone = task.status !== 'done'
    toggleComplete.mutate({ id: task.id, done: nextDone })
  }

  // Bulk selection handlers
  const handleToggleSelect = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === sortedTasks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedTasks.map((t) => t.id)))
    }
  }

  const handleBulkComplete = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    bulkComplete.mutate(ids, {
      onSuccess: () => {
        setSelectedIds(new Set())
        setIsSelectionMode(false)
      },
    })
  }

  const handleBulkPin = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    bulkPin.mutate(ids, {
      onSuccess: () => {
        setSelectedIds(new Set())
        setIsSelectionMode(false)
      },
    })
  }

  const handleBulkSetPriority = (priority: Priority) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    bulkSetPriority.mutate(
      { ids, priority },
      {
        onSuccess: () => {
          setShowPriorityPicker(false)
          setSelectedIds(new Set())
          setIsSelectionMode(false)
        },
      }
    )
  }

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    const count = ids.length
    const deletedTasks = rawTasks.filter((t) => ids.includes(t.id))

    // Optimistically remove from cache
    qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) =>
      old ? old.filter((t) => !ids.includes(t.id)) : []
    )

    setSelectedIds(new Set())
    setIsSelectionMode(false)

    showUndo({
      message: `Deleted ${count} task${count > 1 ? 's' : ''}`,
      onUndo: () => {
        qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (old) => {
          if (!old) return deletedTasks
          const existingIds = new Set(old.map((t) => t.id))
          const toAdd = deletedTasks.filter((t) => !existingIds.has(t.id))
          return [...old, ...toAdd]
        })
      },
      onCommit: () => {
        bulkDelete.mutate(ids)
      },
      ms: 5000,
    })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('active')
    setCategoryFilter('all')
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'active' ||
    categoryFilter !== 'all' ||
    Boolean(urlFilter)

  return (
    <PageShell title="Task Vault">
      {/* Header Sticky Bar */}
      <div className="sticky top-14 z-10 bg-gray-50/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        {/* Search input bar */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by title, note, category..."
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Status segmented control & Category filter pills */}
        <div className="px-4 pb-2 space-y-2">
          {/* Status segmented control: Active | Done | All */}
          <div className="flex items-center justify-between gap-3">
            <div role="tablist" aria-label="Task status filter" className="inline-flex p-1 bg-gray-200/60 dark:bg-gray-800/60 rounded-xl text-xs font-medium">
              {(['active', 'done', 'all'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  aria-label={`Status: ${st}`}
                  onClick={() => setStatusFilter(st)}
                  className={`
                    px-3 py-1 rounded-lg capitalize transition-all
                    ${statusFilter === st
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Select mode toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode)
                setSelectedIds(new Set())
              }}
              className={`
                px-2.5 py-1 text-xs font-medium rounded-lg border transition-all inline-flex items-center gap-1.5
                ${isSelectionMode
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }
              `}
            >
              <CheckSquare size={13} />
              <span>{isSelectionMode ? 'Cancel' : 'Select'}</span>
            </button>
          </div>

          {/* Category filter pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5" role="toolbar" aria-label="Category filters">
            {FILTER_PILLS.map((pill) => {
              const isActive = categoryFilter === pill.key
              return (
                <button
                  key={pill.key}
                  type="button"
                  aria-label={`Category: ${pill.label}`}
                  onClick={() => setCategoryFilter(pill.key)}
                  className={`
                    shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border
                    ${isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <pill.icon size={12} className="shrink-0" />
                  <span>{pill.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sort & Group Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800/60 text-xs">
          <div className="flex items-center gap-3">
            {/* Sort options */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={12} className="text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="bg-transparent border-0 text-xs font-medium text-gray-700 dark:text-gray-300 py-0 pl-0 pr-6 focus:ring-0 cursor-pointer"
              >
                <option value="priority">Priority</option>
                <option value="due_date">Due Date</option>
                <option value="created_at">Created</option>
              </select>
            </div>

            {/* Group-by toggle */}
            <button
              type="button"
              onClick={() => setGroupBy(groupBy === 'due' ? 'none' : 'due')}
              className={`
                px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border
                ${groupBy === 'due'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              Group: {groupBy === 'due' ? 'Due Date' : 'None'}
            </button>
          </div>

          <span className="text-gray-400 font-medium">
            {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Bulk Action Sticky Bar (when selection mode active) */}
        {isSelectionMode && (
          <div className="px-4 py-2.5 bg-indigo-600 text-white flex items-center justify-between gap-2 shadow-md animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
              >
                {selectedIds.size === sortedTasks.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-xs opacity-90">
                ({selectedIds.size} selected)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleBulkComplete}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/20 hover:bg-white/30 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
              >
                <CheckCircle2 size={13} />
                <span>Done</span>
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleBulkPin}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/20 hover:bg-white/30 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
              >
                <Pin size={13} />
                <span>Today</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/20 hover:bg-white/30 disabled:opacity-40 transition-colors"
                >
                  Priority
                </button>
                {showPriorityPicker && (
                  <div className="absolute right-0 bottom-full mb-1 z-50 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-1 w-32 space-y-0.5">
                    {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleBulkSetPriority(p)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleBulkDelete}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-red-500/80 hover:bg-red-500 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Task List Content */}
      {isLoading ? (
        <VaultSkeleton />
      ) : rawTasks.length === 0 ? (
        <EmptyState variant="vault" onAction={() => setIsFormOpen(true)} />
      ) : sortedTasks.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            <Filter size={20} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            No tasks match your filters
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
            Try adjusting your search terms, status, or category filters.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : groupBy === 'due' && groupedTasks ? (
        /* Grouped view by Due Date */
        <div className="px-4 py-3 space-y-6 pb-28">
          {/* Overdue */}
          {groupedTasks.overdue.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Overdue ({groupedTasks.overdue.length})
                </h4>
              </div>
              <div className="space-y-2.5">
                {groupedTasks.overdue.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onPin={(id, p) => pinTask.mutate({ id, pinned: p })}
                    onTap={(task) => setEditingTask(task)}
                    onToggleComplete={handleToggleComplete}
                    isPinning={pinTask.isPending}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(t.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Today */}
          {groupedTasks.today.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Today ({groupedTasks.today.length})
                </h4>
              </div>
              <div className="space-y-2.5">
                {groupedTasks.today.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onPin={(id, p) => pinTask.mutate({ id, pinned: p })}
                    onTap={(task) => setEditingTask(task)}
                    onToggleComplete={handleToggleComplete}
                    isPinning={pinTask.isPending}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(t.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </section>
          )}

          {/* This Week */}
          {groupedTasks.thisWeek.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  This Week ({groupedTasks.thisWeek.length})
                </h4>
              </div>
              <div className="space-y-2.5">
                {groupedTasks.thisWeek.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onPin={(id, p) => pinTask.mutate({ id, pinned: p })}
                    onTap={(task) => setEditingTask(task)}
                    onToggleComplete={handleToggleComplete}
                    isPinning={pinTask.isPending}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(t.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Later */}
          {groupedTasks.later.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Later ({groupedTasks.later.length})
                </h4>
              </div>
              <div className="space-y-2.5">
                {groupedTasks.later.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onPin={(id, p) => pinTask.mutate({ id, pinned: p })}
                    onTap={(task) => setEditingTask(task)}
                    onToggleComplete={handleToggleComplete}
                    isPinning={pinTask.isPending}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(t.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </section>
          )}

          {/* No Date */}
          {groupedTasks.noDate.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  No Due Date ({groupedTasks.noDate.length})
                </h4>
              </div>
              <div className="space-y-2.5">
                {groupedTasks.noDate.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onPin={(id, p) => pinTask.mutate({ id, pinned: p })}
                    onTap={(task) => setEditingTask(task)}
                    onToggleComplete={handleToggleComplete}
                    isPinning={pinTask.isPending}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(t.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Flat sorted list */
        <div className="px-4 py-3 space-y-2.5 pb-28">
          {sortedTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onPin={(id, p) => pinTask.mutate({ id, pinned: p })}
              onTap={(task) => setEditingTask(task)}
              onToggleComplete={handleToggleComplete}
              isPinning={pinTask.isPending}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(t.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      )}

      {/* FAB to add task */}
      {!isSelectionMode && (
        <FAB onClick={() => setIsFormOpen(true)} label="Add Task" />
      )}

      {/* Create Task BottomSheet */}
      <BottomSheet
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="New Task"
      >
        <div className="px-5 pb-5 pt-2">
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={createTask.isPending}
          />
        </div>
      </BottomSheet>

      {/* Edit Task BottomSheet */}
      <BottomSheet
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <div className="px-5 pb-5 pt-2">
            <TaskForm
              initialData={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
              isSubmitting={updateTask.isPending}
            />
            {/* Delete button (no window.confirm, uses showUndo) */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => handleDeleteTask(editingTask)}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete Task</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </PageShell>
  )
}
