export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          text: string
          options: string[]
          allow_custom_answer: boolean
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          text: string
          options: string[]
          allow_custom_answer?: boolean
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          text?: string
          options?: string[]
          allow_custom_answer?: boolean
          category?: string | null
          created_at?: string
        }
      }
      user_answers: {
        Row: {
          id: string
          user_id: string
          question_id: string
          selected_option: string
          custom_answer?: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          selected_option: string
          custom_answer?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          selected_option?: string
          custom_answer?: string
          created_at?: string
        }
      }
      wellbeing_scores: {
        Row: {
          id: string
          user_id: string
          sleep_score: number
          physical_activity_score: number
          social_interaction_score: number
          overall_score: number
          last_updated: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          sleep_score: number
          physical_activity_score: number
          social_interaction_score: number
          overall_score: number
          last_updated?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          sleep_score?: number
          physical_activity_score?: number
          social_interaction_score?: number
          overall_score?: number
          last_updated?: string
          created_at?: string
        }
      }
      wellbeing_daily_scores: {
        Row: {
          id: string
          user_id: string
          date: string
          sleep_score: number
          physical_activity_score: number
          social_interaction_score: number
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          sleep_score: number
          physical_activity_score: number
          social_interaction_score: number
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          sleep_score?: number
          physical_activity_score?: number
          social_interaction_score?: number
          updated_at?: string
          created_at?: string
        }
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