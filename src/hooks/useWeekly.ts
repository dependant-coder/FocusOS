import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useWeekly(weekStart: string) {
  return useQuery({
    queryKey: ['weekly', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('week_start', weekStart)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })
}

export function useUpdateWeekly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ 
      weekStart, 
      wins, 
      blockers, 
      nextPriorities 
    }: { 
      weekStart: string; 
      wins?: string | null; 
      blockers?: string | null; 
      nextPriorities?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not logged in")
      
      const updateData: any = {}
      if (wins !== undefined) updateData.wins = wins
      if (blockers !== undefined) updateData.blockers = blockers
      if (nextPriorities !== undefined) updateData.next_priorities = nextPriorities

      if (Object.keys(updateData).length === 0) return

      const { error } = await supabase.from('weekly_reviews').update(updateData)
        .eq('user_id', user.user.id)
        .eq('week_start', weekStart)
        
      if (error) throw error
    },
    onSettled: (_, __, { weekStart }) => {
      qc.invalidateQueries({ queryKey: ['weekly', weekStart] })
    },
  })
}
