import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Subscribe to Supabase Realtime changes on key tables.
 * Invalidates the relevant React Query caches so data stays fresh
 * across browser tabs and devices.
 */
export function useRealtimeSync(userId: string) {
  const qc = useQueryClient()

  useEffect(() => {
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
        () => qc.invalidateQueries({ queryKey: ['daily_todos'] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['tasks'] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_logs',
          filter: `user_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['habits'] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${userId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['habits'] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, qc])
}
