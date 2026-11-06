import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Timer, Play, Coffee, Flame } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../hooks/useAuth'
import { useFocusStore } from '../store/focusStore'
import { useFocusTodayStats, useRecentFocusSessions } from '../hooks/useFocus'
import { useDailyTodos } from '../hooks/useDailyTodos'
import { useTasks } from '../hooks/useTasks'
import { RemoteSessionBanner } from '../components/focus/RemoteSessionBanner'
import { safeStorage } from '../lib/safeStorage'
import { formatFocusDuration } from '../lib/focusTimer'

const PRESET_DURATIONS = [25, 45, 60]
const BREAK_DURATIONS = [5, 10, 15]

export default function Focus() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Active store status
  const sessionId = useFocusStore((s) => s.sessionId)
  const localStatus = useFocusStore((s) => s.status)
  const getFormattedRemaining = useFocusStore((s) => s.getFormattedRemaining)
  const startSession = useFocusStore((s) => s.startSession)

  const hasActiveLocalSession =
    Boolean(sessionId) && (localStatus === 'running' || localStatus === 'paused')

  // Queries
  const { data: todayStats } = useFocusTodayStats()
  const { data: recentSessions = [] } = useRecentFocusSessions(5)
  const { data: todos = [] } = useDailyTodos()
  const { data: allTasks = [] } = useTasks()

  // Preferences from safeStorage
  const [selectedMinutes, setSelectedMinutes] = useState<number>(() => {
    const saved = safeStorage.getItem('focusos_pref_focus_min')
    return saved ? parseInt(saved, 10) || 25 : 25
  })
  const [isCustom, setIsCustom] = useState(() => !PRESET_DURATIONS.includes(selectedMinutes))
  const [customInput, setCustomInput] = useState(String(selectedMinutes))

  const [breakMinutes, setBreakMinutes] = useState<number>(() => {
    const saved = safeStorage.getItem('focusos_pref_break_min')
    return saved ? parseInt(saved, 10) || 5 : 5
  })

  // Selected task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Default to passed location state taskId or top Must-Do item from today
  useEffect(() => {
    const stateTaskId = (location.state as { taskId?: string })?.taskId
    if (stateTaskId) {
      setSelectedTaskId(stateTaskId)
      return
    }

    if (!selectedTaskId && todos.length > 0) {
      // Find top must-do task first
      const mustDo = todos.find((t) => t.must_do && t.task_id && !t.done)
      if (mustDo && mustDo.task_id) {
        setSelectedTaskId(mustDo.task_id)
        return
      }
      // Otherwise top undone task
      const firstTask = todos.find((t) => t.task_id && !t.done)
      if (firstTask && firstTask.task_id) {
        setSelectedTaskId(firstTask.task_id)
      }
    }
  }, [location.state, todos, selectedTaskId])

  const handleSelectPreset = (mins: number) => {
    setSelectedMinutes(mins)
    setIsCustom(false)
    setCustomInput(String(mins))
    safeStorage.setItem('focusos_pref_focus_min', String(mins))
  }

  const handleCustomChange = (val: string) => {
    setCustomInput(val)
    const parsed = parseInt(val, 10)
    if (parsed > 0 && parsed <= 1440) {
      setSelectedMinutes(parsed)
      safeStorage.setItem('focusos_pref_focus_min', String(parsed))
    }
  }

  const handleBreakChange = (mins: number) => {
    setBreakMinutes(mins)
    safeStorage.setItem('focusos_pref_break_min', String(mins))
  }

  const selectedTaskObj = allTasks.find((t) => t.id === selectedTaskId)

  const handleStart = async () => {
    const plannedSec = selectedMinutes * 60
    const res = await startSession({
      userId: user?.id,
      taskId: selectedTaskId,
      taskTitle: selectedTaskObj?.title ?? null,
      plannedSeconds: plannedSec,
      kind: 'focus',
      breakPlannedSeconds: breakMinutes * 60,
    })

    if (res.success) {
      navigate('/focus/run')
    }
  }

  return (
    <PageShell title="Focus">
      <div className="pb-28 pt-2 px-3 sm:px-4 max-w-xl mx-auto space-y-6">
        {/* Remote cross-device banner */}
        <RemoteSessionBanner />

        {/* Running local session banner */}
        {hasActiveLocalSession && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono text-xs font-bold animate-pulse">
                <Timer size={20} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Active session in progress
                </h4>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                  {getFormattedRemaining()} remaining • {localStatus}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/focus/run')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              Resume
            </button>
          </div>
        )}

        {/* Today's Focus Overview Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Flame size={14} />
                Focus Today
              </span>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {todayStats?.totalMinutes ?? 0}
                <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1.5">min</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block font-medium">Completed</span>
              <span className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {todayStats?.sessionCount ?? 0}
              </span>
              <span className="text-xs text-gray-400 ml-1">sessions</span>
            </div>
          </div>
        </div>

        {/* Task Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Target Task
          </label>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-1.5 shadow-sm">
            <select
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(e.target.value ? e.target.value : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-transparent text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 border-none"
            >
              <option value="">🎯 Free Focus (No linked task)</option>
              {allTasks
                .filter((t) => t.status !== 'done')
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.priority === 'critical' ? '🔴 ' : task.priority === 'high' ? '🟠 ' : '📋 '}
                    {task.title}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Duration Presets */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Focus Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_DURATIONS.map((mins) => {
              const active = !isCustom && selectedMinutes === mins
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectPreset(mins)}
                  className={`py-3 px-2 rounded-xl text-center font-semibold text-sm transition-all border ${
                    active
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  {mins} min
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`py-3 px-2 rounded-xl text-center font-semibold text-sm transition-all border ${
                isCustom
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              Custom
            </button>
          </div>

          {isCustom && (
            <div className="flex items-center gap-2 pt-1 animate-fade-in">
              <input
                type="number"
                min="1"
                max="300"
                value={customInput}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Minutes"
                className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-center focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-500">minutes (1 - 300)</span>
            </div>
          )}
        </div>

        {/* Optional Break Length */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Coffee size={14} />
            Break After Session
          </label>
          <div className="grid grid-cols-4 gap-2">
            {BREAK_DURATIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleBreakChange(mins)}
                className={`py-2 px-2 rounded-xl text-center font-medium text-xs transition-all border ${
                  breakMinutes === mins
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {mins} min
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleBreakChange(0)}
              className={`py-2 px-2 rounded-xl text-center font-medium text-xs transition-all border ${
                breakMinutes === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              None
            </button>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Play size={20} className="fill-current" />
            Start {selectedMinutes}-Minute Focus Session
          </button>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Recent Sessions
            </h3>
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        session.kind === 'break'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600'
                      }`}
                    >
                      {session.kind === 'break' ? <Coffee size={14} /> : <Timer size={14} />}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {session.tasks?.title || (session.kind === 'break' ? 'Break' : 'Free Focus')}
                      </div>
                      <div className="text-gray-400 dark:text-gray-500 text-[11px]">
                        {new Date(session.started_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {session.status}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-gray-600 dark:text-gray-400 ml-2 shrink-0">
                    {formatFocusDuration(session.actual_seconds || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
