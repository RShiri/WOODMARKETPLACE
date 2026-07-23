// Hand-written to match the shape produced by:
//   supabase gen types typescript --project-id <project-ref> > types/database.types.ts
// Source of truth: supabase/migrations/0001_init.sql + 0004_display_boxes.sql
// Regenerate/reconcile this file whenever the schema changes.

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
      profiles: {
        Row: {
          id: string
          role: Database['public']['Enums']['user_role']
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: Database['public']['Enums']['user_role']
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          id: number
          waste_factor: number
          margin_pct: number
          min_margin_cents: number
          assembly_fee_cents: number
          base_led_fee_cents: number
          min_price_cents: number
          rounding_step_cents: number
          clearance_padding_mm: number
          min_dim_mm: number
          max_dim_mm: number
          updated_at: string
        }
        Insert: {
          id?: number
          waste_factor?: number
          margin_pct?: number
          min_margin_cents?: number
          assembly_fee_cents?: number
          base_led_fee_cents?: number
          min_price_cents?: number
          rounding_step_cents?: number
          clearance_padding_mm?: number
          min_dim_mm?: number
          max_dim_mm?: number
          updated_at?: string
        }
        Update: {
          id?: number
          waste_factor?: number
          margin_pct?: number
          min_margin_cents?: number
          assembly_fee_cents?: number
          base_led_fee_cents?: number
          min_price_cents?: number
          rounding_step_cents?: number
          clearance_padding_mm?: number
          min_dim_mm?: number
          max_dim_mm?: number
          updated_at?: string
        }
        Relationships: []
      }
      material_costs: {
        Row: {
          id: string
          material: string
          thickness_mm: number
          cost_per_m2_cents: number
          cut_cost_per_m_cents: number
          effective_from: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          material: string
          thickness_mm: number
          cost_per_m2_cents: number
          cut_cost_per_m_cents: number
          effective_from?: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          material?: string
          thickness_mm?: number
          cost_per_m2_cents?: number
          cut_cost_per_m_cents?: number
          effective_from?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      lego_sets_cache: {
        Row: {
          set_id: string
          name: string | null
          length_mm: number | null
          width_mm: number | null
          height_mm: number | null
          piece_count: number | null
          theme: string | null
          source: string
          confidence: string
          image_url: string | null
          fetched_at: string
        }
        Insert: {
          set_id: string
          name?: string | null
          length_mm?: number | null
          width_mm?: number | null
          height_mm?: number | null
          piece_count?: number | null
          theme?: string | null
          source: string
          confidence: string
          image_url?: string | null
          fetched_at?: string
        }
        Update: {
          set_id?: string
          name?: string | null
          length_mm?: number | null
          width_mm?: number | null
          height_mm?: number | null
          piece_count?: number | null
          theme?: string | null
          source?: string
          confidence?: string
          image_url?: string | null
          fetched_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          length_mm: number
          width_mm: number
          height_mm: number
          base_type: string
          thickness_mm: number
          lego_set_id: string | null
          price_cents: number
          breakdown: Json
          channel: string
          wa_phone: string | null
          status: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          length_mm: number
          width_mm: number
          height_mm: number
          base_type: string
          thickness_mm: number
          lego_set_id?: string | null
          price_cents: number
          breakdown: Json
          channel?: string
          wa_phone?: string | null
          status?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          length_mm?: number
          width_mm?: number
          height_mm?: number
          base_type?: string
          thickness_mm?: number
          lego_set_id?: string | null
          price_cents?: number
          breakdown?: Json
          channel?: string
          wa_phone?: string | null
          status?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lego_set_id_fkey"
            columns: ["lego_set_id"]
            isOneToOne: false
            referencedRelation: "lego_sets_cache"
            referencedColumns: ["set_id"]
          }
        ]
      }
      wa_sessions: {
        Row: {
          phone: string
          state: string
          context: Json
          updated_at: string
        }
        Insert: {
          phone: string
          state?: string
          context?: Json
          updated_at?: string
        }
        Update: {
          phone?: string
          state?: string
          context?: Json
          updated_at?: string
        }
        Relationships: []
      }
      wa_messages: {
        Row: {
          id: string
          phone: string
          direction: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          phone: string
          direction: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          phone?: string
          direction?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      box_gallery: {
        Row: {
          id: string
          title: string
          image_path: string | null
          length_mm: number | null
          width_mm: number | null
          height_mm: number | null
          blurb: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          image_path?: string | null
          length_mm?: number | null
          width_mm?: number | null
          height_mm?: number | null
          blurb?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          image_path?: string | null
          length_mm?: number | null
          width_mm?: number | null
          height_mm?: number | null
          blurb?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          quote_id: string | null
          customer_id: string | null
          customer_name: string
          customer_email: string
          customer_phone: string | null
          status: Database['public']['Enums']['order_status']
          total_price_cents: number
          currency: string
          shipping_address: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_id?: string | null
          customer_id?: string | null
          customer_name: string
          customer_email: string
          customer_phone?: string | null
          status?: Database['public']['Enums']['order_status']
          total_price_cents: number
          currency?: string
          shipping_address: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_id?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_email?: string
          customer_phone?: string | null
          status?: Database['public']['Enums']['order_status']
          total_price_cents?: number
          currency?: string
          shipping_address?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          quote_id: string | null
          description: string
          quantity: number
          unit_price_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          quote_id?: string | null
          description: string
          quantity: number
          unit_price_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          quote_id?: string | null
          description?: string
          quantity?: number
          unit_price_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'customer' | 'admin'
      order_status: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// -----------------------------------------------------------------------------
// Convenience aliases
// -----------------------------------------------------------------------------

export type Profile = Database['public']['Tables']['profiles']['Row']
export type PricingConfig = Database['public']['Tables']['pricing_config']['Row']
export type MaterialCost = Database['public']['Tables']['material_costs']['Row']
export type LegoSetCache = Database['public']['Tables']['lego_sets_cache']['Row']
export type Quote = Database['public']['Tables']['quotes']['Row']
export type WaSession = Database['public']['Tables']['wa_sessions']['Row']
export type WaMessage = Database['public']['Tables']['wa_messages']['Row']
export type BoxGalleryItem = Database['public']['Tables']['box_gallery']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']

export type UserRole = Database['public']['Enums']['user_role']
export type OrderStatus = Database['public']['Enums']['order_status']
