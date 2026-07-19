// Hand-written to match the shape produced by:
//   supabase gen types typescript --project-id <project-ref> > types/database.types.ts
// Source of truth: supabase/migrations/0001_init.sql
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
      artist_profiles: {
        Row: {
          id: string
          shop_name: string
          slug: string
          bio: string | null
          banner_url: string | null
          location: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          shop_name: string
          slug: string
          bio?: string | null
          banner_url?: string | null
          location?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_name?: string
          slug?: string
          bio?: string | null
          banner_url?: string | null
          location?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      wood_types: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          artist_id: string
          category_id: string | null
          wood_type_id: string | null
          title: string
          slug: string
          description: string | null
          price_cents: number
          currency: string
          is_made_to_order: boolean
          stock_quantity: number | null
          status: Database['public']['Enums']['product_status']
          meta_title: string | null
          meta_description: string | null
          view_count: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          artist_id: string
          category_id?: string | null
          wood_type_id?: string | null
          title: string
          slug: string
          description?: string | null
          price_cents: number
          currency?: string
          is_made_to_order?: boolean
          stock_quantity?: number | null
          status?: Database['public']['Enums']['product_status']
          meta_title?: string | null
          meta_description?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          artist_id?: string
          category_id?: string | null
          wood_type_id?: string | null
          title?: string
          slug?: string
          description?: string | null
          price_cents?: number
          currency?: string
          is_made_to_order?: boolean
          stock_quantity?: number | null
          status?: Database['public']['Enums']['product_status']
          meta_title?: string | null
          meta_description?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_wood_type_id_fkey"
            columns: ["wood_type_id"]
            isOneToOne: false
            referencedRelation: "wood_types"
            referencedColumns: ["id"]
          }
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          storage_path: string
          alt_text: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          storage_path: string
          alt_text?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          storage_path?: string
          alt_text?: string | null
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      custom_order_inquiries: {
        Row: {
          id: string
          customer_id: string
          artist_id: string
          product_id: string | null
          status: Database['public']['Enums']['inquiry_status']
          budget_min_cents: number | null
          budget_max_cents: number | null
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          artist_id: string
          product_id?: string | null
          status?: Database['public']['Enums']['inquiry_status']
          budget_min_cents?: number | null
          budget_max_cents?: number | null
          description: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          artist_id?: string
          product_id?: string | null
          status?: Database['public']['Enums']['inquiry_status']
          budget_min_cents?: number | null
          budget_max_cents?: number | null
          description?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_inquiries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_inquiries_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_inquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      inquiry_status_history: {
        Row: {
          id: string
          inquiry_id: string
          old_status: Database['public']['Enums']['inquiry_status'] | null
          new_status: Database['public']['Enums']['inquiry_status']
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          old_status?: Database['public']['Enums']['inquiry_status'] | null
          new_status: Database['public']['Enums']['inquiry_status']
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          old_status?: Database['public']['Enums']['inquiry_status'] | null
          new_status?: Database['public']['Enums']['inquiry_status']
          changed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_status_history_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "custom_order_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      inquiry_messages: {
        Row: {
          id: string
          inquiry_id: string
          sender_id: string
          body: string
          attachment_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inquiry_id: string
          sender_id: string
          body: string
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string
          sender_id?: string
          body?: string
          attachment_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_messages_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "custom_order_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          inquiry_id: string | null
          customer_id: string
          artist_id: string
          status: Database['public']['Enums']['order_status']
          total_price_cents: number
          currency: string
          shipping_address: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          inquiry_id?: string | null
          customer_id: string
          artist_id: string
          status?: Database['public']['Enums']['order_status']
          total_price_cents: number
          currency?: string
          shipping_address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          inquiry_id?: string | null
          customer_id?: string
          artist_id?: string
          status?: Database['public']['Enums']['order_status']
          total_price_cents?: number
          currency?: string
          shipping_address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "custom_order_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          artist_id: string
          viewer_id: string | null
          session_id: string | null
          referrer: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          artist_id: string
          viewer_id?: string | null
          session_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          artist_id?: string
          viewer_id?: string | null
          session_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      user_role: 'customer' | 'artist' | 'admin'
      product_status: 'draft' | 'published' | 'archived'
      inquiry_status:
        | 'new'
        | 'in_discussion'
        | 'quoted'
        | 'accepted'
        | 'declined'
        | 'completed'
        | 'cancelled'
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
export type ArtistProfile = Database['public']['Tables']['artist_profiles']['Row']
export type WoodType = Database['public']['Tables']['wood_types']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']
export type CustomOrderInquiry =
  Database['public']['Tables']['custom_order_inquiries']['Row']
export type InquiryStatusHistory =
  Database['public']['Tables']['inquiry_status_history']['Row']
export type InquiryMessage = Database['public']['Tables']['inquiry_messages']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type ProductView = Database['public']['Tables']['product_views']['Row']

export type UserRole = Database['public']['Enums']['user_role']
export type ProductStatus = Database['public']['Enums']['product_status']
export type InquiryStatus = Database['public']['Enums']['inquiry_status']
export type OrderStatus = Database['public']['Enums']['order_status']
