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
      academic_scores: {
        Row: {
          avg_grade: number
          created_at: string
          id: string
          points: number
          school_id: string
          student_id: string
          student_name: string
          total_grades: number
          updated_at: string
        }
        Insert: {
          avg_grade?: number
          created_at?: string
          id?: string
          points?: number
          school_id: string
          student_id: string
          student_name?: string
          total_grades?: number
          updated_at?: string
        }
        Update: {
          avg_grade?: number
          created_at?: string
          id?: string
          points?: number
          school_id?: string
          student_id?: string
          student_name?: string
          total_grades?: number
          updated_at?: string
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          id: string
          student_id: string
          synced_at: string | null
          timestamp: string
          type: string
        }
        Insert: {
          id: string
          student_id: string
          synced_at?: string | null
          timestamp: string
          type: string
        }
        Update: {
          id?: string
          student_id?: string
          synced_at?: string | null
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_url: string | null
          chat_id: string | null
          created_at: string
          id: string
          message_content: string
          school_id: string
          sender_name: string
          status: string
          timestamp: string
        }
        Insert: {
          audio_url?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          message_content?: string
          school_id?: string
          sender_name?: string
          status?: string
          timestamp?: string
        }
        Update: {
          audio_url?: string | null
          chat_id?: string | null
          created_at?: string
          id?: string
          message_content?: string
          school_id?: string
          sender_name?: string
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      parent_contacts: {
        Row: {
          chat_id: string | null
          created_at: string
          grade: string
          id: string
          last_start_date: string | null
          phone: string | null
          school_id: string
          student_id: string
          student_name: string
          updated_at: string
        }
        Insert: {
          chat_id?: string | null
          created_at?: string
          grade?: string
          id?: string
          last_start_date?: string | null
          phone?: string | null
          school_id: string
          student_id: string
          student_name?: string
          updated_at?: string
        }
        Update: {
          chat_id?: string | null
          created_at?: string
          grade?: string
          id?: string
          last_start_date?: string | null
          phone?: string | null
          school_id?: string
          student_id?: string
          student_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_credentials: {
        Row: {
          created_at: string
          logo_data_url: string | null
          name: string
          password: string
          school_id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          logo_data_url?: string | null
          name?: string
          password?: string
          school_id: string
          updated_at?: string
          username?: string
        }
        Update: {
          created_at?: string
          logo_data_url?: string | null
          name?: string
          password?: string
          school_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          class_name: string
          created_at: string
          id: string
          name: string
          qr_code: string
        }
        Insert: {
          class_name: string
          created_at?: string
          id: string
          name: string
          qr_code: string
        }
        Update: {
          class_name?: string
          created_at?: string
          id?: string
          name?: string
          qr_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_school_credentials: {
        Args: {
          p_logo_data_url?: string
          p_name?: string
          p_password: string
          p_school_id: string
          p_username: string
        }
        Returns: {
          created_at: string
          logo_data_url: string | null
          name: string
          password: string
          school_id: string
          updated_at: string
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "school_credentials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
