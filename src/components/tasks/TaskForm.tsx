import { useState } from 'react'
import type { Task, Priority, Category } from '../../types'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '../../lib/constants'
import { GraduationCap, Brain, Lightbulb, Pin, BrainCircuit, Zap } from 'lucide-react'

const CATEGORY_ICONS = {
  'graduation-cap': GraduationCap,
  'brain': Brain,
  'lightbulb': Lightbulb,
} as const

interface TaskFormProps {
  initialData?: Partial<Task>
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export interface TaskFormData {
  title: string
  category: Category
  priority: Priority
  due_date: string
  description: string
  resources_url: string
  energy_level: 'deep_work' | 'quick_task' | ''
  pin_to_today: boolean
}

export default function TaskForm({ initialData, onSubmit, onCancel, isSubmitting }: TaskFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [category, setCategory] = useState<Category>((initialData?.category as Category) || 'personal')
  const [priority, setPriority] = useState<Priority>((initialData?.priority as Priority) || 'medium')
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [resourcesUrl, setResourcesUrl] = useState(initialData?.resources_url || '')
  const [energyLevel, setEnergyLevel] = useState<'deep_work' | 'quick_task' | ''>((initialData?.energy_level as 'deep_work' | 'quick_task') || '')
  const [pinToToday, setPinToToday] = useState(initialData?.pin_to_today || false)
  const [showDesc, setShowDesc] = useState(!!initialData?.description)
  const [showLink, setShowLink] = useState(!!initialData?.resources_url)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      category,
      priority,
      due_date: dueDate,
      description: description.trim(),
      resources_url: resourcesUrl.trim(),
      energy_level: energyLevel,
      pin_to_today: pinToToday,
    })
  }

  const isEditing = !!initialData?.id

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
          required
          className="w-full text-lg font-medium bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 pb-2 text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-indigo-500 focus:ring-0 transition-colors"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Category</label>
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
                    ? 'ring-2 ring-offset-1 dark:ring-offset-gray-900'
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
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Priority</label>
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
                    ? 'ring-2 ring-offset-1 dark:ring-offset-gray-900'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
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

      {/* Due Date */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Description toggle */}
      {!showDesc && (
        <button type="button" onClick={() => setShowDesc(true)} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
          + Add description
        </button>
      )}
      {showDesc && (
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details..."
            rows={3}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Link toggle */}
      {!showLink && (
        <button type="button" onClick={() => setShowLink(true)} className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
          + Add link
        </button>
      )}
      {showLink && (
        <div>
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Resources URL</label>
          <input
            type="url"
            value={resourcesUrl}
            onChange={(e) => setResourcesUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Energy Level */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Energy Level</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'deep_work' as const, label: 'Deep Work', desc: '45+ min focus', icon: BrainCircuit },
            { value: 'quick_task' as const, label: 'Quick Task', desc: '< 15 min', icon: Zap },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEnergyLevel(energyLevel === opt.value ? '' : opt.value)}
              className={`
                flex flex-col items-center gap-0.5 py-3 rounded-xl text-sm transition-all
                ${energyLevel === opt.value
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }
              `}
            >
              <opt.icon size={18} className="mb-0.5" />
              <span className="font-medium">{opt.label}</span>
              <span className="text-[10px] text-gray-400">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pin to Today */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Pin size={16} className="text-gray-500" />
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Pin to Today</span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Add to today's command center</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={pinToToday}
          onClick={() => setPinToToday(!pinToToday)}
          className={`
            relative inline-flex items-center shrink-0 w-11 h-6 rounded-full transition-colors
            ${pinToToday ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}
          `}
        >
          <span className={`
            inline-block w-5 h-5 bg-white rounded-full shadow transition-transform
            ${pinToToday ? 'translate-x-5' : 'translate-x-0.5'}
          `} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-500/20"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
