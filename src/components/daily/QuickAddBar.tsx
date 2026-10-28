import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateAdhocTodo } from '../../hooks/useDailyTodos'
import { Plus, ArrowRight } from 'lucide-react'

export interface QuickAddBarHandle {
  focus: () => void
}

export const QuickAddBar = forwardRef<QuickAddBarHandle>(function QuickAddBar(_props, ref) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: create, isPending } = useCreateAdhocTodo()

  useImperativeHandle(ref, () => ({
    focus: () => {
      setActive(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    },
  }))

  function handleSubmit() {
    if (!text.trim() || isPending) return
    create(text.trim())
    setText('')
    setActive(false)
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
            onClick={() => {
              setActive(true)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-gray-500 dark:text-gray-400 text-base sm:text-sm border border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500 transition-colors"
          >
            <Plus className="w-5 h-5 flex-shrink-0 text-brand-500" />
            <span>Add a task quickly...</span>
          </motion.button>
        ) : (
          <motion.div
            key="input"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl border border-brand-300 dark:border-brand-600 shadow-sm"
          >
            <input
              ref={inputRef}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
                if (e.key === 'Escape') {
                  setActive(false)
                  setText('')
                }
              }}
              onBlur={() => {
                if (!text.trim()) setActive(false)
              }}
              placeholder="What needs to be done?"
              className="flex-1 text-base sm:text-sm bg-transparent outline-none placeholder-gray-400 text-gray-900 dark:text-white"
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
                  aria-label="Add task"
                  className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
