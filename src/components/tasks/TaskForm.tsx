import { useState, useRef } from 'react'
import type { Task, Priority, Category, TaskStatus } from '../../types'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../lib/constants'
import { todayLocal, addDaysLocal, parseLocalDate } from '../../lib/dates'
import { GraduationCap, Brain, Lightbulb, Pin, BrainCircuit, Zap, Clock, Calendar } from 'lucide-react'

const CATEGORY_ICONS = {
  'graduation-cap': GraduationCap,
  'brain': Brain,
  'lightbulb': Lightbulb,
} as const

const ESTIMATE_PRESETS = [15, 30, 45, 60, 90]

function getNextMonday(): string {
  const d = parseLocalDate(todayLocal())
  const day = d.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = ((1 + 7 - day) % 7) || 7
  return addDaysLocal(todayLocal(), diff)
}

export interface TaskFormData {
  title: string
  category: Category
  priority: Priority
  due_date: string | null
  due_time: string | null
  estimate_min: number | null
  status: TaskStatus
  description: string | null
  resources_url: string | null
  energy_level: 'deep_work' | 'quick_task' | ''
  pin_to_today: boolean
}

interface TaskFormProps {
  initialData?: Partial<Task>
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export default function TaskForm({ initialData, onSubmit, onCancel, isSubmitting }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [category, setCategory] = useState<Category>((initialData?.category as Category) || 'personal')
  const [priority, setPriority] = useState<Priority>((initialData?.priority as Priority) || 'medium')
  const [dueDate, setDueDate] = useState<string>(initialData?.due_date || '')
  const [dueTime, setDueTime] = useState<string>(initialData?.due_time ? initialData.due_time.slice(0, 5) : '')
  const [estimateMin, setEstimateMin] = useState<number | null>(initialData?.estimate_min ?? null)
  const [isCustomEstimate, setIsCustomEstimate] = useState(
    initialData?.estimate_min ? !ESTIMATE_PRESETS.includes(initialData.estimate_min) : false
  )
  const [status, setStatus] = useState<TaskStatus>((initialData?.status as TaskStatus) || 'not_started')
  const [description, setDescription] = useState(initialData?.description || '')
  const [resourcesUrl, setResourcesUrl] = useState(initialData?.resources_url || '')
  const [energyLevel, setEnergyLevel] = useState<'deep_work' | 'quick_task' | ''>(
    (initialData?.energy_level as 'deep_work' | 'quick_task') || ''
  )
  const [pinToToday, setPinToToday] = useState(initialData?.pin_to_today || false)

  const [showDesc, setShowDesc] = useState(!!initialData?.description)
  const [showLink, setShowLink] = useState(!!initialData?.resources_url)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const todayStr = todayLocal()
  const tomorrowStr = addDaysLocal(todayStr, 1)
  const nextMonStr = getNextMonday()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title: title.trim(),
      category,
      priority,
      due_date: dueDate || null,
      due_time: dueTime ? (dueTime.length === 5 ? `${dueTime}:00` : dueTime) : null,
      estimate_min: estimateMin,
      status,
      description: description.trim() || null,
      resources_url: resourcesUrl.trim() || null,
      energy_level: energyLevel,
      pin_to_today: pinToToday,
    })
  }

  const isEditing = !!initialData?.id

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
      <div className="flex-1 overflow-y-auto space-y-5 pb-6 pr-1">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            required
            className="w-full text-base sm:text-lg font-medium bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 pb-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-0 transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CATEGORY_CONFIG) as Category[]).map((cat) => {
              const config = CATEGORY_CONFIG[cat]
              const isActive = category === cat
              const IconComponent = CATEGORY_ICONS[config.icon]
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`
                    flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${isActive
                      ? 'ring-2 ring-offset-1 dark:ring-offset-gray-900 shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                    }
                  `}
                  style={isActive ? {
                    backgroundColor: `${config.color}15`,
                    color: config.color,
                    borderColor: config.color,
                    ['--tw-ring-color' as string]: config.color,
                  } : undefined}
                >
                  <IconComponent size={16} /> {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((pri) => {
              const config = PRIORITY_CONFIG[pri]
              const isActive = priority === pri
              return (
                <button
                  key={pri}
                  type="button"
                  onClick={() => setPriority(pri)}
                  className={`
                    flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all
                    ${isActive
                      ? 'ring-2 ring-offset-1 dark:ring-offset-gray-900 shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                    }
                  `}
                  style={isActive ? {
                    backgroundColor: `${config.color}15`,
                    color: config.color,
                    ['--tw-ring-color' as string]: config.color,
                  } : undefined}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
            Status
          </label>
          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            {[
              { value: 'not_started' as TaskStatus, label: 'Not started' },
              { value: 'in_progress' as TaskStatus, label: 'In progress' },
              { value: 'done' as TaskStatus, label: 'Done' },
            ].map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatus(st.value)}
                className={`
                  py-1.5 text-xs font-medium rounded-lg transition-all
                  ${status === st.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
            Due Date & Time
          </label>

          {/* Quick Date Chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { label: 'Today', date: todayStr },
              { label: 'Tomorrow', date: tomorrowStr },
              { label: 'Next Mon', date: nextMonStr },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setDueDate(chip.date)}
                className={`
                  px-2.5 py-1 text-xs font-medium rounded-lg transition-colors
                  ${dueDate === chip.date
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {chip.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 inline-flex items-center gap-1"
            >
              <Calendar size={12} />
              <span>Pick...</span>
            </button>
            {dueDate && (
              <button
                type="button"
                onClick={() => {
                  setDueDate('')
                  setDueTime('')
                }}
                className="px-2 py-1 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                Clear date
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <input
                ref={dateInputRef}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="Due time"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Estimate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Estimate
            </label>
            {estimateMin !== null && (
              <button
                type="button"
                onClick={() => {
                  setEstimateMin(null)
                  setIsCustomEstimate(false)
                }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ESTIMATE_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setEstimateMin(m)
                  setIsCustomEstimate(false)
                }}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                  ${estimateMin === m && !isCustomEstimate
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                  }
                `}
              >
                {m}m
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsCustomEstimate(true)
                if (!estimateMin) setEstimateMin(20)
              }}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${isCustomEstimate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                }
              `}
            >
              Custom
            </button>
          </div>

          {isCustomEstimate && (
            <div className="flex items-center gap-2 mt-2">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <input
                type="number"
                min={5}
                step={5}
                max={480}
                value={estimateMin ?? ''}
                onChange={(e) => setEstimateMin(e.target.value ? Number(e.target.value) : null)}
                placeholder="Minutes"
                className="w-32 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-base sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-500">minutes</span>
            </div>
          )}
        </div>

        {/* Type (renamed from Energy Level) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Type
            </label>
            {energyLevel && (
              <button
                type="button"
                onClick={() => setEnergyLevel('')}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'deep_work' as const, label: 'Deep Work', desc: '45+ min focus', icon: BrainCircuit },
              { value: 'quick_task' as const, label: 'Quick Task', desc: '< 15 min focus', icon: Zap },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEnergyLevel(energyLevel === opt.value ? '' : opt.value)}
                className={`
                  flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-sm transition-all
                  ${energyLevel === opt.value
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900 shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750'
                  }
                `}
              >
                <opt.icon size={16} className="mb-0.5" />
                <span className="font-medium text-xs">{opt.label}</span>
                <span className="text-[10px] text-gray-400">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description toggle */}
        {!showDesc && (
          <button
            type="button"
            onClick={() => setShowDesc(true)}
            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium block"
          >
            + Add notes or details
          </button>
        )}
        {showDesc && (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
              Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Link toggle */}
        {!showLink && (
          <button
            type="button"
            onClick={() => setShowLink(true)}
            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium block"
          >
            + Add resource link
          </button>
        )}
        {showLink && (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
              Resource URL
            </label>
            <input
              type="url"
              value={resourcesUrl}
              onChange={(e) => setResourcesUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-base sm:text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Pin to Today */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Pin size={16} className="text-gray-500" />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">Pin to Today</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Surface in today's daily plan</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pinToToday}
            aria-label="Pin to Today"
            onClick={() => setPinToToday(!pinToToday)}
            className={`
              relative inline-flex items-center shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              ${pinToToday ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}
            `}
          >
            <span className={`
              inline-block w-5 h-5 bg-white rounded-full shadow-xs transition-transform
              ${pinToToday ? 'translate-x-5' : 'translate-x-0.5'}
            `} />
          </button>
        </div>
      </div>

      {/* Sticky footer with Cancel and Save */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200/70 dark:border-gray-800 pt-3 pb-1 flex gap-3 z-10">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-600/20"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
