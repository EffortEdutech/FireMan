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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          organisation_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          organisation_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          organisation_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          floors: number | null
          id: string
          name: string
          organisation_id: string
          site_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          floors?: number | null
          id?: string
          name: string
          organisation_id: string
          site_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          floors?: number | null
          id?: string
          name?: string
          organisation_id?: string
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          designation: string | null
          email: string | null
          id: string
          is_primary: boolean
          name: string
          organisation_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          organisation_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          organisation_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          organisation_id: string
          phone: string | null
          registration_no: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          organisation_id: string
          phone?: string | null
          registration_no?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          organisation_id?: string
          phone?: string | null
          registration_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          asset_code: string
          brand: string | null
          building_id: string
          capacity: string | null
          created_at: string
          equipment_type_id: string
          id: string
          installation_date: string | null
          last_inspection_at: string | null
          location_description: string | null
          metadata: Json
          model: string | null
          next_inspection_at: string | null
          organisation_id: string
          qr_token: string
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          system_id: string | null
          updated_at: string
        }
        Insert: {
          asset_code: string
          brand?: string | null
          building_id: string
          capacity?: string | null
          created_at?: string
          equipment_type_id: string
          id?: string
          installation_date?: string | null
          last_inspection_at?: string | null
          location_description?: string | null
          metadata?: Json
          model?: string | null
          next_inspection_at?: string | null
          organisation_id: string
          qr_token?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          system_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_code?: string
          brand?: string | null
          building_id?: string
          capacity?: string | null
          created_at?: string
          equipment_type_id?: string
          id?: string
          installation_date?: string | null
          last_inspection_at?: string | null
          location_description?: string | null
          metadata?: Json
          model?: string | null
          next_inspection_at?: string | null
          organisation_id?: string
          qr_token?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          system_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          organisation_id: string | null
          system_type: Database["public"]["Enums"]["system_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organisation_id?: string | null
          system_type: Database["public"]["Enums"]["system_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string | null
          system_type?: Database["public"]["Enums"]["system_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_types_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_photos: {
        Row: {
          caption: string | null
          created_at: string
          finding_id: string
          id: string
          organisation_id: string
          storage_path: string
          taken_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          finding_id: string
          id?: string
          organisation_id: string
          storage_path: string
          taken_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          finding_id?: string
          id?: string
          organisation_id?: string
          storage_path?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finding_photos_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_photos_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          equipment_id: string | null
          id: string
          inspection_id: string | null
          job_id: string
          organisation_id: string
          recommendation: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["finding_severity"]
          status: Database["public"]["Enums"]["finding_status"]
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          equipment_id?: string | null
          id?: string
          inspection_id?: string | null
          job_id: string
          organisation_id: string
          recommendation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          status?: Database["public"]["Enums"]["finding_status"]
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          equipment_id?: string | null
          id?: string
          inspection_id?: string | null
          job_id?: string
          organisation_id?: string
          recommendation?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["finding_severity"]
          status?: Database["public"]["Enums"]["finding_status"]
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "maintenance_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finding_quote_requests: {
        Row: {
          created_at: string
          created_by: string
          external_quote_reference: string | null
          finding_id: string
          id: string
          organisation_id: string
          request_notes: string | null
          request_reference: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          external_quote_reference?: string | null
          finding_id: string
          id?: string
          organisation_id: string
          request_notes?: string | null
          request_reference?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          external_quote_reference?: string | null
          finding_id?: string
          id?: string
          organisation_id?: string
          request_notes?: string | null
          request_reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finding_quote_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_quote_requests_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: true
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finding_quote_requests_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_work_orders: {
        Row: {
          assigned_technician_id: string
          authorization_type: Database["public"]["Enums"]["corrective_work_order_authorization"]
          created_at: string
          created_by: string
          exception_reason: string | null
          finding_id: string
          id: string
          organisation_id: string
          parts_used: string | null
          quote_request_id: string | null
          repair_completed_at: string | null
          repair_notes: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["corrective_work_order_status"]
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
          work_order_number: string
        }
        Insert: {
          assigned_technician_id: string
          authorization_type: Database["public"]["Enums"]["corrective_work_order_authorization"]
          created_at?: string
          created_by: string
          exception_reason?: string | null
          finding_id: string
          id?: string
          organisation_id: string
          parts_used?: string | null
          quote_request_id?: string | null
          repair_completed_at?: string | null
          repair_notes?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["corrective_work_order_status"]
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_order_number?: string
        }
        Update: {
          assigned_technician_id?: string
          authorization_type?: Database["public"]["Enums"]["corrective_work_order_authorization"]
          created_at?: string
          created_by?: string
          exception_reason?: string | null
          finding_id?: string
          id?: string
          organisation_id?: string
          parts_used?: string | null
          quote_request_id?: string | null
          repair_completed_at?: string | null
          repair_notes?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["corrective_work_order_status"]
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_work_orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_orders_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_orders_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_orders_quote_request_id_fkey"
            columns: ["quote_request_id"]
            isOneToOne: true
            referencedRelation: "finding_quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_work_order_photos: {
        Row: {
          caption: string | null
          corrective_work_order_id: string
          created_at: string
          finding_id: string
          id: string
          organisation_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          corrective_work_order_id: string
          created_at?: string
          finding_id: string
          id?: string
          organisation_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          corrective_work_order_id?: string
          created_at?: string
          finding_id?: string
          id?: string
          organisation_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_work_order_photos_corrective_work_order_id_fkey"
            columns: ["corrective_work_order_id"]
            isOneToOne: false
            referencedRelation: "corrective_work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_order_photos_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_order_photos_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_work_order_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      inspection_results: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          limit_status: string | null
          notes: string | null
          organisation_id: string
          reading_unit: string | null
          result_status:
            | Database["public"]["Enums"]["inspection_result_status"]
            | null
          semantic_key: string | null
          template_item_id: string
          updated_at: string
          value_date: string | null
          value_json: Json | null
          value_number: number | null
          value_standard: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          limit_status?: string | null
          notes?: string | null
          organisation_id: string
          reading_unit?: string | null
          result_status?:
            | Database["public"]["Enums"]["inspection_result_status"]
            | null
          semantic_key?: string | null
          template_item_id: string
          updated_at?: string
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_standard?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          limit_status?: string | null
          notes?: string | null
          organisation_id?: string
          reading_unit?: string | null
          result_status?:
            | Database["public"]["Enums"]["inspection_result_status"]
            | null
          semantic_key?: string | null
          template_item_id?: string
          updated_at?: string
          value_date?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_standard?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_results_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_results_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_results_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "inspection_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_template_items: {
        Row: {
          created_at: string
          fail_creates_finding: boolean
          field_type: Database["public"]["Enums"]["template_field_type"]
          guidance: string | null
          id: string
          item_code: string
          metadata: Json
          options: Json
          prompt: string
          required: boolean
          section: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          fail_creates_finding?: boolean
          field_type: Database["public"]["Enums"]["template_field_type"]
          guidance?: string | null
          id?: string
          item_code: string
          metadata?: Json
          options?: Json
          prompt: string
          required?: boolean
          section: string
          sort_order: number
          template_id: string
        }
        Update: {
          created_at?: string
          fail_creates_finding?: boolean
          field_type?: Database["public"]["Enums"]["template_field_type"]
          guidance?: string | null
          id?: string
          item_code?: string
          metadata?: Json
          options?: Json
          prompt?: string
          required?: boolean
          section?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          code: string
          created_at: string
          description: string | null
          equipment_type_id: string
          id: string
          name: string
          organisation_id: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          equipment_type_id: string
          id?: string
          name: string
          organisation_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          equipment_type_id?: string
          id?: string
          name?: string
          organisation_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          job_equipment_id: string
          job_id: string
          locked_at: string | null
          organisation_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          technician_id: string | null
          technician_notes: string | null
          template_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          job_equipment_id: string
          job_id: string
          locked_at?: string | null
          organisation_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          technician_id?: string | null
          technician_notes?: string | null
          template_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          job_equipment_id?: string
          job_id?: string
          locked_at?: string | null
          organisation_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          technician_id?: string | null
          technician_notes?: string | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_job_equipment_id_fkey"
            columns: ["job_equipment_id"]
            isOneToOne: true
            referencedRelation: "job_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "maintenance_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          job_id: string
          notes: string | null
          organisation_id: string
          status: Database["public"]["Enums"]["job_equipment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          job_id: string
          notes?: string | null
          organisation_id: string
          status?: Database["public"]["Enums"]["job_equipment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          job_id?: string
          notes?: string | null
          organisation_id?: string
          status?: Database["public"]["Enums"]["job_equipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "maintenance_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_jobs: {
        Row: {
          assigned_technician_id: string | null
          building_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_number: string
          maintenance_plan_id: string | null
          notes: string | null
          organisation_id: string
          scheduled_date: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_technician_id?: string | null
          building_id?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_number: string
          maintenance_plan_id?: string | null
          notes?: string | null
          organisation_id: string
          scheduled_date: string
          site_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_technician_id?: string | null
          building_id?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_number?: string
          maintenance_plan_id?: string | null
          notes?: string | null
          organisation_id?: string
          scheduled_date?: string
          site_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at?: string | null
          supervisor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_jobs_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plans: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"]
          id: string
          interval_days: number | null
          name: string
          organisation_id: string
          site_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          end_date?: string | null
          frequency: Database["public"]["Enums"]["maintenance_frequency"]
          id?: string
          interval_days?: number | null
          name: string
          organisation_id: string
          site_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["maintenance_frequency"]
          id?: string
          interval_days?: number | null
          name?: string
          organisation_id?: string
          site_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          notification_type: string
          organisation_id: string
          read_at: string | null
          recipient_id: string
          status: Database["public"]["Enums"]["notification_status"]
          title: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          notification_type: string
          organisation_id: string
          read_at?: string | null
          recipient_id: string
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          notification_type?: string
          organisation_id?: string
          read_at?: string | null
          recipient_id?: string
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          registration_no: string | null
          report_prefix: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          registration_no?: string | null
          report_prefix?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          registration_no?: string | null
          report_prefix?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          full_name: string
          id: string
          organisation_id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          full_name: string
          id: string
          organisation_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          organisation_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          layout: Json
          name: string
          organisation_id: string
          report_type: Database["public"]["Enums"]["report_type"]
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          layout: Json
          name: string
          organisation_id: string
          report_type?: Database["public"]["Enums"]["report_type"]
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          layout?: Json
          name?: string
          organisation_id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          approved_at: string | null
          created_at: string
          generated_at: string | null
          generated_by: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          job_id: string
          organisation_id: string
          pdf_path: string | null
          report_data: Json | null
          report_number: string
          report_type: Database["public"]["Enums"]["report_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          template_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_id: string
          organisation_id: string
          pdf_path?: string | null
          report_data?: Json | null
          report_number: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          template_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_id?: string
          organisation_id?: string
          pdf_path?: string | null
          report_data?: Json | null
          report_number?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          template_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "maintenance_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          client_id: string
          country: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          organisation_id: string
          postcode: string | null
          site_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          client_id: string
          country?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          organisation_id: string
          postcode?: string | null
          site_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          client_id?: string
          country?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          organisation_id?: string
          postcode?: string | null
          site_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          active: boolean
          building_id: string
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organisation_id: string
          system_type: Database["public"]["Enums"]["system_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          building_id: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          system_type: Database["public"]["Enums"]["system_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          building_id?: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          system_type?: Database["public"]["Enums"]["system_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "systems_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "systems_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      start_corrective_work_order: {
        Args: { p_work_order_id: string }
        Returns: undefined
      }
      verify_corrective_work_order: {
        Args: { p_work_order_id: string; p_verification_notes: string }
        Returns: undefined
      }
      create_maintenance_job: {
        Args: {
          p_assigned_technician_id?: string
          p_building_id: string
          p_client_id: string
          p_maintenance_plan_id: string
          p_notes?: string
          p_scheduled_date: string
          p_site_id: string
        }
        Returns: {
          assigned_technician_id: string | null
          building_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_number: string
          maintenance_plan_id: string | null
          notes: string | null
          organisation_id: string
          scheduled_date: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_next_maintenance_job: {
        Args: { p_current_date?: string; p_plan_id: string }
        Returns: {
          assigned_technician_id: string | null
          building_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_number: string
          maintenance_plan_id: string | null
          notes: string | null
          organisation_id: string
          scheduled_date: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_report_number: { Args: never; Returns: string }
      get_current_organisation_id: { Args: never; Returns: string }
      get_current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin_or_supervisor: { Args: never; Returns: boolean }
      is_internal_user: { Args: never; Returns: boolean }
      issue_report: {
        Args: { p_report_id: string }
        Returns: {
          approved_at: string | null
          created_at: string
          generated_at: string | null
          generated_by: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          job_id: string
          organisation_id: string
          pdf_path: string | null
          report_data: Json | null
          report_number: string
          report_type: Database["public"]["Enums"]["report_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_maintenance_job: {
        Args: { p_job_id: string }
        Returns: {
          assigned_technician_id: string | null
          building_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_number: string
          maintenance_plan_id: string | null
          notes: string | null
          organisation_id: string
          scheduled_date: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_inspection: {
        Args: { p_inspection_id: string }
        Returns: {
          completed_at: string | null
          created_at: string
          id: string
          job_equipment_id: string
          job_id: string
          locked_at: string | null
          organisation_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          technician_id: string | null
          technician_notes: string | null
          template_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "inspections"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_job: {
        Args: { p_job_id: string }
        Returns: {
          assigned_technician_id: string | null
          building_id: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_number: string
          maintenance_plan_id: string | null
          notes: string | null
          organisation_id: string
          scheduled_date: string
          site_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["maintenance_job_status"]
          submitted_at: string | null
          supervisor_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "maintenance_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "OWNER" | "ADMIN" | "SUPERVISOR" | "TECHNICIAN" | "CLIENT"
      corrective_work_order_authorization: "APPROVED_QUOTE" | "MANAGEMENT_EXCEPTION"
      corrective_work_order_status: "SCHEDULED" | "IN_PROGRESS" | "REPAIR_SUBMITTED" | "VERIFIED" | "CANCELLED"
      equipment_status: "ACTIVE" | "OUT_OF_SERVICE" | "RETIRED"
      finding_severity: "OBSERVATION" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      finding_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "VERIFIED"
        | "CLOSED"
      inspection_result_status: "PASS" | "ATTENTION" | "FAIL" | "NA"
      inspection_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED"
      job_equipment_status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
      maintenance_frequency:
        | "MONTHLY"
        | "QUARTERLY"
        | "HALF_YEARLY"
        | "YEARLY"
        | "CUSTOM"
      maintenance_job_status:
        | "SCHEDULED"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "COMPLETED"
        | "CANCELLED"
      notification_status: "UNREAD" | "READ" | "ARCHIVED"
      report_status: "DRAFT" | "GENERATED" | "REVIEWED" | "ISSUED" | "VOID"
      report_type: "MAINTENANCE" | "INSPECTION" | "FINDING" | "OTHER"
      system_type:
        | "FIRE_ALARM"
        | "FIRE_EXTINGUISHING"
        | "HOSE_REEL"
        | "SPRINKLER"
        | "EMERGENCY_LIGHTING"
        | "EXIT_SIGNAGE"
        | "HYDRANT_RISER"
        | "FIRE_PUMP"
        | "GASEOUS_SUPPRESSION"
        | "FOAM_SUPPRESSION"
        | "PASSIVE_PROTECTION"
        | "SMOKE_CONTROL"
        | "OTHER"
      template_field_type:
        | "PASS_FAIL"
        | "YES_NO"
        | "SELECT"
        | "NUMBER"
        | "TEXT"
        | "PHOTO"
        | "DATE"
        | "SIGNATURE"
      template_status: "DRAFT" | "ACTIVE" | "ARCHIVED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["OWNER", "ADMIN", "SUPERVISOR", "TECHNICIAN", "CLIENT"],
      corrective_work_order_authorization: ["APPROVED_QUOTE", "MANAGEMENT_EXCEPTION"],
      corrective_work_order_status: ["SCHEDULED", "IN_PROGRESS", "REPAIR_SUBMITTED", "VERIFIED", "CANCELLED"],
      equipment_status: ["ACTIVE", "OUT_OF_SERVICE", "RETIRED"],
      finding_severity: ["OBSERVATION", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      finding_status: ["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED", "CLOSED"],
      inspection_result_status: ["PASS", "ATTENTION", "FAIL", "NA"],
      inspection_status: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "LOCKED"],
      job_equipment_status: ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"],
      maintenance_frequency: [
        "MONTHLY",
        "QUARTERLY",
        "HALF_YEARLY",
        "YEARLY",
        "CUSTOM",
      ],
      maintenance_job_status: [
        "SCHEDULED",
        "IN_PROGRESS",
        "SUBMITTED",
        "UNDER_REVIEW",
        "COMPLETED",
        "CANCELLED",
      ],
      notification_status: ["UNREAD", "READ", "ARCHIVED"],
      report_status: ["DRAFT", "GENERATED", "REVIEWED", "ISSUED", "VOID"],
      report_type: ["MAINTENANCE", "INSPECTION", "FINDING", "OTHER"],
      system_type: [
        "FIRE_ALARM",
        "FIRE_EXTINGUISHING",
        "HOSE_REEL",
        "SPRINKLER",
        "EMERGENCY_LIGHTING",
        "EXIT_SIGNAGE",
        "HYDRANT_RISER",
        "FIRE_PUMP",
        "GASEOUS_SUPPRESSION",
        "FOAM_SUPPRESSION",
        "PASSIVE_PROTECTION",
        "SMOKE_CONTROL",
        "OTHER",
      ],
      template_field_type: [
        "PASS_FAIL",
        "YES_NO",
        "SELECT",
        "NUMBER",
        "TEXT",
        "PHOTO",
        "DATE",
        "SIGNATURE",
      ],
      template_status: ["DRAFT", "ACTIVE", "ARCHIVED"],
    },
  },
} as const
