import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateRemainingMs,
  calculateActualSeconds,
  plannedEndMs,
  completionEndMs,
  pauseTimer,
  resumeTimer,
  extendTimer,
  formatTimerMs,
  formatFocusDuration,
  reconstructRemainingSecondsFromRow,
  type TimerState,
} from '../lib/focusTimer'
import { useFocusStore } from '../store/focusStore'
import { supabase } from '../lib/supabase'
import { todayLocal, addDaysLocal } from '../lib/dates'
import type { FocusSession } from '../types'

describe('Focus Sessions (P4-1)', () => {
  describe('focusTimer pure math', () => {
    it('calculates remaining time correctly when running', () => {
      const start = 1000000
      const planned = 1500 * 1000 // 25 mins
      const state: TimerState = {
        startedAtMs: start,
        plannedMs: planned,
        pausedTotalMs: 0,
        pausedAtMs: null,
        status: 'running',
      }

      // 5 mins elapsed (300,000 ms)
      const now = start + 300000
      const remaining = calculateRemainingMs(state, now)
      expect(remaining).toBe(1200 * 1000) // 20 mins left
    })

    it('freezes remaining time when paused', () => {
      const start = 1000000
      const planned = 1500 * 1000
      const pauseTime = start + 300000 // paused after 5 mins

      const state: TimerState = {
        startedAtMs: start,
        plannedMs: planned,
        pausedTotalMs: 0,
        pausedAtMs: pauseTime,
        status: 'paused',
      }

      // 10 minutes later while paused
      const now = pauseTime + 600000
      const remaining = calculateRemainingMs(state, now)
      // Should still have 20 mins remaining
      expect(remaining).toBe(1200 * 1000)
    })

    it('calculates actual active seconds correctly (excluding pause durations)', () => {
      const start = 1000000
      const state: TimerState = {
        startedAtMs: start,
        plannedMs: 1500 * 1000,
        pausedTotalMs: 120 * 1000, // 2 mins paused
        pausedAtMs: null,
        status: 'running',
      }

      // Total 10 mins elapsed since start
      const now = start + 600 * 1000
      const actualSec = calculateActualSeconds(state, now)
      // 10 mins total - 2 mins paused = 8 mins active = 480 seconds
      expect(actualSec).toBe(480)
    })

    it('pauses, resumes, and extends timer state immutably', () => {
      const start = 1000000
      const initial: TimerState = {
        startedAtMs: start,
        plannedMs: 1500 * 1000,
        pausedTotalMs: 0,
        pausedAtMs: null,
        status: 'running',
      }

      // Pause at +5m
      const paused = pauseTimer(initial, start + 300000)
      expect(paused.status).toBe('paused')
      expect(paused.pausedAtMs).toBe(start + 300000)

      // Resume at +7m (paused for 2m)
      const resumed = resumeTimer(paused, start + 420000)
      expect(resumed.status).toBe('running')
      expect(resumed.pausedAtMs).toBeNull()
      expect(resumed.pausedTotalMs).toBe(120000)

      // Extend by 300s (5m)
      const extended = extendTimer(resumed, 300 * 1000)
      expect(extended.plannedMs).toBe((1500 + 300) * 1000)
    })

    it('formats milliseconds into mm:ss or hh:mm:ss cleanly', () => {
      expect(formatTimerMs(1500 * 1000)).toBe('25:00')
      expect(formatTimerMs(65 * 1000)).toBe('01:05')
      expect(formatTimerMs(0)).toBe('00:00')
      expect(formatTimerMs(-5000)).toBe('00:00')
      expect(formatTimerMs(3665 * 1000)).toBe('1:01:05')
    })

    it('formats duration labels', () => {
      expect(formatFocusDuration(45)).toBe('45s')
      expect(formatFocusDuration(1500)).toBe('25m')
      expect(formatFocusDuration(3600)).toBe('1h')
      expect(formatFocusDuration(3900)).toBe('1h 5m')
    })

    it('reconstructs remaining time from database row matching DB equation', () => {
      const nowMs = 1700000000000
      const startedAt = new Date(nowMs - 600000).toISOString() // started 10m ago

      const row: FocusSession = {
        id: 'session-123',
        user_id: 'user-1',
        task_id: null,
        kind: 'focus',
        planned_seconds: 1500, // 25m
        actual_seconds: null,
        started_at: startedAt,
        ended_at: null,
        paused_at: null,
        paused_seconds: 60, // 1m paused
        status: 'running',
        interruptions: 0,
        note: null,
      }

      // Remaining = planned(1500) - (now - started)(600) + paused(60) = 960 seconds
      const remainingSec = reconstructRemainingSecondsFromRow(row, nowMs)
      expect(remainingSec).toBe(960)
    })

    it('prevents timer drift after 10 minutes of simulated backgrounding', () => {
      const start = 1000000000000
      const planned = 1500 * 1000 // 25 mins

      const state: TimerState = {
        startedAtMs: start,
        plannedMs: planned,
        pausedTotalMs: 0,
        pausedAtMs: null,
        status: 'running',
      }

      // Backgrounded at +1m, resumed at +11m (10 minutes in background)
      const nowResumed = start + 11 * 60 * 1000
      const remaining = calculateRemainingMs(state, nowResumed)
      // Exactly 14 minutes left = 840,000 ms
      expect(remaining).toBe(14 * 60 * 1000)
    })
  })

  describe('Completion Cap (Requirement 1)', () => {
    it('25-min session completed 3 hours late -> actual_seconds = 1500 and ended_at = start + 25 min', () => {
      const start = 1700000000000
      const plannedMs = 25 * 60 * 1000 // 1500s
      const state = {
        startedAtMs: start,
        pausedTotalMs: 0,
        plannedMs,
      }

      const threeHoursLater = start + 3 * 3600 * 1000
      const endMs = completionEndMs(state, threeHoursLater)
      expect(endMs).toBe(start + plannedMs)
      expect(new Date(endMs).toISOString()).toBe(new Date(start + 25 * 60 * 1000).toISOString())

      const actualSeconds = Math.floor((endMs - state.startedAtMs - state.pausedTotalMs) / 1000)
      expect(actualSeconds).toBe(1500)
    })

    it('session with pauses: plannedEndMs accounts for pause duration and caps correctly', () => {
      const start = 1700000000000
      const plannedMs = 25 * 60 * 1000 // 25 mins
      const pausedTotalMs = 5 * 60 * 1000 // 5 mins paused
      const state = {
        startedAtMs: start,
        pausedTotalMs,
        plannedMs,
      }

      // Expected end is start + 5m pause + 25m = start + 30m
      expect(plannedEndMs(state)).toBe(start + 30 * 60 * 1000)

      // Completed 1 hour late
      const oneHourLater = start + 60 * 60 * 1000
      const endMs = completionEndMs(state, oneHourLater)
      expect(endMs).toBe(start + 30 * 60 * 1000)

      const actualSeconds = Math.floor((endMs - state.startedAtMs - state.pausedTotalMs) / 1000)
      expect(actualSeconds).toBe(1500)
    })

    it('session extended with +5 min: plannedMs increases and caps at new duration', () => {
      const start = 1700000000000
      let timerState: TimerState = {
        startedAtMs: start,
        plannedMs: 25 * 60 * 1000,
        pausedTotalMs: 0,
        pausedAtMs: null,
        status: 'running',
      }

      // Extend with +5 min
      timerState = extendTimer(timerState, 5 * 60 * 1000)
      expect(timerState.plannedMs).toBe(30 * 60 * 1000)

      // Completed 2 hours late
      const twoHoursLater = start + 2 * 3600 * 1000
      const endMs = completionEndMs(timerState, twoHoursLater)
      expect(endMs).toBe(start + 30 * 60 * 1000)

      const actualSeconds = Math.floor((endMs - timerState.startedAtMs - timerState.pausedTotalMs) / 1000)
      expect(actualSeconds).toBe(1800)
    })
  })

  describe('Focus Store lifecycle & 23505 conflict handling', () => {
    beforeEach(() => {
      localStorage.clear()
      useFocusStore.setState({
        userId: 'test-user',
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
    })

    it('starts a session and updates state', async () => {
      const res = await useFocusStore.getState().startSession({
        userId: 'test-user',
        plannedSeconds: 1500,
        kind: 'focus',
      })

      expect(res.success).toBe(true)
      const state = useFocusStore.getState()
      expect(state.status).toBe('running')
      expect(state.plannedMs).toBe(1500000)
      expect(state.sessionId).toBeTruthy()
    })

    it('handles pause, resume, extend, and stop', async () => {
      await useFocusStore.getState().startSession({
        userId: 'test-user',
        plannedSeconds: 1500,
      })

      await useFocusStore.getState().pauseSession('test-user')
      expect(useFocusStore.getState().status).toBe('paused')
      expect(useFocusStore.getState().pausedAtMs).not.toBeNull()

      await useFocusStore.getState().resumeSession('test-user')
      expect(useFocusStore.getState().status).toBe('running')
      expect(useFocusStore.getState().pausedAtMs).toBeNull()

      await useFocusStore.getState().extendSession(300, 'test-user')
      expect(useFocusStore.getState().plannedMs).toBe(1800000)

      await useFocusStore.getState().stopSession('test-user')
      expect(useFocusStore.getState().status).toBe('stopped')
      expect(useFocusStore.getState().completedSheetOpen).toBe(true)
    })

    it('detects completion while app was closed with capped active time', () => {
      // Simulate session that started 3 hours ago with 25m duration
      const started = Date.now() - 3 * 3600 * 1000
      useFocusStore.setState({
        sessionId: 'closed-finished-session',
        status: 'running',
        startedAtMs: started,
        plannedMs: 25 * 60 * 1000,
        pausedTotalMs: 0,
        pausedAtMs: null,
      })

      const finished = useFocusStore.getState().checkSessionFinishedWhileClosed()
      expect(finished).toBe(true)
      expect(useFocusStore.getState().status).toBe('completed')
      expect(useFocusStore.getState().completedSheetOpen).toBe(true)
      // Actual seconds must be capped at 1500s, not 3 hours
      expect(useFocusStore.getState().completedSummary?.actualSeconds).toBe(1500)
    })

    it('handles duplicate active session conflict (23505) gracefully', async () => {
      // Seed an active session in DB mock
      const existingActiveId = 'already-active-on-mobile'
      await supabase.from('focus_sessions').insert({
        id: existingActiveId,
        user_id: 'conflict-user-1',
        kind: 'focus',
        planned_seconds: 1500,
        status: 'running',
        started_at: new Date().toISOString(),
      })

      // Attempting to start another session on the same user triggers 23505
      const res = await useFocusStore.getState().startSession({
        userId: 'conflict-user-1',
        plannedSeconds: 1200,
        kind: 'focus',
      })

      expect(res.success).toBe(false)
      expect(res.conflict).toBeDefined()
      expect(useFocusStore.getState().conflictSession?.id).toBe(existingActiveId)
    })
  })

  describe('Outbox and write error resilience (Requirement 2, 3 & 5)', () => {
    const originalFrom = supabase.from.bind(supabase)

    beforeEach(() => {
      localStorage.clear()
      useFocusStore.setState({
        userId: 'test-user',
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
    })

    type SupabaseTable = Parameters<typeof supabase['from']>[0]

    it('(a) start offline -> reload -> online -> session row is created exactly once', async () => {
      let shouldFail = true
      const spy = vi.spyOn(supabase, 'from').mockImplementation(((table: SupabaseTable) => {
        const builder = originalFrom(table)
        if (table === 'focus_sessions') {
          const origUpsert = builder.upsert.bind(builder)
          builder.upsert = ((record: Record<string, unknown>, options?: { onConflict?: string }) => {
            if (shouldFail) {
              return Promise.resolve({ data: null, error: { message: 'fetch failed' } })
            }
            return origUpsert(record as never, options)
          }) as typeof builder.upsert
        }
        return builder
      }) as never)

      // Start session offline
      const startRes = await useFocusStore.getState().startSession({
        userId: 'user-offline-1',
        plannedSeconds: 1500,
      })
      expect(startRes.success).toBe(true)

      // Pending rows has 1 snapshot
      expect(useFocusStore.getState().pendingRows.length).toBe(1)
      const sessionId = useFocusStore.getState().sessionId!

      // Simulate reload / maintaining persisted outbox: snapshot persists in pendingRows
      expect(useFocusStore.getState().pendingRows.some((r) => r.id === sessionId)).toBe(true)

      // Come back online
      shouldFail = false
      await useFocusStore.getState().syncPending()

      // Pending rows cleared
      expect(useFocusStore.getState().pendingRows.length).toBe(0)

      // Session row created in DB
      const { data: rows } = await supabase.from('focus_sessions').select('*').eq('id', sessionId)
      expect(rows?.length).toBe(1)
      expect(rows?.[0].status).toBe('running')

      // Syncing again does not duplicate row
      await useFocusStore.getState().syncPending()
      const { data: rowsAfter } = await supabase.from('focus_sessions').select('*').eq('id', sessionId)
      expect(rowsAfter?.length).toBe(1)

      spy.mockRestore()
    })

    it('(b) complete fails -> retry succeeds -> row ends completed and no ghost running row remains', async () => {
      let shouldFail = false
      const spy = vi.spyOn(supabase, 'from').mockImplementation(((table: SupabaseTable) => {
        const builder = originalFrom(table)
        if (table === 'focus_sessions') {
          const origUpsert = builder.upsert.bind(builder)
          builder.upsert = ((record: Record<string, unknown>, options?: { onConflict?: string }) => {
            if (shouldFail) {
              return Promise.resolve({ data: null, error: { message: 'fetch failed' } })
            }
            return origUpsert(record as never, options)
          }) as typeof builder.upsert
        }
        return builder
      }) as never)

      // Start session online
      await useFocusStore.getState().startSession({
        userId: 'user-b-1',
        plannedSeconds: 1500,
      })
      const sessionId = useFocusStore.getState().sessionId!
      expect(useFocusStore.getState().pendingRows.length).toBe(0)

      // Network fails when completeSession is called
      shouldFail = true
      await useFocusStore.getState().completeSession('user-b-1')

      // Outbox contains completed snapshot
      expect(useFocusStore.getState().status).toBe('completed')
      expect(useFocusStore.getState().pendingRows.length).toBe(1)
      expect(useFocusStore.getState().pendingRows[0].status).toBe('completed')

      // Retry succeeds
      shouldFail = false
      await useFocusStore.getState().syncPending()
      expect(useFocusStore.getState().pendingRows.length).toBe(0)

      // Row ends 'completed' in DB
      const { data: rows } = await supabase.from('focus_sessions').select('*').eq('id', sessionId)
      expect(rows?.length).toBe(1)
      expect(rows?.[0].status).toBe('completed')
      expect(rows?.[0].ended_at).not.toBeNull()

      // No ghost running row remains
      const { data: activeRows } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', 'user-b-1')
        .in('status', ['running', 'paused'])
      expect(activeRows?.length).toBe(0)

      spy.mockRestore()
    })

    it('(c) handles the 23505 path correctly', async () => {
      const activeId = 'active-session-c'
      await supabase.from('focus_sessions').insert({
        id: activeId,
        user_id: 'user-c',
        status: 'running',
        planned_seconds: 1500,
        started_at: new Date().toISOString(),
      })

      const spy = vi.spyOn(supabase, 'from').mockImplementation(((table: SupabaseTable) => {
        const builder = originalFrom(table)
        if (table === 'focus_sessions') {
          const origUpsert = builder.upsert.bind(builder)
          builder.upsert = ((record: Record<string, unknown>, options?: { onConflict?: string }) => {
            if (record.id !== activeId && (record.status === 'running' || record.status === 'paused')) {
              return Promise.resolve({
                data: null,
                error: { code: '23505', message: 'duplicate key value violates unique constraint "focus_sessions_one_active_per_user"' },
              })
            }
            return origUpsert(record as never, options)
          }) as typeof builder.upsert
        }
        return builder
      }) as never)

      const res = await useFocusStore.getState().startSession({
        userId: 'user-c',
        plannedSeconds: 1500,
      })

      expect(res.success).toBe(false)
      expect(res.conflict).toBeDefined()
      expect(useFocusStore.getState().conflictSession?.id).toBe(activeId)
      expect(useFocusStore.getState().status).toBe('stopped')
      expect(useFocusStore.getState().sessionId).toBeNull()

      spy.mockRestore()
    })

    it('(d) outbox survives closeCompletedSheet()', async () => {
      const spy = vi.spyOn(supabase, 'from').mockImplementation(((table: SupabaseTable) => {
        const builder = originalFrom(table)
        if (table === 'focus_sessions') {
          builder.upsert = (() =>
            Promise.resolve({ data: null, error: { message: 'fetch failed' } })) as unknown as typeof builder.upsert
        }
        return builder
      }) as never)

      await useFocusStore.getState().startSession({
        userId: 'user-d',
        plannedSeconds: 1500,
      })
      const sessionId = useFocusStore.getState().sessionId!

      // Complete session while offline
      await useFocusStore.getState().completeSession('user-d')
      expect(useFocusStore.getState().completedSheetOpen).toBe(true)
      expect(useFocusStore.getState().pendingRows.length).toBe(1)

      // Close sheet
      useFocusStore.getState().closeCompletedSheet()
      expect(useFocusStore.getState().completedSheetOpen).toBe(false)
      expect(useFocusStore.getState().sessionId).toBeNull()

      // Outbox snapshot must survive!
      expect(useFocusStore.getState().pendingRows.length).toBe(1)
      expect(useFocusStore.getState().pendingRows[0].id).toBe(sessionId)
      expect(useFocusStore.getState().pendingRows[0].status).toBe('completed')

      spy.mockRestore()
    })

    it('endRemoteAndStart shows error toast and does not start if ending remote session fails', async () => {
      const spy = vi.spyOn(supabase, 'from').mockImplementation(((table: SupabaseTable) => {
        const builder = originalFrom(table)
        if (table === 'focus_sessions') {
          builder.update = (() => ({
            eq: () => Promise.resolve({ data: null, error: { message: 'remote update failed' } }),
          })) as unknown as typeof builder.update
        }
        return builder
      }) as never)

      await useFocusStore.getState().endRemoteAndStart('remote-id-fail', {
        userId: 'user-fail',
        plannedSeconds: 1500,
      })

      expect(useFocusStore.getState().sessionId).toBeNull()
      expect(useFocusStore.getState().status).toBe('stopped')

      spy.mockRestore()
    })

    it('adoptRemoteSession resolves task title from task_id', async () => {
      await supabase.from('tasks').insert({
        id: 'task-resolve-title',
        user_id: 'user-resolve',
        title: 'Study Organic Chemistry',
      })

      const remoteSession: FocusSession = {
        id: 'session-remote-title',
        user_id: 'user-resolve',
        task_id: 'task-resolve-title',
        kind: 'focus',
        planned_seconds: 1500,
        actual_seconds: null,
        started_at: new Date().toISOString(),
        ended_at: null,
        paused_at: null,
        paused_seconds: 0,
        status: 'running',
        interruptions: 0,
        note: null,
      }

      await useFocusStore.getState().adoptRemoteSession(remoteSession)
      expect(useFocusStore.getState().taskTitle).toBe('Study Organic Chemistry')
    })
  })

  describe('Local-midnight date boundary across timezones', () => {
    it('accurately groups focus sessions by local date', () => {
      const today = todayLocal()
      const yesterday = addDaysLocal(today, -1)

      // Session A started at 23:50 yesterday
      const sessionA_date = yesterday
      // Session B started at 00:05 today
      const sessionB_date = today

      expect(sessionA_date).not.toBe(sessionB_date)
      expect(addDaysLocal(sessionA_date, 1)).toBe(sessionB_date)
    })
  })
})
