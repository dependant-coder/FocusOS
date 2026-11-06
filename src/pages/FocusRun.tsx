import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  X,
  Plus,
  Flame,
  Coffee,
  AlertCircle,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useFocusStore } from '../store/focusStore'
import { playCompletionSound, triggerVibration, WakeLockManager } from '../lib/focusEffects'
import { useToggleTaskComplete } from '../hooks/useTasks'
import { CompletionSheet } from '../components/focus/CompletionSheet'

export default function FocusRun() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toggleTask = useToggleTaskComplete()

  // Store state
  const sessionId = useFocusStore((s) => s.sessionId)
  const taskId = useFocusStore((s) => s.taskId)
  const taskTitle = useFocusStore((s) => s.taskTitle)
  const kind = useFocusStore((s) => s.kind)
  const plannedMs = useFocusStore((s) => s.plannedMs)
  const status = useFocusStore((s) => s.status)
  const interruptions = useFocusStore((s) => s.interruptions)
  const completedSheetOpen = useFocusStore((s) => s.completedSheetOpen)

  // Actions
  const pauseSession = useFocusStore((s) => s.pauseSession)
  const resumeSession = useFocusStore((s) => s.resumeSession)
  const extendSession = useFocusStore((s) => s.extendSession)
  const stopSession = useFocusStore((s) => s.stopSession)
  const completeSession = useFocusStore((s) => s.completeSession)
  const incrementInterruptions = useFocusStore((s) => s.incrementInterruptions)
  const getRemainingMs = useFocusStore((s) => s.getRemainingMs)
  const getFormattedRemaining = useFocusStore((s) => s.getFormattedRemaining)

  // Force re-render every second
  const [, setTick] = useState(0)
  const hiddenTimeRef = useRef<number | null>(null)
  const completingRef = useRef(false)

  // Redirect to /focus if no session is active and sheet is not open
  useEffect(() => {
    if (!sessionId && !completedSheetOpen) {
      navigate('/focus', { replace: true })
    }
  }, [sessionId, completedSheetOpen, navigate])

  // Screen Wake Lock
  useEffect(() => {
    const wl = new WakeLockManager()
    if (status === 'running') {
      wl.acquire()
    }

    const handleVisibility = () => {
      if (!document.hidden && status === 'running') {
        wl.acquire()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      wl.release()
    }
  }, [status])

  // Interruption detection: tab hidden > 10s
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenTimeRef.current = Date.now()
      } else {
        if (hiddenTimeRef.current && status === 'running') {
          const elapsed = Date.now() - hiddenTimeRef.current
          if (elapsed > 10000) {
            incrementInterruptions(user?.id)
          }
        }
        hiddenTimeRef.current = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, user?.id, incrementInterruptions])

  // Timer tick & completion trigger
  useEffect(() => {
    if (status !== 'running') return

    const interval = setInterval(() => {
      const remaining = getRemainingMs()
      setTick((t) => t + 1)

      if (remaining <= 0 && !completingRef.current) {
        completingRef.current = true
        playCompletionSound()
        triggerVibration([300, 150, 300, 150, 400])
        completeSession(user?.id).finally(() => {
          completingRef.current = false
        })
      }
    }, 500)

    return () => clearInterval(interval)
  }, [status, getRemainingMs, completeSession, user?.id])

  const remainingMs = getRemainingMs()
  const formattedTime = getFormattedRemaining()
  const isBreak = kind === 'break'

  // Calculate percentage remaining for circular progress
  const totalMs = plannedMs > 0 ? plannedMs : 1
  const progressRatio = Math.max(0, Math.min(1, remainingMs / totalMs))
  const circumference = 2 * Math.PI * 130
  const strokeDashoffset = circumference * (1 - progressRatio)

  const handleTogglePause = async () => {
    if (status === 'running') {
      await pauseSession(user?.id)
    } else if (status === 'paused') {
      await resumeSession(user?.id)
    }
  }

  const handleExtend = async () => {
    await extendSession(300, user?.id)
  }

  const handleStop = async () => {
    await stopSession(user?.id)
  }

  const handleDoneWithTask = async () => {
    if (taskId) {
      try {
        await toggleTask.mutateAsync({ id: taskId, done: true })
      } catch {
        // Continue completing session even if task toggle has issue
      }
    }
    await completeSession(user?.id)
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/focus')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-medium transition-all"
        >
          <X size={16} />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/80 border border-gray-800/80">
          {isBreak ? (
            <>
              <Coffee size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Break Session</span>
            </>
          ) : (
            <>
              <Flame size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-400">Focus Session</span>
            </>
          )}
        </div>

        {interruptions > 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-medium">
            <EyeOff size={14} />
            <span>{interruptions}</span>
          </div>
        ) : (
          <div className="w-16" />
        )}
      </header>

      {/* Center content */}
      <main className="flex flex-col items-center justify-center my-auto space-y-8">
        {/* Task Title if assigned */}
        {taskTitle && (
          <div className="text-center max-w-sm px-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
              Active Task
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-gray-100 truncate">
              {taskTitle}
            </h2>
          </div>
        )}

        {/* Circular Timer Display */}
        <div className="relative flex items-center justify-center">
          <svg className="w-72 h-72 sm:w-80 sm:h-80 -rotate-90 transform" viewBox="0 0 300 300">
            {/* Background track */}
            <circle
              cx="150"
              cy="150"
              r="130"
              className="stroke-gray-900"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Progress track */}
            <circle
              cx="150"
              cy="150"
              r="130"
              className={`transition-all duration-500 ease-linear ${
                isBreak ? 'stroke-emerald-500' : 'stroke-indigo-500'
              }`}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Centered Time readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums">
              {formattedTime}
            </span>
            <span className="mt-2 text-xs font-medium uppercase tracking-widest text-gray-400">
              {status === 'paused' ? 'Paused' : isBreak ? 'Resting' : 'Deep Work'}
            </span>
          </div>
        </div>

        {/* Interruptions hint if any */}
        {interruptions > 0 && (
          <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
            <AlertCircle size={14} />
            {interruptions} tab switch{interruptions > 1 ? 'es' : ''} detected
          </p>
        )}
      </main>

      {/* Bottom controls */}
      <footer className="space-y-4 max-w-sm mx-auto w-full">
        {/* Main action buttons */}
        <div className="flex items-center justify-center gap-4">
          {/* +5 Min */}
          <button
            type="button"
            onClick={handleExtend}
            aria-label="Add 5 minutes"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all active:scale-95"
            title="+5 minutes"
          >
            <Plus size={20} />
            <span className="text-[10px] font-bold mt-0.5">+5m</span>
          </button>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={handleTogglePause}
            aria-label={status === 'running' ? 'Pause session' : 'Resume session'}
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all active:scale-95 ${
              isBreak
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {status === 'running' ? (
              <Pause size={32} className="text-white fill-current" />
            ) : (
              <Play size={32} className="text-white fill-current ml-1" />
            )}
          </button>

          {/* Stop */}
          <button
            type="button"
            onClick={handleStop}
            aria-label="Stop session"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-rose-400 transition-all active:scale-95"
            title="End session early"
          >
            <RotateCcw size={18} />
            <span className="text-[10px] font-bold mt-0.5">Stop</span>
          </button>
        </div>

        {/* Done with task button (if assigned to a task) */}
        {taskId && !isBreak && (
          <button
            type="button"
            onClick={handleDoneWithTask}
            disabled={toggleTask.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gray-900 hover:bg-gray-800 border border-emerald-800/40 text-emerald-400 text-xs font-semibold transition-all"
          >
            <CheckCircle2 size={16} />
            <span>Mark task complete & finish</span>
          </button>
        )}
      </footer>

      {/* Completion / summary sheet modal */}
      <CompletionSheet />
    </div>
  )
}
