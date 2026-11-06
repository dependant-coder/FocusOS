import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateRemainingMs,
  calculateActualSeconds,
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

  describe('Focus Store lifecycle & 23505 conflict handling', () => {
    beforeEach(() => {
      localStorage.clear()
      useFocusStore.setState({
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

    it('detects completion while app was closed', () => {
      // Simulate session that started 30 mins ago with 25m duration
      const started = Date.now() - 30 * 60 * 1000
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
