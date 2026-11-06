// Pure timer math for FocusOS focus sessions

export interface TimerState {
  startedAtMs: number
  plannedMs: number
  pausedTotalMs: number
  pausedAtMs: number | null
  status: 'running' | 'paused' | 'completed' | 'stopped'
}

/**
 * Calculates remaining milliseconds.
 * Remaining time is ALWAYS derived from Date.now() / nowMs.
 */
export function calculateRemainingMs(state: TimerState, nowMs = Date.now()): number {
  if (state.status === 'completed') return 0
  if (state.status === 'stopped') {
    // If stopped, compute active elapsed up to pausedAtMs or nowMs
    const endPoint = state.pausedAtMs ?? nowMs
    const activeMs = Math.max(0, endPoint - state.startedAtMs - state.pausedTotalMs)
    return Math.max(0, state.plannedMs - activeMs)
  }

  let activeMs: number
  if (state.status === 'paused') {
    const endPoint = state.pausedAtMs ?? nowMs
    activeMs = Math.max(0, endPoint - state.startedAtMs - state.pausedTotalMs)
  } else {
    // running
    activeMs = Math.max(0, nowMs - state.startedAtMs - state.pausedTotalMs)
  }

  return Math.max(0, state.plannedMs - activeMs)
}

/**
 * Calculates actual active seconds spent (excluding paused periods).
 */
export function calculateActualSeconds(state: TimerState, endMs = Date.now()): number {
  const endPoint = state.status === 'paused' ? (state.pausedAtMs ?? endMs) : endMs
  const activeMs = Math.max(0, endPoint - state.startedAtMs - state.pausedTotalMs)
  return Math.max(0, Math.floor(activeMs / 1000))
}

/**
 * Reconstructs remaining seconds from a database row (e.g. for cross-device view).
 * Formula matches 0012_focus_sessions.sql:
 *   remaining = planned_seconds - (now - started_at) + paused_seconds + (now - paused_at, only while paused)
 */
export function reconstructRemainingSecondsFromRow(
  row: {
    planned_seconds: number
    started_at: string
    paused_seconds: number
    paused_at: string | null
    status: string
  },
  nowMs = Date.now()
): number {
  if (row.status === 'completed') return 0
  const startedAtMs = new Date(row.started_at).getTime()
  const plannedMs = row.planned_seconds * 1000
  const pausedTotalMs = (row.paused_seconds || 0) * 1000
  const pausedAtMs = row.paused_at ? new Date(row.paused_at).getTime() : null

  const timerState: TimerState = {
    startedAtMs,
    plannedMs,
    pausedTotalMs,
    pausedAtMs,
    status: row.status as TimerState['status'],
  }

  const remainingMs = calculateRemainingMs(timerState, nowMs)
  return Math.ceil(remainingMs / 1000)
}

/**
 * Applies a pause transition.
 */
export function pauseTimer(state: TimerState, nowMs = Date.now()): TimerState {
  if (state.status !== 'running') return state
  return {
    ...state,
    status: 'paused',
    pausedAtMs: nowMs,
  }
}

/**
 * Applies a resume transition.
 */
export function resumeTimer(state: TimerState, nowMs = Date.now()): TimerState {
  if (state.status !== 'paused') return state
  const additionalPause = state.pausedAtMs ? Math.max(0, nowMs - state.pausedAtMs) : 0
  return {
    ...state,
    status: 'running',
    pausedTotalMs: state.pausedTotalMs + additionalPause,
    pausedAtMs: null,
  }
}

/**
 * Extends the planned time by additional milliseconds.
 */
export function extendTimer(state: TimerState, addMs: number): TimerState {
  return {
    ...state,
    plannedMs: state.plannedMs + addMs,
  }
}

/**
 * Formats milliseconds into mm:ss or hh:mm:ss.
 */
export function formatTimerMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Formats total seconds into human-readable e.g. "25 min" or "1 hr 15 min".
 */
export function formatFocusDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`
  }
  const minutes = Math.round(totalSeconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMin = minutes % 60
  if (remainingMin === 0) return `${hours}h`
  return `${hours}h ${remainingMin}m`
}
