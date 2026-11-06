import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useFocusStore } from '../store/focusStore'
import { todayLocal, parseLocalDate, addDaysLocal } from '../lib/dates'
import { calculateActualSeconds, reconstructRemainingSecondsFromRow } from '../lib/focusTimer'
import type { FocusSession } from '../types'

export interface FocusSessionWithTask extends FocusSession {
  tasks?: {
    id: string
    title: string
  } | null
}

/**
 * Hook to retrieve and subscribe to the currently active remote session.
 * Used for detecting when a session is running on another device.
 */
export function useActiveRemoteSession() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const localSessionId = useFocusStore((s) => s.sessionId)
  const localStatus = useFocusStore((s) => s.status)

  const queryKey = useMemo(() => ['active_focus_session', user?.id], [user?.id])

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<FocusSessionWithTask | null> => {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*, tasks(id, title)')
        .eq('user_id', user!.id)
        .in('status', ['running', 'paused'])
        .maybeSingle()

      if (error) throw error
      return (data as unknown as FocusSessionWithTask) ?? null
    },
    refetchInterval: 10000,
  })

  // Realtime subscription for instant cross-device updates
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`focus_sessions_active_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focus_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey })
          qc.invalidateQueries({ queryKey: ['focus_today_stats'] })
          qc.invalidateQueries({ queryKey: ['recent_focus_sessions'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, qc, queryKey])

  const remoteSession = query.data
  const isRunningOnAnotherDevice =
    !!remoteSession &&
    (remoteSession.status === 'running' || remoteSession.status === 'paused') &&
    remoteSession.id !== localSessionId

  const remainingSeconds = remoteSession
    ? reconstructRemainingSecondsFromRow(remoteSession)
    : 0

  return {
    ...query,
    remoteSession,
    isRunningOnAnotherDevice,
    remainingSeconds,
    localStatus,
  }
}

/**
 * Hook to get today's focus stats (sum of actual_seconds of focus sessions started today).
 * Also incorporates any currently active local session running today.
 */
export function useFocusTodayStats() {
  const { user } = useAuth()
  const localSessionId = useFocusStore((s) => s.sessionId)
  const localStatus = useFocusStore((s) => s.status)
  const localKind = useFocusStore((s) => s.kind)
  const localStartedAt = useFocusStore((s) => s.startedAtMs)
  const localPlannedMs = useFocusStore((s) => s.plannedMs)
  const localPausedTotalMs = useFocusStore((s) => s.pausedTotalMs)
  const localPausedAt = useFocusStore((s) => s.pausedAtMs)

  const todayStr = todayLocal()
  const dayStartISO = parseLocalDate(todayStr).toISOString()
  const nextDayStartISO = parseLocalDate(addDaysLocal(todayStr, 1)).toISOString()

  return useQuery({
    queryKey: [
      'focus_today_stats',
      user?.id,
      todayStr,
      localSessionId,
      localStatus,
    ],
    enabled: !!user,
    queryFn: async () => {
      // Fetch completed or stopped focus sessions started today (local midnight to next local midnight)
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('id, actual_seconds, kind, status, started_at')
        .eq('user_id', user!.id)
        .eq('kind', 'focus')
        .gte('started_at', dayStartISO)
        .lt('started_at', nextDayStartISO)
        .order('id')

      if (error) throw error

      const completedSessions = (data || []).filter(
        (s) => s.status === 'completed' || s.status === 'stopped'
      )

      let totalSeconds = completedSessions.reduce(
        (acc, curr) => acc + (curr.actual_seconds || 0),
        0
      )
      let sessionCount = completedSessions.length

      // If there's an active local session that started today, add its elapsed time so far
      if (
        localSessionId &&
        localKind === 'focus' &&
        (localStatus === 'running' || localStatus === 'paused')
      ) {
        const localStartDate = new Date(localStartedAt).getTime()
        const dayStartTime = parseLocalDate(todayStr).getTime()
        const dayEndTime = parseLocalDate(addDaysLocal(todayStr, 1)).getTime()

        if (localStartDate >= dayStartTime && localStartDate < dayEndTime) {
          const currentElapsed = calculateActualSeconds({
            startedAtMs: localStartedAt,
            plannedMs: localPlannedMs,
            pausedTotalMs: localPausedTotalMs,
            pausedAtMs: localPausedAt,
            status: localStatus,
          })
          totalSeconds += currentElapsed
          sessionCount += 1
        }
      }

      return {
        totalSeconds,
        totalMinutes: Math.round(totalSeconds / 60),
        sessionCount,
      }
    },
  })
}

/**
 * Hook to retrieve the last N completed or stopped focus sessions.
 */
export function useRecentFocusSessions(limit = 5) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['recent_focus_sessions', user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<FocusSessionWithTask[]> => {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*, tasks(id, title)')
        .eq('user_id', user!.id)
        .in('status', ['completed', 'stopped'])
        .order('started_at', { ascending: false })
        .order('id')
        .limit(limit)

      if (error) throw error
      return (data as unknown as FocusSessionWithTask[]) || []
    },
  })
}

/**
 * Mutation to stop/end an active remote session.
 */
export function useEndRemoteSession() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      sessionId,
      actualSeconds,
    }: {
      sessionId: string
      actualSeconds?: number
    }) => {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('focus_sessions')
        .update({
          status: 'stopped',
          ended_at: now,
          paused_at: null,
          ...(actualSeconds !== undefined ? { actual_seconds: actualSeconds } : {}),
        })
        .eq('id', sessionId)
        .eq('user_id', user!.id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active_focus_session'] })
      qc.invalidateQueries({ queryKey: ['focus_today_stats'] })
      qc.invalidateQueries({ queryKey: ['recent_focus_sessions'] })
    },
  })
}
