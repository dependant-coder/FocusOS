import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Laptop, Play, Square, Loader2 } from 'lucide-react'
import { useActiveRemoteSession, useEndRemoteSession } from '../../hooks/useFocus'
import { useFocusStore } from '../../store/focusStore'
import { formatTimerMs, reconstructRemainingSecondsFromRow } from '../../lib/focusTimer'
import toast from 'react-hot-toast'

interface RemoteSessionBannerProps {
  onDismissConflict?: () => void
}

export function RemoteSessionBanner({ onDismissConflict }: RemoteSessionBannerProps) {
  const navigate = useNavigate()
  const { remoteSession, isRunningOnAnotherDevice } = useActiveRemoteSession()
  const conflictSession = useFocusStore((s) => s.conflictSession)
  const adoptRemoteSession = useFocusStore((s) => s.adoptRemoteSession)
  const clearConflict = useFocusStore((s) => s.clearConflict)
  const endRemote = useEndRemoteSession()

  const activeConflictOrRemote = conflictSession || (isRunningOnAnotherDevice ? remoteSession : null)

  const [remainingSec, setRemainingSec] = useState(() => {
    return activeConflictOrRemote ? reconstructRemainingSecondsFromRow(activeConflictOrRemote) : 0
  })

  useEffect(() => {
    if (!activeConflictOrRemote) return
    const update = () => {
      setRemainingSec(reconstructRemainingSecondsFromRow(activeConflictOrRemote))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [activeConflictOrRemote])

  if (!activeConflictOrRemote) return null

  const handleOpenIt = () => {
    adoptRemoteSession(activeConflictOrRemote)
    clearConflict()
    if (onDismissConflict) onDismissConflict()
    navigate('/focus/run')
  }

  const handleEndIt = async () => {
    try {
      const actual = Math.max(0, activeConflictOrRemote.planned_seconds - remainingSec)
      await endRemote.mutateAsync({
        sessionId: activeConflictOrRemote.id,
        actualSeconds: actual,
      })
      clearConflict()
      if (onDismissConflict) onDismissConflict()
      toast.success('Previous session ended')
    } catch {
      toast.error('Failed to end remote session')
    }
  }

  const taskTitle =
    activeConflictOrRemote.task_id && 'tasks' in activeConflictOrRemote
      ? (activeConflictOrRemote as { tasks?: { title?: string } }).tasks?.title
      : null

  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 p-4 shadow-sm space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
          <Laptop size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Session running on another device
            </h4>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-800/60 text-amber-950 dark:text-amber-100 shrink-0">
              {formatTimerMs(remainingSec * 1000)}
            </span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5 truncate">
            {taskTitle ? `Working on: ${taskTitle}` : 'Free Focus session'}
            {activeConflictOrRemote.status === 'paused' ? ' (Paused)' : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleOpenIt}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors shadow-sm"
        >
          <Play size={14} className="fill-current" />
          Open it
        </button>
        <button
          type="button"
          disabled={endRemote.isPending}
          onClick={handleEndIt}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-medium transition-colors"
        >
          {endRemote.isPending ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
          End it
        </button>
      </div>
    </div>
  )
}
