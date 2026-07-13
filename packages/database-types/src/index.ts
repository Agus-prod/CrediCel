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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "bank_accounts_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "branches_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
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
            foreignKeyName: "business_rules_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["id"]
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
            foreignKeyName: "configuration_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_audit_logs_configuration_value_id_fkey"
            columns: ["configuration_value_id"]
            isOneToOne: false
            referencedRelation: "configuration_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "configuration_values_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "configuration_scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_values_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["id"]
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
            foreignKeyName: "configuration_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "credit_application_assignments_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "credit_application_items_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_items_inventory_unit_id_fkey"
            columns: ["inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "credit_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "credit_application_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_application_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            foreignKeyName: "credit_applications_assigned_analyst_id_fkey"
            columns: ["assigned_analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_configuration_version_id_fkey"
            columns: ["configuration_version_id"]
            isOneToOne: false
            referencedRelation: "configuration_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_inventory_unit_id_fkey"
            columns: ["inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_applications_organization_id_fkey"
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
            foreignKeyName: "credit_decisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_assignments_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_consents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_employment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_references_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "customer_timeline_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_timeline_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "inventory_transfer_discrepancie_expected_inventory_unit_id_fkey"
            columns: ["expected_inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_discrepancies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_discrepancies_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
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
            foreignKeyName: "inventory_transfer_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
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
            foreignKeyName: "inventory_transfer_items_inventory_unit_id_fkey"
            columns: ["inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "inventory_transfers"
            referencedColumns: ["id"]
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
            foreignKeyName: "inventory_transfers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_destination_branch_id_fkey"
            columns: ["destination_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_destination_owner_business_unit_id_fkey"
            columns: ["destination_owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_dispatched_by_fkey"
            columns: ["dispatched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_origin_branch_id_fkey"
            columns: ["origin_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            foreignKeyName: "inventory_unit_movements_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_from_owner_business_unit_id_fkey"
            columns: ["from_owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_inventory_unit_id_fkey"
            columns: ["inventory_unit_id"]
            isOneToOne: false
            referencedRelation: "inventory_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_unit_movements_to_owner_business_unit_id_fkey"
            columns: ["to_owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
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
            foreignKeyName: "inventory_units_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_units_current_branch_id_fkey"
            columns: ["current_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_units_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "product_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_units_owner_business_unit_id_fkey"
            columns: ["owner_business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
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
            foreignKeyName: "product_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id"]
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
            foreignKeyName: "rule_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "business_rules"
            referencedColumns: ["id"]
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
            foreignKeyName: "rule_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "business_rules"
            referencedColumns: ["id"]
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
            foreignKeyName: "rule_execution_logs_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_execution_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_execution_logs_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "rule_sets"
            referencedColumns: ["id"]
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
            foreignKeyName: "transfer_report_files_transfer_report_id_fkey"
            columns: ["transfer_report_id"]
            isOneToOne: false
            referencedRelation: "transfer_reports"
            referencedColumns: ["id"]
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
            foreignKeyName: "transfer_reports_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_reports_credit_application_id_fkey"
            columns: ["credit_application_id"]
            isOneToOne: false
            referencedRelation: "credit_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            foreignKeyName: "transfer_validation_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_validation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_validation_events_transfer_report_id_fkey"
            columns: ["transfer_report_id"]
            isOneToOne: false
            referencedRelation: "transfer_reports"
            referencedColumns: ["id"]
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
      dashboard_metrics: { Args: never; Returns: Json }
      dispatch_inventory_transfer: {
        Args: { p_scanned_imeis: string[]; p_transfer_id: string }
        Returns: undefined
      }
      receive_inventory_transfer: {
        Args: { p_scanned_imeis: string[]; p_transfer_id: string }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
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
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
