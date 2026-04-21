import { motion } from 'framer-motion'
import { CheckboxRing } from '../ui/CheckboxRing'
import { SwipeableItem } from './SwipeableItem'
import type { DailyTodo } from '../../types'
import type { Priority, Category } from '../../types'
import PriorityBadge from '../tasks/PriorityBadge'
import CategoryBadge from '../tasks/CategoryBadge'
import { CornerDownRight, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface DailyTodoCardProps {
  todo: DailyTodo & { tasks?: { description: string | null; resources_url: string | null } | null }
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  isToggling: boolean
}

export default function DailyTodoCard({ todo, onToggle, onDelete }: Omit<DailyTodoCardProps, 'isToggling'>) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = todo.tasks?.description || todo.tasks?.resources_url

  return (
    <SwipeableItem 
      onComplete={() => onToggle(todo.id, true)} 
      onDelete={() => onDelete(todo.id)}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative bg-white dark:bg-gray-900 rounded-xl border
          ${todo.done
            ? 'border-gray-100 dark:border-gray-800 opacity-70'
            : 'border-gray-200/60 dark:border-gray-800/60 shadow-sm'
          }
          transition-all
        `}
      >
        <div className="flex items-start gap-3 p-3.5">
          {/* Checkbox */}
          <div className="shrink-0 mt-0.5">
            <CheckboxRing
              checked={todo.done}
              onChange={(checked) => onToggle(todo.id, checked)}
              priority={todo.priority as any}
            />
          </div>

          {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-snug ${
              todo.done
                ? 'line-through text-gray-400 dark:text-gray-600'
                : 'text-gray-900 dark:text-white'
            }`}>
              {todo.title}
            </p>
            {hasDetails && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {todo.priority && <PriorityBadge priority={todo.priority as Priority} size="sm" />}
            {todo.category && <CategoryBadge category={todo.category as Category} size="sm" />}
            {todo.carry_over && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <CornerDownRight size={9} /> Carried over
              </span>
            )}
            {todo.type === 'adhoc' && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                Ad-hoc
              </span>
            )}
          </div>

          {/* Expanded details */}
          {expanded && hasDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800"
            >
              {todo.tasks?.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                  {todo.tasks.description}
                </p>
              )}
              {todo.tasks?.resources_url && (
                <a
                  href={todo.tasks.resources_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
                >
                  <LinkIcon size={11} /> Open resource
                </a>
              )}
            </motion.div>
          )}
        </div>
        </div>
      </motion.div>
    </SwipeableItem>
  )
}
