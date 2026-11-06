import { useNavigate } from 'react-router-dom'
import { Sparkles, Coffee, RotateCcw, Check } from 'lucide-react'
import { useFocusStore } from '../../store/focusStore'
import { formatFocusDuration } from '../../lib/focusTimer'
import { useAuth } from '../../hooks/useAuth'

export function CompletionSheet() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const completedSheetOpen = useFocusStore((s) => s.completedSheetOpen)
  const completedSummary = useFocusStore((s) => s.completedSummary)
  const closeCompletedSheet = useFocusStore((s) => s.closeCompletedSheet)
  const startSession = useFocusStore((s) => s.startSession)
  const breakPlannedSeconds = useFocusStore((s) => s.breakPlannedSeconds)

  if (!completedSheetOpen || !completedSummary) return null

  const isBreak = completedSummary.kind === 'break'
  const durationText = formatFocusDuration(completedSummary.actualSeconds)

  const handleStartBreak = async () => {
    closeCompletedSheet()
    await startSession({
      userId: user?.id,
      kind: 'break',
      plannedSeconds: breakPlannedSeconds || 300,
      taskId: completedSummary.taskId,
      taskTitle: completedSummary.taskTitle,
    })
    navigate('/focus/run')
  }

  const handleStartAnother = async () => {
    closeCompletedSheet()
    await startSession({
      userId: user?.id,
      kind: 'focus',
      plannedSeconds: completedSummary.plannedSeconds || 1500,
      taskId: completedSummary.taskId,
      taskTitle: completedSummary.taskTitle,
    })
    navigate('/focus/run')
  }

  const handleDone = () => {
    closeCompletedSheet()
    navigate('/focus')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-slide-up">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mb-2">
            {isBreak ? <Coffee size={32} /> : <Sparkles size={32} />}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isBreak ? 'Break completed' : completedSummary.status === 'stopped' ? 'Session ended' : 'Focus session complete!'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You logged <span className="font-semibold text-gray-900 dark:text-white">{durationText}</span>
            {completedSummary.taskTitle ? ` on ${completedSummary.taskTitle}` : ''}.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {!isBreak ? (
            <button
              type="button"
              onClick={handleStartBreak}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all shadow-md shadow-emerald-600/20"
            >
              <Coffee size={18} />
              Take a {Math.round((breakPlannedSeconds || 300) / 60)}-minute break
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartAnother}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              <RotateCcw size={18} />
              Start another focus session
            </button>
          )}

          <button
            type="button"
            onClick={handleDone}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium text-sm transition-colors"
          >
            <Check size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
