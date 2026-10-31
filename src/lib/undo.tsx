import toast from 'react-hot-toast'
import { RotateCcw } from 'lucide-react'

export interface ShowUndoOptions {
  message: string
  onUndo: () => void | Promise<void>
  onCommit: () => void | Promise<void>
  ms?: number
}

interface PendingCommit {
  id: string
  toastId: string
  onCommit: () => void | Promise<void>
  onUndo: () => void | Promise<void>
  timer: ReturnType<typeof setTimeout>
}

// Registry of pending commits that haven't yet been finalized on the server
const pendingCommits = new Map<string, PendingCommit>()

/**
 * Flush all pending commits immediately (e.g. before page unload or when tab is hidden)
 */
export function flushPendingUndos(): void {
  for (const [id, item] of pendingCommits.entries()) {
    clearTimeout(item.timer)
    try {
      void item.onCommit()
    } catch (err) {
      console.error('[FocusOS Undo] Error committing pending action:', err)
    }
    toast.dismiss(item.toastId)
    pendingCommits.delete(id)
  }
}

// Attach lifecycle listeners once
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingUndos()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingUndos()
    }
  })
}

/**
 * Show an undo toast that optimistically runs, then commits after `ms` milliseconds
 * unless the user clicks "Undo".
 */
export function showUndo({
  message,
  onUndo,
  onCommit,
  ms = 5000,
}: ShowUndoOptions): { id: string; undo: () => void; commit: () => void } {
  const commitId = crypto.randomUUID()

  let toastId = ''

  const executeCommit = () => {
    const item = pendingCommits.get(commitId)
    if (item) {
      clearTimeout(item.timer)
      pendingCommits.delete(commitId)
      try {
        void item.onCommit()
      } catch (err) {
        console.error('[FocusOS Undo] Commit error:', err)
      }
    }
  }

  const executeUndo = () => {
    const item = pendingCommits.get(commitId)
    if (item) {
      clearTimeout(item.timer)
      pendingCommits.delete(commitId)
      if (toastId) toast.dismiss(toastId)
      try {
        void item.onUndo()
      } catch (err) {
        console.error('[FocusOS Undo] Undo error:', err)
      }
    }
  }

  const timer = setTimeout(() => {
    executeCommit()
  }, ms)

  toastId = toast(
    (t) => (
      <div
        role="alert"
        aria-live="polite"
        className="flex items-center justify-between gap-4 w-full text-sm font-medium"
      >
        <span className="text-gray-200 truncate">{message}</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id)
            executeUndo()
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          aria-label={`Undo: ${message}`}
        >
          <RotateCcw size={13} strokeWidth={2.5} />
          <span>Undo</span>
        </button>
      </div>
    ),
    {
      duration: ms,
      style: {
        background: '#111827',
        color: '#f9fafb',
        border: '1px solid #374151',
        borderRadius: '14px',
        padding: '10px 16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
      },
    }
  )

  pendingCommits.set(commitId, {
    id: commitId,
    toastId,
    onCommit,
    onUndo,
    timer,
  })

  return {
    id: commitId,
    undo: executeUndo,
    commit: executeCommit,
  }
}
