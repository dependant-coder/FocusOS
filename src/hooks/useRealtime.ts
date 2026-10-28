import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to Supabase Realtime changes on key tables.
 * Returns early if userId is falsy.
 * Maps tables -> invalidations with 150ms debounce to avoid bursts.
 */
export function useRealtimeSync(userId?: string | null) {
  const qc = useQueryClient()
  const pendingKeysRef = useRef<Set<string>>(new Set())
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Return early when userId is falsy
    if (!userId) return

    const scheduleInvalidations = (keys: string[]) => {
      keys.forEach((k) => pendingKeysRef.current.add(k))
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        const keysToInvalidate = Array.from(pendingKeysRef.current)
        pendingKeysRef.current.clear()
        keysToInvalidate.forEach((k) => {
          qc.invalidateQueries({ queryKey: [k] })
        })
      }, 150)
    }

    const channel = supabase
      .channel(`focusos-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_todos',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleInvalidations(['daily_todos'])
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleInvalidations(['tasks', 'daily_todos', 'analytics'])
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_logs',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleInvalidations(['habit_logs', 'daily_todos', 'analytics'])
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleInvalidations(['habits', 'habit_logs'])
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focus_sessions',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleInvalidations(['focus_sessions', 'analytics'])
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_reviews',
          filter: `user_id=eq.${userId}`,
        },
        () => scheduleInvalidations(['weekly'])
      )
      .subscribe()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [userId, qc])
}
