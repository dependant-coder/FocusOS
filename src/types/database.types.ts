export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_todos: {
        Row: {
          carry_count: number
          carry_over: boolean
          category: string | null
          created_at: string | null
          date: string
          done: boolean
          habit_id: string | null
          id: string
          must_do: boolean
          priority: string | null
          task_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          carry_count?: number
          carry_over?: boolean
          category?: string | null
          created_at?: string | null
          date?: string
          done?: boolean
          habit_id?: string | null
          id?: string
          must_do?: boolean
          priority?: string | null
          task_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          carry_count?: number
          carry_over?: boolean
          category?: string | null
          created_at?: string | null
          date?: string
          done?: boolean
          habit_id?: string | null
          id?: string
          must_do?: boolean
          priority?: string | null
          task_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_todos_habit_fk"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_todos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed: boolean
          date: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          date?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          date?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          active: boolean
          created_at: string | null
          custom_days: string[] | null
          frequency: string
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          custom_days?: string[] | null
          frequency?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          custom_days?: string[] | null
          frequency?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          last_reminder_date: string | null
          last_reset_date: string | null
          last_weekly_date: string | null
          name: string | null
          notif_on: boolean | null
          notif_time: string | null
          push_subscription: Json | null
          theme: string | null
          timezone: string
        }
        Insert: {
          created_at?: string | null
          id: string
          last_reminder_date?: string | null
          last_reset_date?: string | null
          last_weekly_date?: string | null
          name?: string | null
          notif_on?: boolean | null
          notif_time?: string | null
          push_subscription?: Json | null
          theme?: string | null
          timezone?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_reminder_date?: string | null
          last_reset_date?: string | null
          last_weekly_date?: string | null
          name?: string | null
          notif_on?: boolean | null
          notif_time?: string | null
          push_subscription?: Json | null
          theme?: string | null
          timezone?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          auto_escalate: boolean
          category: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          energy_level: string | null
          estimate_min: number | null
          id: string
          is_overdue: boolean
          pin_to_today: boolean
          priority: string
          resources_url: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_escalate?: boolean
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          energy_level?: string | null
          estimate_min?: number | null
          id?: string
          is_overdue?: boolean
          pin_to_today?: boolean
          priority?: string
          resources_url?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_escalate?: boolean
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          energy_level?: string | null
          estimate_min?: number | null
          id?: string
          is_overdue?: boolean
          pin_to_today?: boolean
          priority?: string
          resources_url?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          blockers: string | null
          carried_over_count: number | null
          completion_rate: number | null
          created_at: string | null
          focus_minutes: number | null
          habit_completion_rate: number | null
          habits_done: number | null
          habits_due: number | null
          id: string
          next_priorities: string | null
          tasks_completed: number | null
          tasks_missed: number | null
          updated_at: string | null
          user_id: string
          week_start: string
          wins: string | null
        }
        Insert: {
          blockers?: string | null
          carried_over_count?: number | null
          completion_rate?: number | null
          created_at?: string | null
          focus_minutes?: number | null
          habit_completion_rate?: number | null
          habits_done?: number | null
          habits_due?: number | null
          id?: string
          next_priorities?: string | null
          tasks_completed?: number | null
          tasks_missed?: number | null
          updated_at?: string | null
          user_id: string
          week_start: string
          wins?: string | null
        }
        Update: {
          blockers?: string | null
          carried_over_count?: number | null
          completion_rate?: number | null
          created_at?: string | null
          focus_minutes?: number | null
          habit_completion_rate?: number | null
          habits_done?: number | null
          habits_due?: number | null
          id?: string
          next_priorities?: string | null
          tasks_completed?: number | null
          tasks_missed?: number | null
          updated_at?: string | null
          user_id?: string
          week_start?: string
          wins?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
