import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckboxRing } from '../ui/CheckboxRing'
import { SwipeableItem } from './SwipeableItem'
import type { DailyTodoWithTask, Priority, Category } from '../../types'
import PriorityBadge from '../tasks/PriorityBadge'
import CategoryBadge from '../tasks/CategoryBadge'
import {
  CornerDownRight,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Star,
  ArrowRight,
  Trash2,
  Clock,
  Timer,
  Edit2,
} from 'lucide-react'

interface DailyTodoCardProps {
  todo: DailyTodoWithTask
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onTap?: (todo: DailyTodoWithTask) => void
  onMoveTomorrow?: (todo: DailyTodoWithTask) => void
  onToggleMustDo?: (todo: DailyTodoWithTask) => void
}

export default function DailyTodoCard({
  todo,
  onToggle,
  onDelete,
  onTap,
  onMoveTomorrow,
  onToggleMustDo,
}: DailyTodoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const hasDetails = todo.tasks?.description || todo.tasks?.resources_url
  const isMustDo = Boolean(todo.must_do)

  return (
    <SwipeableItem
      onComplete={() => onToggle(todo.id, !todo.done)}
      onDelete={() => onDelete(todo.id)}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative bg-white dark:bg-gray-900 rounded-2xl border transition-all
          ${isMustDo ? 'border-amber-300 dark:border-amber-700/60 shadow-xs' : ''}
          ${
            todo.done
              ? 'border-gray-100 dark:border-gray-800 opacity-60'
              : !isMustDo
              ? 'border-gray-200/70 dark:border-gray-800/80 shadow-xs'
              : ''
          }
        `}
      >
        <div className="flex items-start gap-3 p-3.5">
          {/* Checkbox */}
          <div className="shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <CheckboxRing
              checked={todo.done}
              onChange={(checked) => onToggle(todo.id, checked)}
              priority={
                todo.priority === 'critical' ||
                todo.priority === 'high' ||
                todo.priority === 'medium' ||
                todo.priority === 'low'
                  ? todo.priority
                  : 'medium'
              }
              label={`Mark "${todo.title}" as ${todo.done ? 'incomplete' : 'complete'}`}
            />
          </div>

          {/* Content Body */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => onTap?.(todo)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTap?.(todo)
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {isMustDo && (
                  <Star
                    size={13}
                    className="text-amber-500 fill-amber-500 shrink-0"
                    aria-label="Must do task"
                  />
                )}
                <motion.p
                  animate={{
                    opacity: todo.done ? 0.45 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`text-sm font-medium leading-snug truncate ${
                    todo.done
                      ? 'line-through text-gray-400 dark:text-gray-600'
                      : isMustDo
                      ? 'font-semibold text-gray-900 dark:text-white'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {todo.title}
                </motion.p>
              </div>

              {/* Action Buttons: Expand details and 3-dot overflow menu */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {hasDetails && (
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    aria-label={expanded ? 'Collapse task details' : 'Expand task details'}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                {/* Overflow ⋯ menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    aria-label={`Options for ${todo.title}`}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <MoreVertical size={15} />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden min-w-[170px] py-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            onToggle(todo.id, !todo.done)
                            setShowMenu(false)
                          }}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                        >
                          <span>{todo.done ? 'Mark incomplete' : 'Mark complete'}</span>
                        </button>

                        {onToggleMustDo && (
                          <button
                            type="button"
                            onClick={() => {
                              onToggleMustDo(todo)
                              setShowMenu(false)
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                          >
                            <Star size={13} fill={isMustDo ? 'currentColor' : 'none'} className="text-amber-500" />
                            <span>{isMustDo ? 'Unstar Must-Do' : 'Star Must-Do'}</span>
                          </button>
                        )}

                        {onTap && (
                          <button
                            type="button"
                            onClick={() => {
                              onTap(todo)
                              setShowMenu(false)
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                          >
                            <Edit2 size={13} className="text-gray-400" />
                            <span>Edit details</span>
                          </button>
                        )}

                        {onMoveTomorrow && (
                          <button
                            type="button"
                            onClick={() => {
                              onMoveTomorrow(todo)
                              setShowMenu(false)
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                          >
                            <ArrowRight size={13} className="text-gray-400" />
                            <span>Move to Tomorrow</span>
                          </button>
                        )}

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            onDelete(todo.id)
                            setShowMenu(false)
                          }}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {todo.priority && <PriorityBadge priority={todo.priority as Priority} size="sm" />}
              {todo.category && <CategoryBadge category={todo.category as Category} size="sm" />}

              {/* Carried over badge */}
              {todo.carry_over && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/50 px-2 py-0.5 rounded-full">
                  <CornerDownRight size={9} />
                  {todo.carry_count > 1 ? `Carried ${todo.carry_count}×` : 'Carried over'}
                </span>
              )}

              {/* Due time badge */}
              {todo.tasks?.due_time && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  <Clock size={10} className="text-gray-400" />
                  {todo.tasks.due_time.slice(0, 5)}
                </span>
              )}

              {/* Estimate badge */}
              {todo.tasks?.estimate_min && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/50 px-2 py-0.5 rounded-full">
                  <Timer size={10} className="text-purple-500" />
                  {todo.tasks.estimate_min >= 60
                    ? `${Math.floor(todo.tasks.estimate_min / 60)}h ${
                        todo.tasks.estimate_min % 60 ? `${todo.tasks.estimate_min % 60}m` : ''
                      }`
                    : `${todo.tasks.estimate_min}m`}
                </span>
              )}

              {todo.type === 'adhoc' && !isMustDo && (
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                  Quick task
                </span>
              )}
            </div>

            {/* Expanded details body */}
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
