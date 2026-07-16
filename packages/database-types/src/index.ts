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
      audit_logs: {
        Row: {
          action: string
          after_values: Json | null
          before_values: Json | null
          branch_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_values?: Json | null
          before_values?: Json | null
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_values?: Json | null
          before_values?: Json | null
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_branch_tenant_fk"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_tenant_fk"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          bank_name: string
          business_unit_id: string
          id: string
          masked_account_number: string
          organization_id: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          account_name: string
          bank_name: string
          business_unit_id: string
          id?: string
          masked_account_number: string
          organization_id: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          account_name?: string
          bank_name?: string
          business_unit_id?: string
          id?: string
          masked_account_number?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_unit_tenant_fk"
            columns: ["organization_id", "business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string
          branch_type: string
          business_unit_id: string
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          address: string
          branch_type: string
          business_unit_id: string
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          branch_type?: string
          business_unit_id?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_business_unit_tenant_fk"
            columns: ["organization_id", "business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rules: {
        Row: {
          code: string
          enabled: boolean
          id: string
          name: string
          organization_id: string
          priority: number
          rule_set_id: string
        }
        Insert: {
          code: string
          enabled?: boolean
          id?: string
          name: string
          organization_id: string
          priority: number
          rule_set_id: string
        }
        Update: {
          code?: string
          enabled?: boolean
          id?: string
          name?: string
          organization_id?: string
          priority?: number
          rule_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_rules_set_tenant_fk"
            columns: ["organization_id", "rule_set_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      business_units: {
        Row: {
          commercial_name: string
          created_at: string
          id: string
          legal_name: string
          name: string | null
          organization_id: string
          owner_name: string
          rtn: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          commercial_name: string
          created_at?: string
          id?: string
          legal_name: string
          name?: string | null
          organization_id: string
          owner_name: string
          rtn?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          commercial_name?: string
          created_at?: string
          id?: string
          legal_name?: string
          name?: string | null
          organization_id?: string
          owner_name?: string
          rtn?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          account_id: string | null
          amount: number
          application_id: string | null
          branch_id: string
          created_at: string
          id: string
          organization_id: string
          payment_method: string
          received_by: string
          reference: string | null
          transaction_type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          application_id?: string | null
          branch_id: string
          created_at?: string
          id?: string
          organization_id: string
          payment_method: string
          received_by: string
          reference?: string | null
          transaction_type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          application_id?: string | null
          branch_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          payment_method?: string
          received_by?: string
          reference?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_account_tenant_fk"
            columns: ["organization_id", "account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "cash_transactions_application_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "cash_transactions_branch_tenant_fk"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "cash_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_receiver_tenant_fk"
            columns: ["organization_id", "received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      collection_actions: {
        Row: {
          account_id: string
          action_type: string
          actor_id: string
          created_at: string
          id: string
          notes: string
          organization_id: string
          promised_date: string | null
        }
        Insert: {
          account_id: string
          action_type: string
          actor_id: string
          created_at?: string
          id?: string
          notes: string
          organization_id: string
          promised_date?: string | null
        }
        Update: {
          account_id?: string
          action_type?: string
          actor_id?: string
          created_at?: string
          id?: string
          notes?: string
          organization_id?: string
          promised_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_actions_account_tenant_fk"
            columns: ["organization_id", "account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "collection_actions_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "collection_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_value: Json | null
          before_value: Json | null
          configuration_value_id: string | null
          created_at: string
          id: number
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          configuration_value_id?: string | null
          created_at?: string
          id?: never
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_value?: Json | null
          before_value?: Json | null
          configuration_value_id?: string | null
          created_at?: string
          id?: never
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuration_audit_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "configuration_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_audit_value_tenant_fk"
            columns: ["organization_id", "configuration_value_id"]
            isOneToOne: false
            referencedRelation: "configuration_values"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      configuration_definitions: {
        Row: {
          allowed_scope_types: string[]
          created_at: string
          description: string
          id: string
          key: string
          value_type: string
        }
        Insert: {
          allowed_scope_types: string[]
          created_at?: string
          description: string
          id?: string
          key: string
          value_type: string
        }
        Update: {
          allowed_scope_types?: string[]
          created_at?: string
          description?: string
          id?: string
          key?: string
          value_type?: string
        }
        Relationships: []
      }
      configuration_scopes: {
        Row: {
          attributes: Json
          id: string
          organization_id: string
          scope_id: string
          scope_type: string
        }
        Insert: {
          attributes?: Json
          id?: string
          organization_id: string
          scope_id: string
          scope_type: string
        }
        Update: {
          attributes?: Json
          id?: string
          organization_id?: string
          scope_id?: string
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuration_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_values: {
        Row: {
          definition_id: string
          effective_from: string
          effective_until: string | null
          id: string
          organization_id: string
          priority: number
          scope_id: string
          status: string
          value: Json
          version_id: string
        }
        Insert: {
          definition_id: string
          effective_from: string
          effective_until?: string | null
          id?: string
          organization_id: string
          priority?: number
          scope_id: string
          status: string
          value: Json
          version_id: string
        }
        Update: {
          definition_id?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          organization_id?: string
          priority?: number
          scope_id?: string
          status?: string
          value?: Json
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuration_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "configuration_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_values_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_values_scope_tenant_fk"
            columns: ["organization_id", "scope_id"]
            isOneToOne: false
            referencedRelation: "configuration_scopes"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "configuration_values_version_tenant_fk"
            columns: ["organization_id", "version_id"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      configuration_versions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          published_at: string | null
          published_by: string | null
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          published_at?: string | null
          published_by?: string | null
          status: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          published_at?: string | null
          published_by?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuration_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_versions_publisher_tenant_fk"
            columns: ["organization_id", "published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_accounts: {
        Row: {
          activated_at: string
          application_id: string
          customer_id: string
          down_payment: number
          id: string
          installment_amount: number
          organization_id: string
          outstanding_balance: number
          principal: number
          status: string
          term: number
        }
        Insert: {
          activated_at?: string
          application_id: string
          customer_id: string
          down_payment: number
          id?: string
          installment_amount: number
          organization_id: string
          outstanding_balance: number
          principal: number
          status: string
          term: number
        }
        Update: {
          activated_at?: string
          application_id?: string
          customer_id?: string
          down_payment?: number
          id?: string
          installment_amount?: number
          organization_id?: string
          outstanding_balance?: number
          principal?: number
          status?: string
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_application_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_accounts_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_application_assignments: {
        Row: {
          analyst_id: string
          application_id: string
          assigned_at: string
          assigned_by: string
          ended_at: string | null
          id: string
          organization_id: string
        }
        Insert: {
          analyst_id: string
          application_id: string
          assigned_at?: string
          assigned_by: string
          ended_at?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          analyst_id?: string
          application_id?: string
          assigned_at?: string
          assigned_by?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_application_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_assignments_analyst_tenant_fk"
            columns: ["organization_id", "analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_assignments_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_assignments_assigner_tenant_fk"
            columns: ["organization_id", "assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_application_items: {
        Row: {
          application_id: string
          description: string
          id: string
          inventory_unit_id: string | null
          organization_id: string
          price: number
        }
        Insert: {
          application_id: string
          description: string
          id?: string
          inventory_unit_id?: string | null
          organization_id: string
          price: number
        }
        Update: {
          application_id?: string
          description?: string
          id?: string
          inventory_unit_id?: string | null
          organization_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_application_items_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_application_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_items_unit_tenant_fk"
            columns: ["organization_id", "inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_application_notes: {
        Row: {
          application_id: string
          author_id: string
          created_at: string
          id: string
          note: string
          organization_id: string
          visibility: string
        }
        Insert: {
          application_id: string
          author_id: string
          created_at?: string
          id?: string
          note: string
          organization_id: string
          visibility?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          organization_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_application_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_notes_author_tenant_fk"
            columns: ["organization_id", "author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_application_profiles: {
        Row: {
          application_id: string
          birth_date: string
          consent_credit_review: boolean
          consent_data_processing: boolean
          created_at: string
          current_address: string
          dependents: number
          employer_name: string
          employment_months: number
          housing_type: string
          id: string
          job_title: string | null
          marital_status: string
          monthly_expenses: number
          monthly_income: number
          organization_id: string
          reference_one_name: string
          reference_one_phone: string
          reference_one_relationship: string
          reference_two_name: string
          reference_two_phone: string
          reference_two_relationship: string
        }
        Insert: {
          application_id: string
          birth_date: string
          consent_credit_review: boolean
          consent_data_processing: boolean
          created_at?: string
          current_address: string
          dependents?: number
          employer_name: string
          employment_months: number
          housing_type: string
          id?: string
          job_title?: string | null
          marital_status: string
          monthly_expenses: number
          monthly_income: number
          organization_id: string
          reference_one_name: string
          reference_one_phone: string
          reference_one_relationship: string
          reference_two_name: string
          reference_two_phone: string
          reference_two_relationship: string
        }
        Update: {
          application_id?: string
          birth_date?: string
          consent_credit_review?: boolean
          consent_data_processing?: boolean
          created_at?: string
          current_address?: string
          dependents?: number
          employer_name?: string
          employment_months?: number
          housing_type?: string
          id?: string
          job_title?: string | null
          marital_status?: string
          monthly_expenses?: number
          monthly_income?: number
          organization_id?: string
          reference_one_name?: string
          reference_one_phone?: string
          reference_one_relationship?: string
          reference_two_name?: string
          reference_two_phone?: string
          reference_two_relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_application_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_profiles_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_application_status_history: {
        Row: {
          actor_id: string
          application_id: string
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          status: Database["public"]["Enums"]["credit_application_status"]
        }
        Insert: {
          actor_id: string
          application_id: string
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          status: Database["public"]["Enums"]["credit_application_status"]
        }
        Update: {
          actor_id?: string
          application_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["credit_application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "credit_application_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_status_history_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_status_history_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_applications: {
        Row: {
          assigned_analyst_id: string | null
          branch_id: string
          business_unit_id: string
          configuration_version_id: string | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          inventory_unit_id: string | null
          organization_id: string
          proposed_down_payment: number
          proposed_term: number
          requested_price: number
          status: Database["public"]["Enums"]["credit_application_status"]
          updated_at: string
        }
        Insert: {
          assigned_analyst_id?: string | null
          branch_id: string
          business_unit_id: string
          configuration_version_id?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          inventory_unit_id?: string | null
          organization_id: string
          proposed_down_payment: number
          proposed_term: number
          requested_price: number
          status?: Database["public"]["Enums"]["credit_application_status"]
          updated_at?: string
        }
        Update: {
          assigned_analyst_id?: string | null
          branch_id?: string
          business_unit_id?: string
          configuration_version_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          inventory_unit_id?: string | null
          organization_id?: string
          proposed_down_payment?: number
          proposed_term?: number
          requested_price?: number
          status?: Database["public"]["Enums"]["credit_application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_applications_analyst_tenant_fk"
            columns: ["organization_id", "assigned_analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_applications_branch_tenant_fk"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_applications_config_tenant_fk"
            columns: ["organization_id", "configuration_version_id"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_applications_creator_tenant_fk"
            columns: ["organization_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_applications_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_applications_inventory_tenant_fk"
            columns: ["organization_id", "inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_unit_tenant_fk"
            columns: ["organization_id", "business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      credit_contracts: {
        Row: {
          accepted_at: string | null
          accepted_by_customer: boolean
          application_id: string
          contract_number: string
          created_at: string
          created_by: string
          id: string
          organization_id: string
          signature_name: string | null
          terms_snapshot: Json
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_customer?: boolean
          application_id: string
          contract_number: string
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          signature_name?: string | null
          terms_snapshot?: Json
        }
        Update: {
          accepted_at?: string | null
          accepted_by_customer?: boolean
          application_id?: string
          contract_number?: string
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          signature_name?: string | null
          terms_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "credit_contracts_application_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_contracts_creator_tenant_fk"
            columns: ["organization_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_decisions: {
        Row: {
          application_id: string
          conditions: Json
          created_at: string
          decided_by: string
          decision: string
          id: string
          organization_id: string
          reason: string
        }
        Insert: {
          application_id: string
          conditions?: Json
          created_at?: string
          decided_by: string
          decision: string
          id?: string
          organization_id: string
          reason: string
        }
        Update: {
          application_id?: string
          conditions?: Json
          created_at?: string
          decided_by?: string
          decision?: string
          id?: string
          organization_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_decisions_actor_tenant_fk"
            columns: ["organization_id", "decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_decisions_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_installments: {
        Row: {
          account_id: string
          amount: number
          due_date: string
          id: string
          installment_number: number
          organization_id: string
          paid_amount: number
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          due_date: string
          id?: string
          installment_number: number
          organization_id: string
          paid_amount?: number
          status: string
        }
        Update: {
          account_id?: string
          amount?: number
          due_date?: string
          id?: string
          installment_number?: number
          organization_id?: string
          paid_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_installments_account_tenant_fk"
            columns: ["organization_id", "account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_installments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_policies: {
        Row: {
          id: string
          max_payment_income_ratio: number
          max_term: number
          min_down_payment_ratio: number
          min_employment_months: number
          organization_id: string
          require_guarantor_below_score: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          max_payment_income_ratio?: number
          max_term?: number
          min_down_payment_ratio?: number
          min_employment_months?: number
          organization_id: string
          require_guarantor_below_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          max_payment_income_ratio?: number
          max_term?: number
          min_down_payment_ratio?: number
          min_employment_months?: number
          organization_id?: string
          require_guarantor_below_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_policies_actor_tenant_fk"
            columns: ["organization_id", "updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_risk_assessments: {
        Row: {
          application_id: string
          calculated_by: string | null
          created_at: string
          disposable_income: number
          factors: Json
          id: string
          organization_id: string
          payment_to_income_ratio: number
          recommendation: string
          score: number
        }
        Insert: {
          application_id: string
          calculated_by?: string | null
          created_at?: string
          disposable_income: number
          factors?: Json
          id?: string
          organization_id: string
          payment_to_income_ratio: number
          recommendation: string
          score: number
        }
        Update: {
          application_id?: string
          calculated_by?: string | null
          created_at?: string
          disposable_income?: number
          factors?: Json
          id?: string
          organization_id?: string
          payment_to_income_ratio?: number
          recommendation?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_assessments_actor_tenant_fk"
            columns: ["organization_id", "calculated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_assessments_app_tenant_fk"
            columns: ["organization_id", "application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "credit_risk_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          address_type: string
          created_at: string
          customer_id: string
          holder_relationship: string | null
          id: string
          organization_id: string
          proof_holder_name: string | null
          proof_type: string | null
        }
        Insert: {
          address: string
          address_type: string
          created_at?: string
          customer_id: string
          holder_relationship?: string | null
          id?: string
          organization_id: string
          proof_holder_name?: string | null
          proof_type?: string | null
        }
        Update: {
          address?: string
          address_type?: string
          created_at?: string
          customer_id?: string
          holder_relationship?: string | null
          id?: string
          organization_id?: string
          proof_holder_name?: string | null
          proof_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_assignments: {
        Row: {
          assigned_at: string
          branch_id: string
          customer_id: string
          ended_at: string | null
          id: string
          organization_id: string
          salesperson_id: string
        }
        Insert: {
          assigned_at?: string
          branch_id: string
          customer_id: string
          ended_at?: string | null
          id?: string
          organization_id: string
          salesperson_id: string
        }
        Update: {
          assigned_at?: string
          branch_id?: string
          customer_id?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          salesperson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_assignments_branch_tenant_fk"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_assignments_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assignments_salesperson_tenant_fk"
            columns: ["organization_id", "salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      customer_consents: {
        Row: {
          consent_type: string
          created_at: string
          customer_id: string
          granted: boolean
          id: string
          metadata: Json
          organization_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          customer_id: string
          granted: boolean
          id?: string
          metadata?: Json
          organization_id: string
          version: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          customer_id?: string
          granted?: boolean
          id?: string
          metadata?: Json
          organization_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          created_at: string
          customer_id: string
          document_type: string
          id: string
          metadata: Json
          organization_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          document_type: string
          id?: string
          metadata?: Json
          organization_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          document_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_employment: {
        Row: {
          created_at: string
          customer_id: string
          employer_name: string
          id: string
          monthly_income: number | null
          organization_id: string
          position: string | null
          started_on: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          employer_name: string
          id?: string
          monthly_income?: number | null
          organization_id: string
          position?: string | null
          started_on?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          employer_name?: string
          id?: string
          monthly_income?: number | null
          organization_id?: string
          position?: string | null
          started_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_employment_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_employment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_access: {
        Row: {
          access_token: string
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          organization_id: string
          revoked_at: string | null
        }
        Insert: {
          access_token?: string
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          organization_id: string
          revoked_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      customer_references: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          name: string
          organization_id: string
          phone: string
          relationship: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          name: string
          organization_id: string
          phone: string
          relationship: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_references_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_references_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_id: string
          description: string
          event_type: string
          id: string
          metadata: Json
          organization_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_id: string
          description: string
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_timeline_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_timeline_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          customer_type: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          normalized_dni: string
          organization_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_type?: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          normalized_dni: string
          organization_id: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_type?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          normalized_dni?: string
          organization_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_creator_tenant_fk"
            columns: ["organization_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_commands: {
        Row: {
          acknowledged_at: string | null
          command: string
          enrollment_id: string
          id: string
          organization_id: string
          reason: string
          requested_at: string
          requested_by: string
          result: Json | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          command: string
          enrollment_id: string
          id?: string
          organization_id: string
          reason: string
          requested_at?: string
          requested_by: string
          result?: Json | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          command?: string
          enrollment_id?: string
          id?: string
          organization_id?: string
          reason?: string
          requested_at?: string
          requested_by?: string
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_enrollment_tenant_fk"
            columns: ["organization_id", "enrollment_id"]
            isOneToOne: false
            referencedRelation: "device_enrollments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "device_commands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_commands_requester_tenant_fk"
            columns: ["organization_id", "requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      device_enrollments: {
        Row: {
          account_id: string | null
          created_at: string
          created_by: string
          device_identifier: string | null
          enrolled_at: string | null
          enrollment_token: string
          id: string
          inventory_unit_id: string
          last_seen_at: string | null
          organization_id: string
          status: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          created_by: string
          device_identifier?: string | null
          enrolled_at?: string | null
          enrollment_token?: string
          id?: string
          inventory_unit_id: string
          last_seen_at?: string | null
          organization_id: string
          status?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          created_by?: string
          device_identifier?: string | null
          enrolled_at?: string | null
          enrollment_token?: string
          id?: string
          inventory_unit_id?: string
          last_seen_at?: string | null
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_enrollments_account_tenant_fk"
            columns: ["organization_id", "account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "device_enrollments_creator_tenant_fk"
            columns: ["organization_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "device_enrollments_inventory_tenant_fk"
            columns: ["organization_id", "inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "device_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_discrepancies: {
        Row: {
          created_at: string
          description: string
          expected_inventory_unit_id: string | null
          id: string
          organization_id: string
          resolved_at: string | null
          scanned_imei: string | null
          transfer_id: string
        }
        Insert: {
          created_at?: string
          description: string
          expected_inventory_unit_id?: string | null
          id?: string
          organization_id: string
          resolved_at?: string | null
          scanned_imei?: string | null
          transfer_id: string
        }
        Update: {
          created_at?: string
          description?: string
          expected_inventory_unit_id?: string | null
          id?: string
          organization_id?: string
          resolved_at?: string | null
          scanned_imei?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_discrepancies_transfer_tenant_fk"
            columns: ["organization_id", "transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_discrepancies_unit_tenant_fk"
            columns: ["organization_id", "expected_inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfer_discrepancies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transfer_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          organization_id: string
          transfer_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
          transfer_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_events_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfer_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_events_transfer_tenant_fk"
            columns: ["organization_id", "transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      inventory_transfer_items: {
        Row: {
          destination_scanned_at: string | null
          id: string
          inventory_unit_id: string
          organization_id: string
          origin_scanned_at: string | null
          transfer_id: string
        }
        Insert: {
          destination_scanned_at?: string | null
          id?: string
          inventory_unit_id: string
          organization_id: string
          origin_scanned_at?: string | null
          transfer_id: string
        }
        Update: {
          destination_scanned_at?: string | null
          id?: string
          inventory_unit_id?: string
          organization_id?: string
          origin_scanned_at?: string | null
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfer_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_tenant_fk"
            columns: ["organization_id", "transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_unit_tenant_fk"
            columns: ["organization_id", "inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      inventory_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          destination_branch_id: string
          destination_owner_business_unit_id: string | null
          dispatched_by: string | null
          id: string
          organization_id: string
          origin_branch_id: string
          received_by: string | null
          requested_by: string
          status: Database["public"]["Enums"]["transfer_status"]
          transfer_ownership: boolean
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          destination_branch_id: string
          destination_owner_business_unit_id?: string | null
          dispatched_by?: string | null
          id?: string
          organization_id: string
          origin_branch_id: string
          received_by?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_ownership?: boolean
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          destination_branch_id?: string
          destination_owner_business_unit_id?: string | null
          dispatched_by?: string | null
          id?: string
          organization_id?: string
          origin_branch_id?: string
          received_by?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          transfer_ownership?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transfers_approver_tenant_fk"
            columns: ["organization_id", "approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfers_destination_tenant_fk"
            columns: ["organization_id", "destination_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfers_dispatcher_tenant_fk"
            columns: ["organization_id", "dispatched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_origin_tenant_fk"
            columns: ["organization_id", "origin_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfers_owner_tenant_fk"
            columns: ["organization_id", "destination_owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfers_receiver_tenant_fk"
            columns: ["organization_id", "received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transfers_requester_tenant_fk"
            columns: ["organization_id", "requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      inventory_unit_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          from_branch_id: string | null
          from_owner_business_unit_id: string | null
          id: string
          inventory_unit_id: string
          movement_type: string
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          to_branch_id: string | null
          to_owner_business_unit_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_branch_id?: string | null
          from_owner_business_unit_id?: string | null
          id?: string
          inventory_unit_id: string
          movement_type: string
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          to_branch_id?: string | null
          to_owner_business_unit_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_branch_id?: string | null
          from_owner_business_unit_id?: string | null
          id?: string
          inventory_unit_id?: string
          movement_type?: string
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          to_branch_id?: string | null
          to_owner_business_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_from_branch_tenant_fk"
            columns: ["organization_id", "from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_from_owner_tenant_fk"
            columns: ["organization_id", "from_owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_to_branch_tenant_fk"
            columns: ["organization_id", "to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_to_owner_tenant_fk"
            columns: ["organization_id", "to_owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_movements_unit_tenant_fk"
            columns: ["organization_id", "inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_units: {
        Row: {
          brand_id: string
          cash_price: number
          color: string | null
          condition: string
          cost: number
          created_at: string
          current_branch_id: string
          id: string
          imei_1: string
          imei_2: string | null
          mdm_compatible: boolean
          model_id: string
          organization_id: string
          owner_business_unit_id: string
          ram_capacity: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["inventory_status"]
          storage_capacity: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          cash_price: number
          color?: string | null
          condition: string
          cost: number
          created_at?: string
          current_branch_id: string
          id?: string
          imei_1: string
          imei_2?: string | null
          mdm_compatible?: boolean
          model_id: string
          organization_id: string
          owner_business_unit_id: string
          ram_capacity?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          storage_capacity?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          cash_price?: number
          color?: string | null
          condition?: string
          cost?: number
          created_at?: string
          current_branch_id?: string
          id?: string
          imei_1?: string
          imei_2?: string | null
          mdm_compatible?: boolean
          model_id?: string
          organization_id?: string
          owner_business_unit_id?: string
          ram_capacity?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          storage_capacity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_units_branch_tenant_fk"
            columns: ["organization_id", "current_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_units_brand_tenant_fk"
            columns: ["organization_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_units_model_tenant_fk"
            columns: ["organization_id", "model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_units_owner_tenant_fk"
            columns: ["organization_id", "owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string
          trial_started_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string
          trial_started_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string
          trial_started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          commercial_name: string
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          commercial_name: string
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          commercial_name?: string
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payment_applications: {
        Row: {
          account_id: string
          amount: number
          applied_at: string
          applied_by: string | null
          id: string
          organization_id: string
          transfer_report_id: string
        }
        Insert: {
          account_id: string
          amount: number
          applied_at?: string
          applied_by?: string | null
          id?: string
          organization_id: string
          transfer_report_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          applied_at?: string
          applied_by?: string | null
          id?: string
          organization_id?: string
          transfer_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_account_tenant_fk"
            columns: ["organization_id", "account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "payment_applications_actor_tenant_fk"
            columns: ["organization_id", "applied_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "payment_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_report_tenant_fk"
            columns: ["organization_id", "transfer_report_id"]
            isOneToOne: false
            referencedRelation: "transfer_reports"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
          id: string
        }
        Insert: {
          code: string
          description: string
          id?: string
        }
        Update: {
          code?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      product_brands: {
        Row: {
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_models: {
        Row: {
          brand_id: string
          category: string
          id: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["entity_status"]
        }
        Insert: {
          brand_id: string
          category?: string
          id?: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Update: {
          brand_id?: string
          category?: string
          id?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_models_brand_tenant_fk"
            columns: ["organization_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "product_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_roles: {
        Row: {
          profile_id: string
          role_id: string
        }
        Insert: {
          profile_id: string
          role_id: string
        }
        Update: {
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          organization_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          organization_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
        }
        Insert: {
          description?: string
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
        }
        Update: {
          description?: string
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_actions: {
        Row: {
          action_type: string
          id: string
          organization_id: string
          position: number
          rule_id: string
          value: Json
        }
        Insert: {
          action_type: string
          id?: string
          organization_id: string
          position: number
          rule_id: string
          value: Json
        }
        Update: {
          action_type?: string
          id?: string
          organization_id?: string
          position?: number
          rule_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rule_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_actions_rule_tenant_fk"
            columns: ["organization_id", "rule_id"]
            isOneToOne: false
            referencedRelation: "business_rules"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      rule_conditions: {
        Row: {
          field: string
          id: string
          operand: Json
          operator: string
          organization_id: string
          position: number
          rule_id: string
        }
        Insert: {
          field: string
          id?: string
          operand: Json
          operator: string
          organization_id: string
          position: number
          rule_id: string
        }
        Update: {
          field?: string
          id?: string
          operand?: Json
          operator?: string
          organization_id?: string
          position?: number
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_conditions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_conditions_rule_tenant_fk"
            columns: ["organization_id", "rule_id"]
            isOneToOne: false
            referencedRelation: "business_rules"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      rule_execution_logs: {
        Row: {
          created_at: string
          evaluations: Json
          executed_by: string | null
          id: string
          inputs: Json
          organization_id: string
          result: Json
          rule_set_id: string
          subject_id: string | null
          subject_type: string
        }
        Insert: {
          created_at?: string
          evaluations: Json
          executed_by?: string | null
          id?: string
          inputs: Json
          organization_id: string
          result: Json
          rule_set_id: string
          subject_id?: string | null
          subject_type: string
        }
        Update: {
          created_at?: string
          evaluations?: Json
          executed_by?: string | null
          id?: string
          inputs?: Json
          organization_id?: string
          result?: Json
          rule_set_id?: string
          subject_id?: string | null
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_execution_actor_tenant_fk"
            columns: ["organization_id", "executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "rule_execution_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_execution_set_tenant_fk"
            columns: ["organization_id", "rule_set_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      rule_sets: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          status: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rule_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          features: Json
          id: string
          limits: Json
          monthly_price: number
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          trial_days: number
        }
        Insert: {
          code: string
          created_at?: string
          features?: Json
          id?: string
          limits?: Json
          monthly_price?: number
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          trial_days?: number
        }
        Update: {
          code?: string
          created_at?: string
          features?: Json
          id?: string
          limits?: Json
          monthly_price?: number
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          trial_days?: number
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          id: string
          metric: string
          organization_id: string
          period_end: string
          period_start: string
          used: number
        }
        Insert: {
          id?: string
          metric: string
          organization_id: string
          period_end: string
          period_start: string
          used?: number
        }
        Update: {
          id?: string
          metric?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          branch_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string
          organization_id: string
          role_name: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          id?: string
          invited_by: string
          organization_id: string
          role_name: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role_name?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_branch_tenant_fk"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "team_invitations_inviter_tenant_fk"
            columns: ["organization_id", "invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "team_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_report_files: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          storage_path: string
          transfer_report_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          storage_path: string
          transfer_report_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          storage_path?: string
          transfer_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_report_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_report_files_report_tenant_fk"
            columns: ["organization_id", "transfer_report_id"]
            isOneToOne: false
            referencedRelation: "transfer_reports"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      transfer_reports: {
        Row: {
          amount: number
          approximate_time: string | null
          bank_account_id: string
          created_at: string
          credit_application_id: string | null
          customer_id: string
          id: string
          organization_id: string
          origin_bank: string
          reference_number: string
          sender_account_holder: string
          status: Database["public"]["Enums"]["transfer_report_status"]
          transferred_on: string
        }
        Insert: {
          amount: number
          approximate_time?: string | null
          bank_account_id: string
          created_at?: string
          credit_application_id?: string | null
          customer_id: string
          id?: string
          organization_id: string
          origin_bank: string
          reference_number: string
          sender_account_holder: string
          status?: Database["public"]["Enums"]["transfer_report_status"]
          transferred_on: string
        }
        Update: {
          amount?: number
          approximate_time?: string | null
          bank_account_id?: string
          created_at?: string
          credit_application_id?: string | null
          customer_id?: string
          id?: string
          organization_id?: string
          origin_bank?: string
          reference_number?: string
          sender_account_holder?: string
          status?: Database["public"]["Enums"]["transfer_report_status"]
          transferred_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_reports_application_tenant_fk"
            columns: ["organization_id", "credit_application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "transfer_reports_bank_tenant_fk"
            columns: ["organization_id", "bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "transfer_reports_customer_tenant_fk"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "transfer_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_validation_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["transfer_report_status"]
            | null
          id: string
          notes: string
          organization_id: string
          to_status: Database["public"]["Enums"]["transfer_report_status"]
          transfer_report_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["transfer_report_status"]
            | null
          id?: string
          notes: string
          organization_id: string
          to_status: Database["public"]["Enums"]["transfer_report_status"]
          transfer_report_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["transfer_report_status"]
            | null
          id?: string
          notes?: string
          organization_id?: string
          to_status?: Database["public"]["Enums"]["transfer_report_status"]
          transfer_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_validation_actor_tenant_fk"
            columns: ["organization_id", "actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "transfer_validation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_validation_report_tenant_fk"
            columns: ["organization_id", "transfer_report_id"]
            isOneToOne: false
            referencedRelation: "transfer_reports"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      user_branch_access: {
        Row: {
          branch_id: string
          can_manage: boolean
          profile_id: string
        }
        Insert: {
          branch_id: string
          can_manage?: boolean
          profile_id: string
        }
        Update: {
          branch_id?: string
          can_manage?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_access_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_branch_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: { Args: { p_token: string }; Returns: undefined }
      acknowledge_device_command: {
        Args: {
          p_command_id: string
          p_result?: Json
          p_success: boolean
          p_token: string
        }
        Returns: undefined
      }
      activate_device_enrollment: {
        Args: { p_device_identifier: string; p_token: string }
        Returns: string
      }
      approve_inventory_transfer: {
        Args: { p_transfer_id: string }
        Returns: undefined
      }
      attach_customer_receipt: {
        Args: { p_report_id: string; p_storage_path: string; p_token: string }
        Returns: undefined
      }
      change_subscription_plan: {
        Args: { p_plan_code: string }
        Returns: undefined
      }
      create_branch: {
        Args: {
          p_address: string
          p_business_unit_id: string
          p_code: string
          p_name: string
          p_phone?: string
        }
        Returns: string
      }
      create_business_unit: {
        Args: {
          p_commercial_name: string
          p_legal_name: string
          p_owner_name: string
          p_rtn: string
        }
        Returns: string
      }
      create_device_enrollment: {
        Args: { p_account_id?: string; p_inventory_unit_id: string }
        Returns: Json
      }
      create_inventory_transfer: {
        Args: {
          p_destination: string
          p_destination_owner_business_unit_id?: string
          p_inventory_ids: string[]
          p_origin: string
          p_transfer_ownership: boolean
        }
        Returns: string
      }
      create_organization_onboarding: {
        Args: {
          p_address: string
          p_branch_code: string
          p_branch_name: string
          p_commercial_name: string
          p_legal_name: string
          p_name: string
          p_owner_name: string
          p_phone: string
          p_rtn: string
        }
        Returns: string
      }
      create_team_invitation: {
        Args: {
          p_branch_id?: string
          p_email: string
          p_full_name: string
          p_role_name: string
        }
        Returns: string
      }
      customer_portal_summary: { Args: { p_token: string }; Returns: Json }
      dashboard_metrics: { Args: never; Returns: Json }
      decide_credit_application: {
        Args: {
          p_application_id: string
          p_conditions?: Json
          p_decision: string
          p_reason: string
        }
        Returns: undefined
      }
      device_command_sync: { Args: { p_token: string }; Returns: Json }
      dispatch_inventory_transfer: {
        Args: { p_scanned_imeis: string[]; p_transfer_id: string }
        Returns: undefined
      }
      formalize_credit: {
        Args: {
          p_application_id: string
          p_payment_method: string
          p_reference?: string
          p_signature_name: string
        }
        Returns: Json
      }
      get_configuration_state: { Args: never; Returns: Json }
      issue_customer_portal_link: {
        Args: { p_customer_id: string; p_rotate?: boolean }
        Returns: string
      }
      publish_configuration_draft: {
        Args: { p_version_id: string }
        Returns: Json
      }
      publish_rule_set: { Args: { p_rule_set_id: string }; Returns: string }
      queue_device_command: {
        Args: { p_command: string; p_enrollment_id: string; p_reason: string }
        Returns: string
      }
      receive_inventory_transfer: {
        Args: { p_scanned_imeis: string[]; p_transfer_id: string }
        Returns: undefined
      }
      record_cash_installment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_payment_method: string
          p_reference?: string
        }
        Returns: string
      }
      record_collection_action: {
        Args: {
          p_account_id: string
          p_action_type: string
          p_notes: string
          p_promised_date?: string
        }
        Returns: string
      }
      record_rule_execution: {
        Args: {
          p_evaluations: Json
          p_inputs: Json
          p_result: Json
          p_rule_set_id: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: string
      }
      refresh_credit_assessment: {
        Args: { p_application_id: string }
        Returns: Json
      }
      register_inventory_device: {
        Args: {
          p_branch_id: string
          p_brand: string
          p_cash_price: number
          p_color: string
          p_cost: number
          p_imei_1: string
          p_imei_2: string
          p_mdm_compatible?: boolean
          p_model: string
          p_ram: string
          p_serial: string
          p_storage: string
        }
        Returns: string
      }
      report_customer_payment: {
        Args: {
          p_account_id: string
          p_amount: number
          p_bank_account_id: string
          p_date: string
          p_holder: string
          p_origin_bank: string
          p_reference: string
          p_token: string
        }
        Returns: string
      }
      resolve_configuration: {
        Args: { p_at?: string; p_key: string }
        Returns: Json
      }
      save_configuration_draft: {
        Args: {
          p_effective_from: string
          p_effective_until?: string
          p_values: Json
          p_version_id: string
        }
        Returns: Json
      }
      submit_complete_credit_application: {
        Args: {
          p_birth_date: string
          p_branch_id: string
          p_consent_credit_review: boolean
          p_consent_data_processing: boolean
          p_current_address: string
          p_dependents: number
          p_dni: string
          p_down_payment: number
          p_email: string
          p_employer_name: string
          p_employment_months: number
          p_first_name: string
          p_housing_type: string
          p_inventory_unit_id: string
          p_job_title: string
          p_last_name: string
          p_marital_status: string
          p_monthly_expenses: number
          p_monthly_income: number
          p_phone: string
          p_reference_one_name: string
          p_reference_one_phone: string
          p_reference_one_relationship: string
          p_reference_two_name: string
          p_reference_two_phone: string
          p_reference_two_relationship: string
          p_requested_price: number
          p_term: number
        }
        Returns: string
      }
      submit_credit_application: {
        Args: {
          p_branch_id: string
          p_dni: string
          p_down_payment: number
          p_email: string
          p_first_name: string
          p_inventory_unit_id: string
          p_last_name: string
          p_phone: string
          p_requested_price: number
          p_term: number
        }
        Returns: string
      }
      subscription_summary: { Args: never; Returns: Json }
      update_credit_policy: {
        Args: {
          p_max_payment_income_ratio: number
          p_max_term: number
          p_min_down_payment_ratio: number
          p_min_employment_months: number
          p_require_guarantor_below_score: number
        }
        Returns: undefined
      }
      validate_customer_payment: {
        Args: { p_approve: boolean; p_notes: string; p_report_id: string }
        Returns: undefined
      }
    }
    Enums: {
      credit_application_status:
        | "draft"
        | "documents_pending"
        | "submitted"
        | "under_review"
        | "additional_information_required"
        | "preapproved"
        | "approved"
        | "rejected"
        | "contract_pending"
        | "signed"
        | "device_setup_pending"
        | "ready_for_delivery"
        | "activated"
        | "cancelled"
      entity_status: "active" | "inactive"
      inventory_status:
        | "available"
        | "reserved"
        | "transfer_pending"
        | "in_transit"
        | "sold_cash"
        | "sold"
        | "financed_active"
        | "delinquent"
        | "restricted"
        | "warranty"
        | "repair"
        | "recovered"
        | "released"
        | "lost"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "grace_period"
        | "suspended"
        | "cancelled"
        | "expired"
      transfer_report_status:
        | "reported"
        | "under_review"
        | "confirmed"
        | "rejected"
        | "duplicate_suspected"
        | "applied"
        | "reversed"
      transfer_status:
        | "requested"
        | "approved"
        | "preparing"
        | "dispatched"
        | "in_transit"
        | "received"
        | "received_with_discrepancy"
        | "rejected"
        | "cancelled"
        | "lost"
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
      credit_application_status: [
        "draft",
        "documents_pending",
        "submitted",
        "under_review",
        "additional_information_required",
        "preapproved",
        "approved",
        "rejected",
        "contract_pending",
        "signed",
        "device_setup_pending",
        "ready_for_delivery",
        "activated",
        "cancelled",
      ],
      entity_status: ["active", "inactive"],
      inventory_status: [
        "available",
        "reserved",
        "transfer_pending",
        "in_transit",
        "sold_cash",
        "sold",
        "financed_active",
        "delinquent",
        "restricted",
        "warranty",
        "repair",
        "recovered",
        "released",
        "lost",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "grace_period",
        "suspended",
        "cancelled",
        "expired",
      ],
      transfer_report_status: [
        "reported",
        "under_review",
        "confirmed",
        "rejected",
        "duplicate_suspected",
        "applied",
        "reversed",
      ],
      transfer_status: [
        "requested",
        "approved",
        "preparing",
        "dispatched",
        "in_transit",
        "received",
        "received_with_discrepancy",
        "rejected",
        "cancelled",
        "lost",
      ],
    },
  },
} as const
