import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import toast from 'react-hot-toast'
import { safeStorage } from '../lib/safeStorage'
import { randomUUID } from '../lib/uuid'
import {
  calculateRemainingMs,
  calculateActualSeconds,
  completionEndMs,
  pauseTimer,
  resumeTimer,
  extendTimer,
  formatTimerMs,
  type TimerState,
} from '../lib/focusTimer'
import { supabase } from '../lib/supabase'
import type { FocusSession, FocusKind, FocusStatus } from '../types'

export const FOCUS_STORE_PERSIST_KEY = 'focusos_active_focus_session'

export interface FocusRowSnapshot {
  id: string
  user_id: string
  task_id: string | null
  kind: FocusKind
  planned_seconds: number
  actual_seconds: number | null
  started_at: string
  ended_at: string | null
  paused_at: string | null
  paused_seconds: number
  status: FocusStatus
  interruptions: number
  note: string | null
  rev?: number
  attempts?: number
}

export interface PersistedFocusState {
  ownerUserId: string | null
  userId: string | null
  sessionId: string | null
  taskId: string | null
  taskTitle: string | null
  kind: FocusKind
  startedAtMs: number
  plannedMs: number
  pausedTotalMs: number
  pausedAtMs: number | null
  status: FocusStatus
  interruptions: number
  note: string | null
  breakPlannedSeconds: number
  conflictSession: FocusSession | null
  completedSheetOpen: boolean
  completedSummary: {
    sessionId: string
    taskId: string | null
    taskTitle: string | null
    kind: FocusKind
    actualSeconds: number
    plannedSeconds: number
    status: 'completed' | 'stopped'
  } | null
  pendingRows: FocusRowSnapshot[]
}

export interface FocusStoreActions {
  startSession: (params: {
    userId?: string
    taskId?: string | null
    taskTitle?: string | null
    plannedSeconds: number
    kind?: FocusKind
    breakPlannedSeconds?: number
  }) => Promise<{ success: boolean; conflict?: FocusSession | null }>
  pauseSession: (userId?: string) => Promise<void>
  resumeSession: (userId?: string) => Promise<void>
  extendSession: (seconds: number, userId?: string) => Promise<void>
  stopSession: (userId?: string) => Promise<void>
  completeSession: (userId?: string) => Promise<void>
  incrementInterruptions: (userId?: string) => void
  closeCompletedSheet: () => void
  clearConflict: () => void
  adoptRemoteSession: (session: FocusSession, taskTitle?: string | null) => Promise<void>
  endRemoteAndStart: (remoteSessionId: string, startParams: Parameters<FocusStoreActions['startSession']>[0]) => Promise<void>
  getRemainingMs: (nowMs?: number) => number
  getFormattedRemaining: (nowMs?: number) => string
  checkSessionFinishedWhileClosed: () => boolean
  syncPending: () => Promise<void>
  reset: () => void
}

// Outbox sync helpers & monotonic rev counter
let syncInProgress = false
let resyncRequested = false
let revCounter = 0
let backoffTimer: ReturnType<typeof setTimeout> | null = null
let backoffDelay = 1000

function scheduleRetry() {
  if (backoffTimer) clearTimeout(backoffTimer)
  backoffTimer = setTimeout(() => {
    backoffTimer = null
    useFocusStore.getState().syncPending()
  }, backoffDelay)
  backoffDelay = Math.min(backoffDelay * 2, 30000)
}

function updatePendingRow(snapshot: FocusRowSnapshot) {
  revCounter += 1
  const current = useFocusStore.getState().pendingRows || []
  const idx = current.findIndex((r) => r.id === snapshot.id)
  const existingAttempts = idx >= 0 ? current[idx].attempts ?? 0 : 0

  const taggedSnapshot: FocusRowSnapshot = {
    ...snapshot,
    rev: revCounter,
    attempts: snapshot.attempts ?? existingAttempts,
  }

  let updated: FocusRowSnapshot[]
  if (idx >= 0) {
    updated = [...current]
    updated[idx] = taggedSnapshot
  } else {
    updated = [...current, taggedSnapshot]
  }
  useFocusStore.setState({ pendingRows: updated })
}

