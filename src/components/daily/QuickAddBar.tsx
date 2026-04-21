import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateAdhocTodo } from '../../hooks/useDailyTodos'
import { Plus, ArrowRight } from 'lucide-react'

export function QuickAddBar() {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)
  const { mutate: create } = useCreateAdhocTodo()

  function handleSubmit() {
    if (!text.trim()) return
    // create the daily todo
    create(text.trim())
    setText('')
    setActive(false)
  }

  return (
    <div className="px-4 pb-3">
      <AnimatePresence initial={false}>
        {!active ? (
          <motion.button
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-gray-400 text-sm border border-dashed border-gray-200 dark:border-gray-700"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            Add a task quickly...
          </motion.button>
        ) : (
          <motion.div
            key="input"
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-brand-300 dark:border-brand-600 shadow-sm"
          >
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
              onBlur={() => {
                if (!text) setActive(false)
              }}
              placeholder="What needs to be done?"
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-900 dark:text-white"
            />
            <AnimatePresence>
              {text && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onClick={handleSubmit}
                  className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center flex-shrink-0"
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
}
