import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safeStorage } from '../lib/safeStorage'
import { randomUUID } from '../lib/uuid'
import {
  calculateRemainingMs,
  calculateActualSeconds,
  pauseTimer,
  resumeTimer,
  extendTimer,
  formatTimerMs,
  type TimerState,
} from '../lib/focusTimer'
import { supabase } from '../lib/supabase'
import type { FocusSession, FocusKind, FocusStatus } from '../types'

export interface PersistedFocusState {
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
}

interface FocusStoreActions {
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
  adoptRemoteSession: (session: FocusSession) => void
  endRemoteAndStart: (remoteSessionId: string, startParams: Parameters<FocusStoreActions['startSession']>[0]) => Promise<void>
  getRemainingMs: (nowMs?: number) => number
  getFormattedRemaining: (nowMs?: number) => string
  checkSessionFinishedWhileClosed: () => boolean
}

export const useFocusStore = create<PersistedFocusState & FocusStoreActions>()(
  persist(
    (set, get) => ({
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
            // It finished while app was closed!
            get().completeSession()
            return true
          }
        }
        return false
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

        // Best effort / local-first DB sync
        try {
          const effectiveUserId = userId || (await supabase.auth.getUser()).data.user?.id
          if (effectiveUserId) {
            const { error } = await supabase.from('focus_sessions').insert({
              id,
              user_id: effectiveUserId,
              task_id: taskId,
              kind,
              planned_seconds: plannedSeconds,
              started_at: new Date(nowMs).toISOString(),
              status: 'running',
              paused_seconds: 0,
              interruptions: 0,
            })

            if (error) {
              // Check 23505 unique conflict (already running session on another device)
              if (
                error.code === '23505' ||
                error.message?.includes('23505') ||
                error.message?.includes('focus_sessions_one_active_per_user')
              ) {
                const { data: conflict } = await supabase
                  .from('focus_sessions')
                  .select('*')
                  .eq('user_id', effectiveUserId)
                  .in('status', ['running', 'paused'])
                  .maybeSingle()

                set({
                  conflictSession: conflict,
                  status: 'stopped',
                  sessionId: null,
                })
                return { success: false, conflict }
              }
            }
          }
        } catch (err) {
          console.warn('[FocusStore] Non-fatal offline start session error:', err)
        }

        return { success: true }
      },

      pauseSession: async (_userId) => {
        const state = get()
        if (state.status !== 'running') return

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

        if (state.sessionId) {
          try {
            await supabase
              .from('focus_sessions')
              .update({
                status: 'paused',
                paused_at: new Date(nowMs).toISOString(),
                paused_seconds: Math.floor(updated.pausedTotalMs / 1000),
                actual_seconds: actualSeconds,
              })
              .eq('id', state.sessionId)
          } catch {
            // best-effort offline
          }
        }
      },

      resumeSession: async (_userId) => {
        const state = get()
        if (state.status !== 'paused') return

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

        if (state.sessionId) {
          try {
            await supabase
              .from('focus_sessions')
              .update({
                status: 'running',
                paused_at: null,
                paused_seconds: Math.floor(updated.pausedTotalMs / 1000),
                actual_seconds: actualSeconds,
              })
              .eq('id', state.sessionId)
          } catch {
            // best-effort offline
          }
        }
      },

      extendSession: async (seconds: number, _userId) => {
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

        try {
          await supabase
            .from('focus_sessions')
            .update({
              planned_seconds: Math.floor(updated.plannedMs / 1000),
            })
            .eq('id', state.sessionId)
        } catch {
          // best-effort offline
        }
      },

      stopSession: async (_userId) => {
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

        try {
          await supabase
            .from('focus_sessions')
            .update({
              status: 'stopped',
              ended_at: new Date(nowMs).toISOString(),
              actual_seconds: actualSeconds,
              paused_at: null,
              paused_seconds: Math.floor(state.pausedTotalMs / 1000),
              interruptions: state.interruptions,
            })
            .eq('id', sessionId)
        } catch {
          // best-effort offline
        }
      },

      completeSession: async (_userId) => {
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

        try {
          await supabase
            .from('focus_sessions')
            .update({
              status: 'completed',
              ended_at: new Date(nowMs).toISOString(),
              actual_seconds: actualSeconds,
              paused_at: null,
              paused_seconds: Math.floor(state.pausedTotalMs / 1000),
              interruptions: state.interruptions,
            })
            .eq('id', sessionId)
        } catch {
          // best-effort offline
        }
      },

      incrementInterruptions: (userId) => {
        const state = get()
        const next = state.interruptions + 1
        set({ interruptions: next })
        if (state.sessionId && userId) {
          supabase
            .from('focus_sessions')
            .update({ interruptions: next })
            .eq('id', state.sessionId)
            .then(() => {})
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

      adoptRemoteSession: (session: FocusSession) => {
        const startedAtMs = new Date(session.started_at).getTime()
        const pausedAtMs = session.paused_at ? new Date(session.paused_at).getTime() : null
        set({
          sessionId: session.id,
          taskId: session.task_id,
          taskTitle: null, // will be resolved if task_id exists
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
      },

      endRemoteAndStart: async (remoteSessionId, startParams) => {
        try {
          const now = new Date().toISOString()
          await supabase
            .from('focus_sessions')
            .update({
              status: 'stopped',
              ended_at: now,
              paused_at: null,
            })
            .eq('id', remoteSessionId)
        } catch {
          // ignore
        }
        await get().startSession(startParams)
      },
    }),
    {
      name: 'focusos_active_focus_session',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
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
      }),
    }
  )
)