function isPermanentError(error: { code?: string; status?: number; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = error.code ? String(error.code) : ''
  const status = error.status ? Number(error.status) : 0
  const msg = error.message || ''

  // Transient network errors
  if (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return false
  }
  // 5xx server errors
  if (status >= 500) return false
  // Rate limit
  if (status === 429) return false

  // 23514 check constraint violation, 42501 RLS error, or 4xx client errors
  if (
    code === '23514' ||
    code === '42501' ||
    code.startsWith('4') ||
    code.startsWith('23') ||
    (status >= 400 && status < 500)
  ) {
    return true
  }

  return false
}

export const useFocusStore = create<PersistedFocusState & FocusStoreActions>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      userId: null,
      sessionId: null,
      taskId: null,
      taskTitle: null,
      kind: 'focus',
      startedAtMs: 0,
      plannedMs: 0,
      pausedTotalMs: 0,
      pausedAtMs: null,
      status: 'stopped',
      interruptions: 0,
      note: null,
      breakPlannedSeconds: 300,
      conflictSession: null,
      completedSheetOpen: false,
      completedSummary: null,
      pendingRows: [],

      reset: () => {
        if (backoffTimer) {
          clearTimeout(backoffTimer)
          backoffTimer = null
        }
        syncInProgress = false
        resyncRequested = false
        set({
          ownerUserId: null,
          userId: null,
          sessionId: null,
          taskId: null,
          taskTitle: null,
          kind: 'focus',
          startedAtMs: 0,
          plannedMs: 0,
          pausedTotalMs: 0,
          pausedAtMs: null,
          status: 'stopped',
          interruptions: 0,
          note: null,
          conflictSession: null,
          completedSheetOpen: false,
          completedSummary: null,
          pendingRows: [],
        })
      },

      getRemainingMs: (nowMs = Date.now()) => {
        const state = get()
        if (!state.sessionId || state.status === 'stopped' || state.status === 'completed') {
          return 0
        }
        const timerState: TimerState = {
          startedAtMs: state.startedAtMs,
          plannedMs: state.plannedMs,
          pausedTotalMs: state.pausedTotalMs,
          pausedAtMs: state.pausedAtMs,
          status: state.status,
        }
        return calculateRemainingMs(timerState, nowMs)
      },

      getFormattedRemaining: (nowMs = Date.now()) => {
        const ms = get().getRemainingMs(nowMs)
        return formatTimerMs(ms)
      },

      checkSessionFinishedWhileClosed: () => {
        const state = get()
        if (state.sessionId && state.status === 'running') {
          const remaining = get().getRemainingMs()
          if (remaining <= 0) {
            get().completeSession()
            return true
          }
        }
        return false
      },

      syncPending: async () => {
        if (syncInProgress) {
          resyncRequested = true
          return
        }
        const initialPending = get().pendingRows
        if (!initialPending || initialPending.length === 0) return

        syncInProgress = true
        try {
          let keepGoing = true
          while (keepGoing) {
            resyncRequested = false
            const currentPending = get().pendingRows
            if (!currentPending || currentPending.length === 0) {
              break
            }

            let progressMade = false
            let hadTransientError = false

            for (const snapshot of [...currentPending]) {
              // Ensure this exact snapshot version is still in pendingRows
              const currentItem = get().pendingRows.find(
                (r) => r.id === snapshot.id && r.rev === snapshot.rev
              )
              if (!currentItem) {
                continue
              }

              const { rev: _rev, attempts: _attempts, ...dbPayload } = snapshot
              const { error } = await supabase
                .from('focus_sessions')
                .upsert(dbPayload as never, { onConflict: 'id' })

              if (!error) {
                progressMade = true
                // Remove row ONLY if the current row still has the same rev as the one uploaded
                set((prev) => ({
                  pendingRows: prev.pendingRows.filter(
                    (r) => !(r.id === snapshot.id && r.rev === snapshot.rev)
                  ),
                }))
              } else {
                const is23505 =
                  error.code === '23505' ||
                  error.message?.includes('23505') ||
                  error.message?.includes('focus_sessions_one_active_per_user')

                if (is23505 && (snapshot.status === 'running' || snapshot.status === 'paused')) {
                  progressMade = true
                  const { data: conflict } = await supabase
                    .from('focus_sessions')
                    .select('*')
                    .eq('user_id', snapshot.user_id)
                    .in('status', ['running', 'paused'])
                    .maybeSingle()

                  set((prev) => ({
                    conflictSession: conflict,
                    status: 'stopped',
                    sessionId: null,
                    pendingRows: prev.pendingRows.filter(
                      (r) => !(r.id === snapshot.id && r.rev === snapshot.rev)
                    ),
                  }))
                } else if (isPermanentError(error)) {
                  const nextAttempts = (snapshot.attempts || 0) + 1
                  if (nextAttempts >= 5) {
                    progressMade = true
                    console.error('Dropping poisoned focus_session snapshot after 5 failed attempts:', snapshot, error)
                    toast.error('Some offline changes could not be saved')
                    set((prev) => ({
                      pendingRows: prev.pendingRows.filter((r) => r.id !== snapshot.id),
                    }))
                  } else {
                    set((prev) => ({
                      pendingRows: prev.pendingRows.map((r) =>
                        r.id === snapshot.id && r.rev === snapshot.rev
                          ? { ...r, attempts: nextAttempts }
                          : r
                      ),
                    }))
                  }
                } else {
                  hadTransientError = true
                }
              }
            }

            if (hadTransientError) {
              scheduleRetry()
              break
            } else {
              backoffDelay = 1000
            }

            if (get().pendingRows.length === 0) {
              break
            }

            if (!progressMade && !resyncRequested) {
              keepGoing = false
            }
          }
        } finally {
          syncInProgress = false
        }
      },

      startSession: async ({
        userId,
        taskId = null,
        taskTitle = null,
        plannedSeconds,
        kind = 'focus',
        breakPlannedSeconds = 300,
      }) => {
        const id = randomUUID()
        const nowMs = Date.now()
        const plannedMs = plannedSeconds * 1000

        let effectiveUserId = userId || get().userId
        if (!effectiveUserId) {
          const authUser = (await supabase.auth.getUser()).data.user
          if (authUser?.id) {
            effectiveUserId = authUser.id
          }
        }
        if (effectiveUserId) {
          set({ userId: effectiveUserId, ownerUserId: effectiveUserId })
        }

        set({
          sessionId: id,
          taskId,
          taskTitle,
          kind,
          startedAtMs: nowMs,
          plannedMs,
          pausedTotalMs: 0,
          pausedAtMs: null,
          status: 'running',
          interruptions: 0,
          note: null,
          breakPlannedSeconds,
          conflictSession: null,
          completedSheetOpen: false,
          completedSummary: null,
        })

        const snapshot: FocusRowSnapshot = {
          id,
          user_id: effectiveUserId || '',
          task_id: taskId,
          kind,
          planned_seconds: plannedSeconds,
          actual_seconds: null,
          started_at: new Date(nowMs).toISOString(),
          ended_at: null,
          paused_at: null,
          paused_seconds: 0,
          status: 'running',
          interruptions: 0,
          note: null,
        }

        updatePendingRow(snapshot)
        await get().syncPending()

        const afterState = get()
        if (afterState.conflictSession) {
          return { success: false, conflict: afterState.conflictSession }
        }

        return { success: true }
      },

      pauseSession: async (userId) => {
        const state = get()
        if (state.status !== 'running' || !state.sessionId) return

        const nowMs = Date.now()
        const timerState: TimerState = {
          startedAtMs: state.startedAtMs,
          plannedMs: state.plannedMs,
          pausedTotalMs: state.pausedTotalMs,
          pausedAtMs: state.pausedAtMs,
          status: state.status,
        }
        const updated = pauseTimer(timerState, nowMs)
        const actualSeconds = calculateActualSeconds(updated, nowMs)

        set({
          status: 'paused',
          pausedAtMs: updated.pausedAtMs,
        })

        const effectiveUserId =
          userId ||
          state.userId ||
          state.pendingRows.find((r) => r.id === state.sessionId)?.user_id ||
          ''

        const existingSnapshot = state.pendingRows.find((r) => r.id === state.sessionId)

        const snapshot: FocusRowSnapshot = {
          id: state.sessionId,
          user_id: effectiveUserId,
          task_id: state.taskId,
          kind: state.kind,
          planned_seconds: Math.floor(state.plannedMs / 1000),
          actual_seconds: actualSeconds,
          started_at: existingSnapshot?.started_at || new Date(state.startedAtMs).toISOString(),
          ended_at: null,
          paused_at: new Date(nowMs).toISOString(),
          paused_seconds: Math.floor(updated.pausedTotalMs / 1000),
          status: 'paused',
          interruptions: state.interruptions,
          note: state.note,
        }

        updatePendingRow(snapshot)
        get().syncPending()
      },

      resumeSession: async (userId) => {
        const state = get()
        if (state.status !== 'paused' || !state.sessionId) return

        const nowMs = Date.now()
        const timerState: TimerState = {
          startedAtMs: state.startedAtMs,
          plannedMs: state.plannedMs,
          pausedTotalMs: state.pausedTotalMs,
          pausedAtMs: state.pausedAtMs,
          status: state.status,
        }
        const updated = resumeTimer(timerState, nowMs)
        const actualSeconds = calculateActualSeconds(updated, nowMs)

        set({
          status: 'running',
          pausedTotalMs: updated.pausedTotalMs,
          pausedAtMs: null,
        })

        const effectiveUserId =
          userId ||
          state.userId ||
          state.pendingRows.find((r) => r.id === state.sessionId)?.user_id ||
          ''

        const existingSnapshot = state.pendingRows.find((r) => r.id === state.sessionId)

        const snapshot: FocusRowSnapshot = {
          id: state.sessionId,
          user_id: effectiveUserId,
          task_id: state.taskId,
          kind: state.kind,
          planned_seconds: Math.floor(state.plannedMs / 1000),
          actual_seconds: actualSeconds,
          started_at: existingSnapshot?.started_at || new Date(state.startedAtMs).toISOString(),
          ended_at: null,
          paused_at: null,
          paused_seconds: Math.floor(updated.pausedTotalMs / 1000),
          status: 'running',
          interruptions: state.interruptions,
          note: state.note,
        }

        updatePendingRow(snapshot)
        get().syncPending()
      },

      extendSession: async (seconds: number, userId) => {
        const state = get()
        if (!state.sessionId) return

        const addMs = seconds * 1000
        const timerState: TimerState = {
          startedAtMs: state.startedAtMs,
          plannedMs: state.plannedMs,
          pausedTotalMs: state.pausedTotalMs,
          pausedAtMs: state.pausedAtMs,
          status: state.status,
        }
        const updated = extendTimer(timerState, addMs)

        set({
          plannedMs: updated.plannedMs,
        })

        const effectiveUserId =
          userId ||
          state.userId ||
          state.pendingRows.find((r) => r.id === state.sessionId)?.user_id ||
          ''

        const existingSnapshot = state.pendingRows.find((r) => r.id === state.sessionId)
        const currentActual = calculateActualSeconds(updated, Date.now())

        const snapshot: FocusRowSnapshot = {
          id: state.sessionId,
          user_id: effectiveUserId,
          task_id: state.taskId,
          kind: state.kind,
          planned_seconds: Math.floor(updated.plannedMs / 1000),
          actual_seconds: existingSnapshot?.actual_seconds ?? currentActual,
          started_at: existingSnapshot?.started_at || new Date(state.startedAtMs).toISOString(),
          ended_at: existingSnapshot?.ended_at || null,
          paused_at: state.pausedAtMs ? new Date(state.pausedAtMs).toISOString() : null,
          paused_seconds: Math.floor(state.pausedTotalMs / 1000),
          status: state.status,
          interruptions: state.interruptions,
          note: state.note,
        }

        updatePendingRow(snapshot)
        get().syncPending()
      },

      stopSession: async (userId) => {
        const state = get()
        if (!state.sessionId) return

        const nowMs = Date.now()
        const timerState: TimerState = {
          startedAtMs: state.startedAtMs,
          plannedMs: state.plannedMs,
          pausedTotalMs: state.pausedTotalMs,
          pausedAtMs: state.pausedAtMs,
          status: state.status,
        }
        const actualSeconds = calculateActualSeconds(timerState, nowMs)
        const sessionId = state.sessionId
        const plannedSeconds = Math.floor(state.plannedMs / 1000)

        set({
          status: 'stopped',
          completedSheetOpen: true,
          completedSummary: {
            sessionId,
            taskId: state.taskId,
            taskTitle: state.taskTitle,
            kind: state.kind,
            actualSeconds,
            plannedSeconds,
            status: 'stopped',
          },
        })

        const effectiveUserId =
          userId ||
          state.userId ||
          state.pendingRows.find((r) => r.id === sessionId)?.user_id ||
          ''

        const existingSnapshot = state.pendingRows.find((r) => r.id === sessionId)

        const snapshot: FocusRowSnapshot = {
          id: sessionId,
          user_id: effectiveUserId,
          task_id: state.taskId,
          kind: state.kind,
          planned_seconds: plannedSeconds,
          actual_seconds: actualSeconds,
          started_at: existingSnapshot?.started_at || new Date(state.startedAtMs).toISOString(),
          ended_at: new Date(nowMs).toISOString(),
          paused_at: null,
          paused_seconds: Math.floor(state.pausedTotalMs / 1000),
          status: 'stopped',
          interruptions: state.interruptions,
          note: state.note,
        }

        updatePendingRow(snapshot)
        get().syncPending()
      },

      completeSession: async (userId) => {
        const state = get()
        if (!state.sessionId) return

        const nowMs = Date.now()
        const timerState: TimerState = {
          startedAtMs: state.startedAtMs,
          plannedMs: state.plannedMs,
          pausedTotalMs: state.pausedTotalMs,
          pausedAtMs: state.pausedAtMs,
          status: state.status,
        }

        // Completion Cap: ended_at = completionEndMs and actual_seconds = floor((completionEndMs - startedAtMs - pausedTotalMs)/1000)
        const compEnd = completionEndMs(timerState, nowMs)
        const endedAt = new Date(compEnd).toISOString()
        const actualSeconds = Math.max(
          0,
          Math.floor((compEnd - state.startedAtMs - state.pausedTotalMs) / 1000)
        )
        const sessionId = state.sessionId
        const plannedSeconds = Math.floor(state.plannedMs / 1000)

        set({
          status: 'completed',
          completedSheetOpen: true,
          completedSummary: {
            sessionId,
            taskId: state.taskId,
            taskTitle: state.taskTitle,
            kind: state.kind,
            actualSeconds,
            plannedSeconds,
            status: 'completed',
          },
        })

        const effectiveUserId =
          userId ||
          state.userId ||
          state.pendingRows.find((r) => r.id === sessionId)?.user_id ||
          ''

        const existingSnapshot = state.pendingRows.find((r) => r.id === sessionId)

        const snapshot: FocusRowSnapshot = {
          id: sessionId,
          user_id: effectiveUserId,
          task_id: state.taskId,
          kind: state.kind,
          planned_seconds: plannedSeconds,
          actual_seconds: actualSeconds,
          started_at: existingSnapshot?.started_at || new Date(state.startedAtMs).toISOString(),
          ended_at: endedAt,
          paused_at: null,
          paused_seconds: Math.floor(state.pausedTotalMs / 1000),
          status: 'completed',
          interruptions: state.interruptions,
          note: state.note,
        }

        updatePendingRow(snapshot)
        get().syncPending()
      },

      incrementInterruptions: (userId) => {
        const state = get()
        const next = state.interruptions + 1
        set({ interruptions: next })

        if (state.sessionId) {
          const effectiveUserId =
            userId ||
            state.userId ||
            state.pendingRows.find((r) => r.id === state.sessionId)?.user_id ||
            ''

          const existingSnapshot = state.pendingRows.find((r) => r.id === state.sessionId)
          const timerState: TimerState = {
            startedAtMs: state.startedAtMs,
            plannedMs: state.plannedMs,
            pausedTotalMs: state.pausedTotalMs,
            pausedAtMs: state.pausedAtMs,
            status: state.status,
          }
          const actualSeconds = calculateActualSeconds(timerState, Date.now())

          const snapshot: FocusRowSnapshot = {
            id: state.sessionId,
            user_id: effectiveUserId,
            task_id: state.taskId,
            kind: state.kind,
            planned_seconds: Math.floor(state.plannedMs / 1000),
            actual_seconds: existingSnapshot?.actual_seconds ?? actualSeconds,
            started_at: existingSnapshot?.started_at || new Date(state.startedAtMs).toISOString(),
            ended_at: existingSnapshot?.ended_at || null,
            paused_at: state.pausedAtMs ? new Date(state.pausedAtMs).toISOString() : null,
            paused_seconds: Math.floor(state.pausedTotalMs / 1000),
            status: state.status,
            interruptions: next,
            note: state.note,
          }

          updatePendingRow(snapshot)
          get().syncPending()
        }
      },

      closeCompletedSheet: () => {
        set({
          completedSheetOpen: false,
          sessionId: null,
          taskId: null,
          taskTitle: null,
        })
      },

      clearConflict: () => {
        set({ conflictSession: null })
      },

      adoptRemoteSession: async (session: FocusSession, taskTitle?: string | null) => {
        const startedAtMs = new Date(session.started_at).getTime()
        const pausedAtMs = session.paused_at ? new Date(session.paused_at).getTime() : null
        const title =
          taskTitle ||
          ('tasks' in session && (session as { tasks?: { title?: string } }).tasks?.title) ||
          null

        set({
          ownerUserId: session.user_id,
          userId: session.user_id,
          sessionId: session.id,
          taskId: session.task_id,
          taskTitle: title,
          kind: session.kind as FocusKind,
          startedAtMs,
          plannedMs: session.planned_seconds * 1000,
          pausedTotalMs: (session.paused_seconds || 0) * 1000,
          pausedAtMs,
          status: session.status as FocusStatus,
          interruptions: session.interruptions || 0,
          note: session.note,
          conflictSession: null,
        })

        if (!title && session.task_id) {
          const { data: t } = await supabase
            .from('tasks')
            .select('title')
            .eq('id', session.task_id)
            .maybeSingle()

          if (t?.title) {
            set({ taskTitle: t.title })
          }
        }
      },

      endRemoteAndStart: async (remoteSessionId, startParams) => {
        const now = new Date().toISOString()
        const { error } = await supabase
          .from('focus_sessions')
          .update({
            status: 'stopped',
            ended_at: now,
            paused_at: null,
          })
          .eq('id', remoteSessionId)

        if (error) {
          toast.error('Failed to end remote session')
          return
        }

        await get().startSession(startParams)
      },
    }),
    {
      name: FOCUS_STORE_PERSIST_KEY,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        userId: state.userId,
        sessionId: state.sessionId,
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        kind: state.kind,
        startedAtMs: state.startedAtMs,
        plannedMs: state.plannedMs,
        pausedTotalMs: state.pausedTotalMs,
        pausedAtMs: state.pausedAtMs,
        status: state.status,
        interruptions: state.interruptions,
        note: state.note,
        breakPlannedSeconds: state.breakPlannedSeconds,
        completedSheetOpen: state.completedSheetOpen,
        completedSummary: state.completedSummary,
        pendingRows: state.pendingRows,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.pendingRows && state.pendingRows.length > 0) {
          setTimeout(() => {
            useFocusStore.getState().syncPending()
          }, 0)
        }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    backoffDelay = 1000
    useFocusStore.getState().syncPending()
  })
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      useFocusStore.getState().syncPending()
    }
  })
}
