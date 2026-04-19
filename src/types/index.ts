import type { Database } from './database.types'

// Row types extracted from Database for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']
export type DailyTodo = Database['public']['Tables']['daily_todos']['Row']
export type DailyTodoInsert = Database['public']['Tables']['daily_todos']['Insert']
export type Habit = Database['public']['Tables']['habits']['Row']
export type HabitInsert = Database['public']['Tables']['habits']['Insert']
export type HabitLog = Database['public']['Tables']['habit_logs']['Row']
export type WeeklyReview = Database['public']['Tables']['weekly_reviews']['Row']
export type WeeklyReviewUpdate = Database['public']['Tables']['weekly_reviews']['Update']

// Enum types
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Category = 'college' | 'personal' | 'skill'
export type TaskStatus = 'not_started' | 'in_progress' | 'done'
export type TodoType = 'pinned' | 'due_today' | 'habit' | 'adhoc'
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'
export type Theme = 'light' | 'dark' | 'system'

// Daily todo with joined task fields
export type DailyTodoWithTask = DailyTodo & {
  tasks: {
    description: string | null
    resources_url: string | null
  } | null
}

// Filter types for the vault
export interface TaskFilters {
  category?: Category
  overdue?: boolean
  status?: TaskStatus
}

export type SortField = 'priority' | 'due_date' | 'created_at'
