import { useState, useEffect } from 'react'
import { Sparkles, X, Search } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'
import type { Habit } from '../../hooks/useHabits'

const HABIT_TEMPLATES = [
  { name: 'Read 20 pages', icon: '📚', frequency: 'daily' },
  { name: 'Drink 2L water', icon: '💧', frequency: 'daily' },
  { name: 'Workout', icon: '💪', frequency: 'weekdays' },
  { name: 'Meditate 10m', icon: '🧘', frequency: 'daily' },
  { name: 'Study / Code', icon: '💻', frequency: 'weekdays' },
  { name: 'Walk 30m', icon: '🚶', frequency: 'daily' },
]

const ALL_EMOJIS = [
  '✅', '💪', '📚', '🧘', '🏃', '💧', '🎯', '📝', '🎸', '🌱', '💻', '🧠',
  '🚴', '🏊', '🍎', '💤', '☀️', '🚶', '🎨', '🧹', '💰', '💊', '🍳', '☕',
  '📖', '🧗', '🗣️', '🌿', '✨', '⚡', '🏋️', '🥊', '🥗', '🥑', '🎹', '🛡️'
]

const FREQUENCIES = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom', label: 'Custom' },
] as const

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

interface HabitFormProps {
  open: boolean
  onClose: () => void
  initialData?: Habit | null
  onSubmit: (habit: {
    name: string
    icon: string
    frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
    custom_days?: string[]
  }) => void
  isPending: boolean
}

export default function HabitForm({
  open,
  onClose,
  initialData,
  onSubmit,
  isPending,
}: HabitFormProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('✅')
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily')
  const [customDays, setCustomDays] = useState<string[]>([])
  const [iconFilter, setIconFilter] = useState('')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setIcon(initialData.icon || '✅')
      setFrequency(initialData.frequency)
      setCustomDays(initialData.custom_days || [])
    } else {
      setName('')
      setIcon('✅')
      setFrequency('daily')
      setCustomDays([])
    }
  }, [initialData, open])

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      icon,
      frequency,
      custom_days: frequency === 'custom' ? customDays : undefined,
    })
  }

  const handleApplyTemplate = (tmpl: (typeof HABIT_TEMPLATES)[0]) => {
    setName(tmpl.name)
    setIcon(tmpl.icon)
    setFrequency(tmpl.frequency as 'daily' | 'weekdays' | 'weekends' | 'custom')
  }

  const toggleDay = (day: string) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const filteredEmojis = ALL_EMOJIS.filter((e) =>
    iconFilter ? e.includes(iconFilter) : true
  )

  const isEditing = Boolean(initialData?.id)

  return (
    <BottomSheet isOpen={open} onClose={onClose}>
      <div className="px-5 pb-6 flex flex-col max-h-[82vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-500" />
            <span>{isEditing ? 'Edit Habit' : 'New Habit'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
          {/* Quick templates (when creating) */}
          {!isEditing && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Quick Templates
              </label>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {HABIT_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>{tmpl.icon}</span>
                    <span>{tmpl.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Habit Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. Read 20 pages"
              className="w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus={!isEditing}
            />
          </div>

          {/* Icon Picker with Search / Custom input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Icon
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-400">Selected:</span>
                <span className="text-lg">{icon}</span>
              </div>
            </div>

            {/* Custom search or paste emoji */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={iconFilter}
                onChange={(e) => {
                  setIconFilter(e.target.value)
                  if (e.target.value.trim().length > 0) {
                    // If user pasted or typed an emoji directly, select it
                    setIcon(e.target.value.trim().slice(0, 2))
                  }
                }}
                placeholder="Search or paste custom emoji..."
                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Grid of emojis */}
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
              {filteredEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`
                    aspect-square rounded-xl flex items-center justify-center text-lg transition-all
                    ${icon === emoji
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 ring-2 ring-emerald-500 scale-105'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFrequency(f.value)}
                  className={`
                    py-2 px-3 rounded-xl text-xs font-medium transition-all
                    ${frequency === f.value
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days */}
          {frequency === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Select scheduled days
              </label>
              <div className="flex gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`
                      flex-1 py-2 rounded-lg text-xs font-medium uppercase transition-all
                      ${customDays.includes(day)
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer with Cancel and Save */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-xs shadow-emerald-500/20"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Habit' : 'Create Habit'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
