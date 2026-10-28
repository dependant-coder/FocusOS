import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { subDays, format, eachDayOfInterval } from 'date-fns'
import { useAuth } from './useAuth'
import { longestStreak as calculateLongestStreak } from '../lib/habits'

export function useBarChartData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'barChart', user?.id],
    queryFn: async () => {
      if (!user) return []

      const today = new Date()
      const sevenDaysAgo = subDays(today, 6)
      const startDate = format(sevenDaysAgo, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('daily_todos')
        .select('date')
        .eq('user_id', user.id)
        .eq('done', true)
        .gte('date', startDate)

      if (error) throw error

      const days = eachDayOfInterval({ start: sevenDaysAgo, end: today })
      const counts: Record<string, number> = {}
      
      days.forEach(d => {
        counts[format(d, 'yyyy-MM-dd')] = 0
      })

      data?.forEach(todo => {
        if (counts[todo.date] !== undefined) {
          counts[todo.date]++
        }
      })

      return days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd')
        return {
          date: format(d, 'MMM d'),
          completed: counts[dateStr],
        }
      })
    },
    enabled: !!user,
  })
}

export function useDonutChartData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'donutChart', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('tasks')
        .select('category')
        .eq('user_id', user.id)
        .eq('status', 'done')

      if (error) throw error

      const counts: Record<string, number> = {
        college: 0,
        personal: 0,
        skill: 0,
      }

      data?.forEach(task => {
        if (counts[task.category] !== undefined) {
          counts[task.category]++
        }
      })

      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    },
    enabled: !!user,
  })
}

export function useLineChartData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'lineChart', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('week_start, completion_rate')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(4)

      if (error) throw error

      // Reverse so oldest is first
      const reversed = [...(data || [])].reverse()
      return reversed.map(review => ({
        week: format(new Date(review.week_start), 'MMM d'),
        rate: review.completion_rate || 0,
      }))
    },
    enabled: !!user,
  })
}

export function useHabitHeatmapData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'habitHeatmap', user?.id],
    queryFn: async () => {
      if (!user) return []

      const today = new Date()
      const thirtyDaysAgo = subDays(today, 29)
      const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd')

      // 1. Get all active habits
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('id, name, icon')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('sort_order')

      if (habitsError) throw habitsError

      // 2. Get logs for the last 30 days
      const { data: logs, error: logsError } = await supabase
        .from('habit_logs')
        .select('habit_id, date, completed')
        .eq('user_id', user.id)
        .gte('date', startDate)

      if (logsError) throw logsError

      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today }).map(d => format(d, 'yyyy-MM-dd'))

      return habits.map(habit => {
        const habitLogs = logs?.filter(l => l.habit_id === habit.id) || []
        const logMap = new Map(habitLogs.map(l => [l.date, l.completed]))
        
        return {
          id: habit.id,
          name: habit.name,
          icon: habit.icon,
          days: days.map(d => ({
            date: d,
            completed: logMap.get(d) || false
          }))
        }
      })
    },
    enabled: !!user,
  })
}

export function useStatCardsData() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'statCards', user?.id],
    queryFn: async () => {
      if (!user) return { allTime: 0, longestStreak: 0, bestWeek: 0, mostProductiveDay: 0 }

      // 1. All-time completed tasks
      const { count: allTime, error: allTimeError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')
      
      if (allTimeError) throw allTimeError

      // 2. Best week (max tasks_completed)
      const { data: bestWeekData, error: bestWeekError } = await supabase
        .from('weekly_reviews')
        .select('tasks_completed')
        .eq('user_id', user.id)
        .order('tasks_completed', { ascending: false })
        .limit(1)
        
      if (bestWeekError) throw bestWeekError
      const bestWeek = bestWeekData?.[0]?.tasks_completed || 0

      // 3. Most productive day (max completed in daily_todos)
      // This is a bit tricky without RPC, so we'll fetch all completed daily_todos and group in memory.
      // Or we can group by date.
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_todos')
        .select('date')
        .eq('user_id', user.id)
        .eq('done', true)

      if (dailyError) throw dailyError
      
      const dailyCounts: Record<string, number> = {}
      dailyData?.forEach(todo => {
        dailyCounts[todo.date] = (dailyCounts[todo.date] || 0) + 1
      })
      
      let mostProductiveDay = 0
      Object.values(dailyCounts).forEach(count => {
        if (count > mostProductiveDay) mostProductiveDay = count
      })

      // 4. Longest streak (habit logs)
      // Since it's complex to calculate true global longest streak across all habits without an RPC,
      // we'll fetch all habit logs that are completed, order by date, and find the longest contiguous run of ANY habit?
      // Actually "longest streak" usually refers to the max streak across all individual habits.
      const { data: habitLogs, error: habitLogsError } = await supabase
        .from('habit_logs')
        .select('habit_id, date')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('date', { ascending: true })

      if (habitLogsError) throw habitLogsError

      // Fetch habits to apply frequency-aware longest streak
      const { data: userHabits } = await supabase
        .from('habits')
        .select('id, frequency, custom_days, created_at')
        .eq('user_id', user.id)

      const habitMap = new Map((userHabits ?? []).map((h) => [h.id, h]))

      // Group by habit_id
      const logsByHabit: Record<string, string[]> = {}
      habitLogs?.forEach((log) => {
        if (!logsByHabit[log.habit_id]) logsByHabit[log.habit_id] = []
        logsByHabit[log.habit_id].push(log.date)
      })

      let longestStreak = 0
      Object.entries(logsByHabit).forEach(([habitId, dates]) => {
        const habit = habitMap.get(habitId) || { frequency: 'daily' }
        const max = calculateLongestStreak(habit, dates)
        if (max > longestStreak) longestStreak = max
      })

      return {
        allTime: allTime || 0,
        bestWeek,
        mostProductiveDay,
        longestStreak
      }
    },
    enabled: !!user,
  })
}
