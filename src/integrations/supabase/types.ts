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
      ai_config: {
        Row: {
          api_key_encrypted: string | null
          created_at: string | null
          daily_usage_count: number | null
          id: string
          last_usage_date: string | null
          model_preference: string | null
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string | null
          daily_usage_count?: number | null
          id?: string
          last_usage_date?: string | null
          model_preference?: string | null
          provider?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string | null
          daily_usage_count?: number | null
          id?: string
          last_usage_date?: string | null
          model_preference?: string | null
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string
          id: string
          value: string
        }
        Insert: {
          created_at?: string
          id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          value?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          onboarding_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_vault: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_vault?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_vault?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          frequency: string
          id: string
          is_active: boolean
          last_backup_at: string | null
          next_backup_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency: string
          id?: string
          is_active?: boolean
          last_backup_at?: string | null
          next_backup_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_backup_at?: string | null
          next_backup_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_income: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_income?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_income?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          id: string
          month: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_form_fields: {
        Row: {
          created_at: string
          default_value: string | null
          entity_type: string
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          placeholder: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          entity_type: string
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          entity_type?: string
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_disposals: {
        Row: {
          approved_by: string | null
          buyer_info: string | null
          certificate_number: string | null
          created_at: string
          device_id: string
          disposal_date: string
          disposal_method: string
          disposal_reason: string | null
          disposal_value: number | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          buyer_info?: string | null
          certificate_number?: string | null
          created_at?: string
          device_id: string
          disposal_date?: string
          disposal_method?: string
          disposal_reason?: string | null
          disposal_value?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          buyer_info?: string | null
          certificate_number?: string | null
          created_at?: string
          device_id?: string
          disposal_date?: string
          disposal_method?: string
          disposal_reason?: string | null
          disposal_value?: number | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_disposals_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      device_inventory: {
        Row: {
          bill_details: string | null
          bod_number: string | null
          category_id: string | null
          created_at: string
          custom_specs: Json | null
          delivery_date: string | null
          device_name: string
          device_number: string | null
          has_ups: boolean | null
          headset_info: string | null
          id: string
          monitor_info: string | null
          notes: string | null
          price: number | null
          processor_info: string | null
          purchase_date: string | null
          ram_info: string | null
          requisition_number: string | null
          serial_number: string | null
          status: string
          storage_info: string | null
          supplier_id: string | null
          supplier_name: string | null
          support_user_id: string | null
          unit_id: string | null
          updated_at: string
          ups_info: string | null
          user_id: string
          warranty_date: string | null
          webcam_info: string | null
        }
        Insert: {
          bill_details?: string | null
          bod_number?: string | null
          category_id?: string | null
          created_at?: string
          custom_specs?: Json | null
          delivery_date?: string | null
          device_name: string
          device_number?: string | null
          has_ups?: boolean | null
          headset_info?: string | null
          id?: string
          monitor_info?: string | null
          notes?: string | null
          price?: number | null
          processor_info?: string | null
          purchase_date?: string | null
          ram_info?: string | null
          requisition_number?: string | null
          serial_number?: string | null
          status?: string
          storage_info?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          support_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
          ups_info?: string | null
          user_id: string
          warranty_date?: string | null
          webcam_info?: string | null
        }
        Update: {
          bill_details?: string | null
          bod_number?: string | null
          category_id?: string | null
          created_at?: string
          custom_specs?: Json | null
          delivery_date?: string | null
          device_name?: string
          device_number?: string | null
          has_ups?: boolean | null
          headset_info?: string | null
          id?: string
          monitor_info?: string | null
          notes?: string | null
          price?: number | null
          processor_info?: string | null
          purchase_date?: string | null
          ram_info?: string | null
          requisition_number?: string | null
          serial_number?: string | null
          status?: string
          storage_info?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          support_user_id?: string | null
          unit_id?: string | null
          updated_at?: string
          ups_info?: string | null
          user_id?: string
          warranty_date?: string | null
          webcam_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "device_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "device_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_inventory_support_user_id_fkey"
            columns: ["support_user_id"]
            isOneToOne: false
            referencedRelation: "support_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_inventory_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "support_units"
            referencedColumns: ["id"]
          },
        ]
      }
      device_service_history: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          device_id: string
          id: string
          service_date: string
          service_type: string
          task_id: string | null
          technician_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          device_id: string
          id?: string
          service_date: string
          service_type: string
          task_id?: string | null
          technician_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          device_id?: string
          id?: string
          service_date?: string
          service_type?: string
          task_id?: string | null
          technician_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_service_history_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_service_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      device_suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_transfer_history: {
        Row: {
          created_at: string
          device_id: string
          from_user_id: string | null
          id: string
          notes: string | null
          to_user_id: string | null
          transfer_date: string
          transferred_by: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          from_user_id?: string | null
          id?: string
          notes?: string | null
          to_user_id?: string | null
          transfer_date?: string
          transferred_by?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          from_user_id?: string | null
          id?: string
          notes?: string | null
          to_user_id?: string | null
          transfer_date?: string
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_transfer_history_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_transfer_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "support_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_transfer_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "support_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      family_documents: {
        Row: {
          category: string | null
          created_at: string
          family_member_id: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          family_member_id?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          family_member_id?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_documents_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_events: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          family_member_id: string | null
          id: string
          notes: string | null
          reminder_days: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type?: string
          family_member_id?: string | null
          id?: string
          notes?: string | null
          reminder_days?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          family_member_id?: string | null
          id?: string
          notes?: string | null
          reminder_days?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_events_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_member_connections: {
        Row: {
          connection_type: string
          created_at: string
          id: string
          member_id_1: string
          member_id_2: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          id?: string
          member_id_1: string
          member_id_2: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          id?: string
          member_id_1?: string
          member_id_2?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_member_connections_member_id_1_fkey"
            columns: ["member_id_1"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_member_connections_member_id_2_fkey"
            columns: ["member_id_2"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          id: string
          name: string
          notes: string | null
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          name: string
          notes?: string | null
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          id?: string
          name?: string
          notes?: string | null
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      form_field_config: {
        Row: {
          entity_type: string
          field_name: string
          id: string
          is_custom: boolean
          is_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          entity_type: string
          field_name: string
          id?: string
          is_custom?: boolean
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          entity_type?: string
          field_name?: string
          id?: string
          is_custom?: boolean
          is_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          goal_id: string
          id: string
          is_completed: boolean | null
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          goal_id: string
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          current_amount: number | null
          custom_fields: Json | null
          description: string | null
          goal_type: string
          id: string
          is_next_year_plan: boolean | null
          status: string | null
          target_amount: number | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_amount?: number | null
          custom_fields?: Json | null
          description?: string | null
          goal_type?: string
          id?: string
          is_next_year_plan?: boolean | null
          status?: string | null
          target_amount?: number | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_amount?: number | null
          custom_fields?: Json | null
          description?: string | null
          goal_type?: string
          id?: string
          is_next_year_plan?: boolean | null
          status?: string | null
          target_amount?: number | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_sync: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          refresh_token: string
          sync_enabled: boolean
          sync_token: string | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          refresh_token: string
          sync_enabled?: boolean
          sync_token?: string | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string
          sync_enabled?: boolean
          sync_token?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_at: string
          created_at: string
          habit_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          habit_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          habit_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          frequency: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          reminder_enabled: boolean | null
          reminder_time: string | null
          target_per_day: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          target_per_day?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          target_per_day?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          created_at: string
          current_value: number | null
          id: string
          is_recurring: boolean | null
          maturity_date: string | null
          name: string
          notes: string | null
          principal: number
          purchase_date: string | null
          recurring_amount: number | null
          recurring_pattern: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          id?: string
          is_recurring?: boolean | null
          maturity_date?: string | null
          name: string
          notes?: string | null
          principal: number
          purchase_date?: string | null
          recurring_amount?: number | null
          recurring_pattern?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          id?: string
          is_recurring?: boolean | null
          maturity_date?: string | null
          name?: string
          notes?: string | null
          principal?: number
          purchase_date?: string | null
          recurring_amount?: number | null
          recurring_pattern?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_paid: boolean | null
          loan_id: string
          notes: string | null
          paid_at: string | null
          payment_date: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_paid?: boolean | null
          loan_id: string
          notes?: string | null
          paid_at?: string | null
          payment_date: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_paid?: boolean | null
          loan_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_date?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          interest_rate: number | null
          lender_name: string
          loan_type: string
          monthly_payment: number | null
          next_payment_date: string | null
          notes: string | null
          payment_frequency: string
          principal_amount: number
          remaining_amount: number
          reminder_days: number | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          lender_name: string
          loan_type?: string
          monthly_payment?: number | null
          next_payment_date?: string | null
          notes?: string | null
          payment_frequency?: string
          principal_amount: number
          remaining_amount: number
          reminder_days?: number | null
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          lender_name?: string
          loan_type?: string
          monthly_payment?: number | null
          next_payment_date?: string | null
          notes?: string | null
          payment_frequency?: string
          principal_amount?: number
          remaining_amount?: number
          reminder_days?: number | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_config: {
        Row: {
          id: string
          is_enabled: boolean
          module_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          module_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_enabled?: boolean
          module_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          custom_fields: Json | null
          encrypted_content: string | null
          id: string
          is_favorite: boolean | null
          is_pinned: boolean | null
          is_vault: boolean | null
          note_type: string
          project_id: string | null
          search_vector: unknown
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          custom_fields?: Json | null
          encrypted_content?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          is_vault?: boolean | null
          note_type?: string
          project_id?: string | null
          search_vector?: unknown
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          custom_fields?: Json | null
          encrypted_content?: string | null
          id?: string
          is_favorite?: boolean | null
          is_pinned?: boolean | null
          is_vault?: boolean | null
          note_type?: string
          project_id?: string | null
          search_vector?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          family_event_reminders: boolean
          follow_up_reminders: boolean
          habit_reminders: boolean
          id: string
          loan_reminders: boolean
          task_assignment_alerts: boolean
          task_reminders: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          family_event_reminders?: boolean
          follow_up_reminders?: boolean
          habit_reminders?: boolean
          id?: string
          loan_reminders?: boolean
          task_assignment_alerts?: boolean
          task_reminders?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          family_event_reminders?: boolean
          follow_up_reminders?: boolean
          habit_reminders?: boolean
          id?: string
          loan_reminders?: boolean
          task_assignment_alerts?: boolean
          task_reminders?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pomodoro_settings: {
        Row: {
          auto_start_breaks: boolean
          auto_start_work: boolean
          created_at: string
          id: string
          long_break: number
          sessions_before_long_break: number
          short_break: number
          updated_at: string
          user_id: string
          work_duration: number
        }
        Insert: {
          auto_start_breaks?: boolean
          auto_start_work?: boolean
          created_at?: string
          id?: string
          long_break?: number
          sessions_before_long_break?: number
          short_break?: number
          updated_at?: string
          user_id: string
          work_duration?: number
        }
        Update: {
          auto_start_breaks?: boolean
          auto_start_work?: boolean
          created_at?: string
          id?: string
          long_break?: number
          sessions_before_long_break?: number
          short_break?: number
          updated_at?: string
          user_id?: string
          work_duration?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string | null
          date_format: string | null
          email: string | null
          full_name: string | null
          id: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean | null
          project_id: string
          sort_order: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          project_id: string
          sort_order?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean | null
          project_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          custom_fields: Json | null
          description: string | null
          id: string
          priority: string | null
          project_type: string
          status: string | null
          tags: string[] | null
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          priority?: string | null
          project_type?: string
          status?: string | null
          tags?: string[] | null
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          id?: string
          priority?: string | null
          project_type?: string
          status?: string | null
          tags?: string[] | null
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_info: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_entries: {
        Row: {
          allowances: number | null
          created_at: string
          deductions: number | null
          gross_amount: number
          id: string
          month: number
          net_amount: number
          notes: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          allowances?: number | null
          created_at?: string
          deductions?: number | null
          gross_amount: number
          id?: string
          month: number
          net_amount: number
          notes?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          allowances?: number | null
          created_at?: string
          deductions?: number | null
          gross_amount?: number
          id?: string
          month?: number
          net_amount?: number
          notes?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      smtp_settings: {
        Row: {
          created_at: string
          from_email: string
          from_name: string
          id: string
          is_active: boolean
          smtp_host: string
          smtp_password: string
          smtp_port: number
          smtp_username: string
          updated_at: string
          updated_by: string
          use_tls: boolean
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string
          id?: string
          is_active?: boolean
          smtp_host: string
          smtp_password: string
          smtp_port?: number
          smtp_username: string
          updated_at?: string
          updated_by: string
          use_tls?: boolean
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_active?: boolean
          smtp_host?: string
          smtp_password?: string
          smtp_port?: number
          smtp_username?: string
          updated_at?: string
          updated_by?: string
          use_tls?: boolean
        }
        Relationships: []
      }
      support_departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_departments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "support_units"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          custom_fields: Json | null
          description: string
          device_id: string | null
          id: string
          priority: string
          requester_id: string | null
          resolved_at: string | null
          status: string
          ticket_number: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          description: string
          device_id?: string | null
          id?: string
          priority?: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string
          device_id?: string | null
          id?: string
          priority?: string
          requester_id?: string | null
          resolved_at?: string | null
          status?: string
          ticket_number?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "ticket_requesters"
            referencedColumns: ["id"]
          },
        ]
      }
      support_units: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_user_devices: {
        Row: {
          created_at: string
          device_handover_date: string | null
          device_name: string
          id: string
          notes: string | null
          support_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_handover_date?: string | null
          device_name: string
          id?: string
          notes?: string | null
          support_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_handover_date?: string | null
          device_name?: string
          id?: string
          notes?: string | null
          support_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_user_devices_support_user_id_fkey"
            columns: ["support_user_id"]
            isOneToOne: false
            referencedRelation: "support_users"
            referencedColumns: ["id"]
          },
        ]
      }
      support_users: {
        Row: {
          created_at: string
          custom_fields: Json | null
          department_id: string
          designation: string | null
          device_assign_date: string | null
          device_handover_date: string | null
          device_info: string | null
          email: string | null
          extension_number: string | null
          extension_password: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          mail_password: string | null
          name: string
          nas_password: string | null
          nas_username: string | null
          new_device_assign: string | null
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          department_id: string
          designation?: string | null
          device_assign_date?: string | null
          device_handover_date?: string | null
          device_info?: string | null
          email?: string | null
          extension_number?: string | null
          extension_password?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          mail_password?: string | null
          name: string
          nas_password?: string | null
          nas_username?: string | null
          new_device_assign?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          department_id?: string
          designation?: string | null
          device_assign_date?: string | null
          device_handover_date?: string | null
          device_info?: string | null
          email?: string | null
          extension_number?: string | null
          extension_password?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          mail_password?: string | null
          name?: string
          nas_password?: string | null
          nas_username?: string | null
          new_device_assign?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "support_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_calendar_events: {
        Row: {
          created_at: string
          google_event_id: string
          id: string
          last_synced_at: string
          local_event_id: string
          local_event_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          google_event_id: string
          id?: string
          last_synced_at?: string
          local_event_id: string
          local_event_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          google_event_id?: string
          id?: string
          last_synced_at?: string
          local_event_id?: string
          local_event_type?: string
          user_id?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to: string
          created_at: string
          id: string
          message: string | null
          responded_at: string | null
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to: string
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to?: string
          created_at?: string
          id?: string
          message?: string | null
          responded_at?: string | null
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          category_type: string
          color: string
          created_at: string
          icon: string | null
          id: string
          is_admin_category: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_type?: string
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_admin_category?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_type?: string
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_admin_category?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_checklists: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean | null
          sort_order: number | null
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean | null
          sort_order?: number | null
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_follow_up_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_follow_up_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_generated_at: string | null
          priority: string | null
          schedule_config: Json | null
          schedule_type: string
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          priority?: string | null
          schedule_config?: Json | null
          schedule_type?: string
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_generated_at?: string | null
          priority?: string | null
          schedule_config?: Json | null
          schedule_type?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          category_id: string | null
          completed_at: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          due_date: string | null
          due_time: string | null
          estimated_time: number | null
          follow_up_date: string | null
          goal_id: string | null
          id: string
          is_recurring: boolean | null
          needs_follow_up: boolean | null
          priority: string | null
          project_id: string | null
          recurring_pattern: string | null
          sort_order: number | null
          status: string | null
          support_user_id: string | null
          tags: string[] | null
          task_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_time?: number | null
          follow_up_date?: string | null
          goal_id?: string | null
          id?: string
          is_recurring?: boolean | null
          needs_follow_up?: boolean | null
          priority?: string | null
          project_id?: string | null
          recurring_pattern?: string | null
          sort_order?: number | null
          status?: string | null
          support_user_id?: string | null
          tags?: string[] | null
          task_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          estimated_time?: number | null
          follow_up_date?: string | null
          goal_id?: string | null
          id?: string
          is_recurring?: boolean | null
          needs_follow_up?: boolean | null
          priority?: string | null
          project_id?: string | null
          recurring_pattern?: string | null
          sort_order?: number | null
          status?: string | null
          support_user_id?: string | null
          tags?: string[] | null
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_fk"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_support_user_id_fkey"
            columns: ["support_user_id"]
            isOneToOne: false
            referencedRelation: "support_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          author_id: string | null
          author_type: string
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_type?: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_type?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_form_fields: {
        Row: {
          category_id: string | null
          created_at: string
          default_value: string | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          placeholder: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          default_value?: string | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          placeholder?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          default_value?: string | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          placeholder?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_form_fields_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_requesters: {
        Row: {
          created_at: string
          device_id: string | null
          email: string
          email_verified: boolean | null
          id: string
          name: string
          phone: string | null
          support_user_id: string | null
          updated_at: string
          verification_expires_at: string | null
          verification_token: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          email: string
          email_verified?: boolean | null
          id?: string
          name: string
          phone?: string | null
          support_user_id?: string | null
          updated_at?: string
          verification_expires_at?: string | null
          verification_token?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          email?: string
          email_verified?: boolean | null
          id?: string
          name?: string
          phone?: string | null
          support_user_id?: string | null
          updated_at?: string
          verification_expires_at?: string | null
          verification_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_requesters_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_requesters_support_user_id_fkey"
            columns: ["support_user_id"]
            isOneToOne: false
            referencedRelation: "support_users"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          duration_seconds: number | null
          end_time: string | null
          entry_type: string
          id: string
          is_running: boolean | null
          notes: string | null
          project_id: string | null
          start_time: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          entry_type?: string
          id?: string
          is_running?: boolean | null
          notes?: string | null
          project_id?: string | null
          start_time?: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          end_time?: string | null
          entry_type?: string
          id?: string
          is_running?: boolean | null
          notes?: string | null
          project_id?: string | null
          start_time?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account: string | null
          amount: number
          attachment_url: string | null
          category_id: string | null
          created_at: string
          custom_fields: Json | null
          date: string
          family_member_id: string | null
          id: string
          is_recurring: boolean | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          merchant: string | null
          notes: string | null
          recurring_pattern: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string | null
          amount: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          date?: string
          family_member_id?: string | null
          id?: string
          is_recurring?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          merchant?: string | null
          notes?: string | null
          recurring_pattern?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string | null
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          date?: string
          family_member_id?: string | null
          id?: string
          is_recurring?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          merchant?: string | null
          notes?: string | null
          recurring_pattern?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_info: string | null
          expires_at: string
          id: string
          ip_address: string | null
          trusted_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_info?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          trusted_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          trusted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mfa_settings: {
        Row: {
          created_at: string
          email_otp_enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_otp_enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_otp_enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_revoked: boolean | null
          last_active: string | null
          mfa_expires_at: string | null
          mfa_verified_at: string | null
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          last_active?: string | null
          mfa_expires_at?: string | null
          mfa_verified_at?: string | null
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          last_active?: string | null
          mfa_expires_at?: string | null
          mfa_verified_at?: string | null
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_type: string | null
          friendly_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string | null
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      user_workspace_permissions: {
        Row: {
          created_at: string
          id: string
          office_enabled: boolean
          personal_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          office_enabled?: boolean
          personal_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          office_enabled?: boolean
          personal_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          call_count: number | null
          created_at: string
          field_mapping: Json | null
          id: string
          is_active: boolean | null
          last_called_at: string | null
          name: string
          target_type: string
          updated_at: string
          user_id: string
          webhook_key: string
        }
        Insert: {
          call_count?: number | null
          created_at?: string
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_called_at?: string | null
          name: string
          target_type?: string
          updated_at?: string
          user_id: string
          webhook_key?: string
        }
        Update: {
          call_count?: number | null
          created_at?: string
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_called_at?: string | null
          name?: string
          target_type?: string
          updated_at?: string
          user_id?: string
          webhook_key?: string
        }
        Relationships: []
      }
      workflow_logs: {
        Row: {
          action_result: Json | null
          created_at: string
          error_message: string | null
          id: string
          rule_id: string
          status: string
          trigger_data: Json | null
          user_id: string
        }
        Insert: {
          action_result?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          rule_id: string
          status?: string
          trigger_data?: Json | null
          user_id: string
        }
        Update: {
          action_result?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          rule_id?: string
          status?: string
          trigger_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
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
      get_support_users_safe: {
        Args: never
        Returns: {
          created_at: string
          department_id: string
          designation: string
          device_assign_date: string
          device_handover_date: string
          device_info: string
          email: string
          extension_number: string
          id: string
          ip_address: string
          is_active: boolean
          name: string
          nas_username: string
          new_device_assign: string
          notes: string
          phone: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_role_users: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _message: string
          _role: Database["public"]["Enums"]["app_role"]
          _title: string
          _type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "inventory_manager" | "support_manager"
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
    Enums: {
      app_role: ["admin", "user", "inventory_manager", "support_manager"],
    },
  },
} as const
