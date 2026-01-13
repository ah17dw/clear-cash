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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          note: string | null
          paid_on: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          id?: string
          note?: string | null
          paid_on: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          note?: string | null
          paid_on?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          apr: number
          balance: number
          created_at: string
          id: string
          is_promo_0: boolean
          lender: string | null
          minimum_payment: number
          name: string
          notes: string | null
          payment_day: number | null
          planned_payment: number | null
          post_promo_apr: number | null
          promo_end_date: string | null
          promo_start_date: string | null
          starting_balance: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apr?: number
          balance?: number
          created_at?: string
          id?: string
          is_promo_0?: boolean
          lender?: string | null
          minimum_payment?: number
          name: string
          notes?: string | null
          payment_day?: number | null
          planned_payment?: number | null
          post_promo_apr?: number | null
          promo_end_date?: string | null
          promo_start_date?: string | null
          starting_balance?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apr?: number
          balance?: number
          created_at?: string
          id?: string
          is_promo_0?: boolean
          lender?: string | null
          minimum_payment?: number
          name?: string
          notes?: string | null
          payment_day?: number | null
          planned_payment?: number | null
          post_promo_apr?: number | null
          promo_end_date?: string | null
          promo_start_date?: string | null
          starting_balance?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_items: {
        Row: {
          category: string | null
          couples_mode: boolean
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          monthly_amount: number
          name: string
          provider: string | null
          reminder_days_before: number
          reminder_email: boolean
          reminder_sms: boolean
          renewal_date: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          couples_mode?: boolean
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          monthly_amount?: number
          name: string
          provider?: string | null
          reminder_days_before?: number
          reminder_email?: boolean
          reminder_sms?: boolean
          renewal_date?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          couples_mode?: boolean
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          monthly_amount?: number
          name?: string
          provider?: string | null
          reminder_days_before?: number
          reminder_email?: boolean
          reminder_sms?: boolean
          renewal_date?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          monthly_amount: number
          name: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_amount?: number
          name: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          monthly_amount?: number
          name?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email_notifications: boolean
          id: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: boolean
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: boolean
          id?: string
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      renewal_files: {
        Row: {
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          renewal_id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          renewal_id: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          renewal_id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_files_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewals"
            referencedColumns: ["id"]
          },
        ]
      }
      renewals: {
        Row: {
          added_to_expenses: boolean
          agreement_end: string | null
          agreement_start: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
          frequency: string
          id: string
          is_monthly_payment: boolean
          linked_expense_id: string | null
          monthly_amount: number
          name: string
          notes: string | null
          person_or_address: string | null
          provider: string | null
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          added_to_expenses?: boolean
          agreement_end?: string | null
          agreement_start?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          frequency?: string
          id?: string
          is_monthly_payment?: boolean
          linked_expense_id?: string | null
          monthly_amount?: number
          name: string
          notes?: string | null
          person_or_address?: string | null
          provider?: string | null
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          added_to_expenses?: boolean
          agreement_end?: string | null
          agreement_start?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          frequency?: string
          id?: string
          is_monthly_payment?: boolean
          linked_expense_id?: string | null
          monthly_amount?: number
          name?: string
          notes?: string | null
          person_or_address?: string | null
          provider?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewals_linked_expense_id_fkey"
            columns: ["linked_expense_id"]
            isOneToOne: false
            referencedRelation: "expense_items"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_accounts: {
        Row: {
          aer: number
          balance: number
          created_at: string
          id: string
          name: string
          notes: string | null
          provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aer?: number
          balance?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aer?: number
          balance?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          savings_account_id: string
          trans_on: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          savings_account_id: string
          trans_on: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          savings_account_id?: string
          trans_on?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_transactions_savings_account_id_fkey"
            columns: ["savings_account_id"]
            isOneToOne: false
            referencedRelation: "savings_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_expenses: {
        Row: {
          created_at: string
          id: string
          monthly_amount: number
          name: string
          parent_expense_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_amount?: number
          name: string
          parent_expense_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_amount?: number
          name?: string
          parent_expense_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expense_items"
            referencedColumns: ["id"]
          },
        ]
      }
      task_delegation_responses: {
        Row: {
          created_at: string
          email: string
          id: string
          responded_at: string | null
          response: string | null
          task_id: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          responded_at?: string | null
          response?: string | null
          task_id: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          responded_at?: string | null
          response?: string | null
          task_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_delegation_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          created_at: string
          created_by: string
          id: string
          tagged_email: string
          task_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          tagged_email: string
          task_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          tagged_email?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          auto_complete: boolean
          completed_at: string | null
          created_at: string
          delegation_responded_at: string | null
          delegation_status: string | null
          delegation_token: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_completed: boolean
          priority: string
          repeat_type: string
          start_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_complete?: boolean
          completed_at?: string | null
          created_at?: string
          delegation_responded_at?: string | null
          delegation_status?: string | null
          delegation_token?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          repeat_type?: string
          start_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_complete?: boolean
          completed_at?: string | null
          created_at?: string
          delegation_responded_at?: string | null
          delegation_status?: string | null
          delegation_token?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_completed?: boolean
          priority?: string
          repeat_type?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
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
