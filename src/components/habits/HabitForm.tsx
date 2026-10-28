import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import BottomSheet from '../ui/BottomSheet'

const HABIT_ICONS = ['✅', '💪', '📚', '🧘', '🏃', '💧', '🎯', '📝', '🎸', '🌱', '💻', '🧠']
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
  onSubmit: (habit: {
    name: string
    icon: string
    frequency: string
    custom_days?: string[]
  }) => void
  isPending: boolean
}

export default function HabitForm({ open, onClose, onSubmit, isPending }: HabitFormProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('✅')
  const [frequency, setFrequency] = useState<string>('daily')
  const [customDays, setCustomDays] = useState<string[]>([])

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      icon,
      frequency,
      custom_days: frequency === 'custom' ? customDays : undefined,
    })
    // Reset
    setName('')
    setIcon('✅')
    setFrequency('daily')
    setCustomDays([])
  }

  const toggleDay = (day: string) => {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <BottomSheet isOpen={open} onClose={onClose}>
      <div className="px-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-emerald-500" />
            New Habit
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Habit name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Read 20 pages"
            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Icon Picker */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {HABIT_ICONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all
                  ${icon === emoji
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 ring-2 ring-emerald-500 scale-110'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Frequency
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`
                  py-2 px-3 rounded-xl text-sm font-medium transition-all
                  ${frequency === f.value
                    ? 'bg-emerald-500 text-white shadow-sm'
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
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Select days
            </label>
            <div className="flex gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`
                    flex-1 py-2 rounded-lg text-xs font-medium uppercase transition-all
                    ${customDays.includes(day)
                      ? 'bg-emerald-500 text-white'
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors shadow-sm shadow-emerald-500/20"
        >
          {isPending ? 'Creating...' : 'Create Habit'}
        </button>
      </div>
    </BottomSheet>
  )
}
