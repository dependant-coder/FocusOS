import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateAdhocTodo } from '../../hooks/useDailyTodos'
import { useCreateTask } from '../../hooks/useTasks'
import { parseQuickAdd } from '../../lib/quickAdd'
import { Plus, ArrowRight, Sparkles } from 'lucide-react'

export interface QuickAddBarHandle {
  focus: () => void
}

export const QuickAddBar = forwardRef<QuickAddBarHandle>(function QuickAddBar(_props, ref) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const createAdhoc = useCreateAdhocTodo()
  const createTask = useCreateTask()

  useImperativeHandle(ref, () => ({
    focus: () => {
      setActive(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    },
  }))

  const parsed = parseQuickAdd(text)
  const isPending = createAdhoc.isPending || createTask.isPending

  function handleSubmit() {
    if (!text.trim() || isPending) return

    const title = parsed.title.trim()
    const hasTokens =
      Boolean(parsed.priority) ||
      Boolean(parsed.category) ||
      Boolean(parsed.courseId) ||
      Boolean(parsed.dueDate) ||
      Boolean(parsed.dueTime) ||
      Boolean(parsed.estimateMin)

    if (hasTokens) {
      createTask.mutate(
        {
          title,
          priority: parsed.priority || 'medium',
          category: parsed.category || 'personal',
          due_date: parsed.dueDate || null,
          description: parsed.courseId ? `Course: #${parsed.courseId}` : null,
          resources_url: null,
          energy_level: parsed.estimateMin && parsed.estimateMin >= 45 ? 'deep_work' : parsed.estimateMin ? 'quick_task' : null,
          pin_to_today: parsed.toToday,
        },
        {
          onSuccess: () => {
            setText('')
            inputRef.current?.focus()
          },
        }
      )
    } else {
      createAdhoc.mutate(title, {
        onSuccess: () => {
          setText('')
          inputRef.current?.focus()
        },
      })
    }
  }

  return (
    <div className="w-full">
      <AnimatePresence initial={false}>
        {!active ? (
          <motion.button
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            onClick={() => {
              setActive(true)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl text-gray-500 dark:text-gray-400 text-base sm:text-sm border border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Add a task quickly to today"
          >
            <Plus className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>Add a task quickly...</span>
          </motion.button>
        ) : (
          <motion.div
            key="input"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="flex flex-col gap-1.5 px-4 py-2.5 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-400 dark:border-indigo-500 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSubmit()
                  }
                  if (e.key === 'Escape') {
                    setActive(false)
                    setText('')
                  }
                }}
                onBlur={() => {
                  if (!text.trim()) setActive(false)
                }}
                placeholder="What needs to be done? (supports !high, #college, 45m)"
                className="flex-1 text-base sm:text-sm bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
                aria-label="New task input"
              />
              <AnimatePresence>
                {text.trim() && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    onClick={handleSubmit}
                    disabled={isPending}
                    aria-label="Save task"
                    className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Subtle parse indicator if tokens detected */}
            {(parsed.priority || parsed.category || parsed.estimateMin || parsed.dueDate) && (
              <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                <Sparkles size={11} />
                <span>
                  Adding with{' '}
                  {[
                    parsed.priority && `priority ${parsed.priority}`,
                    parsed.category && `#${parsed.category}`,
                    parsed.estimateMin && `${parsed.estimateMin}m`,
                    parsed.dueDate && `due ${parsed.dueDate}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
