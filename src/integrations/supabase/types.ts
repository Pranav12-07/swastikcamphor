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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          line1: string
          line2: string | null
          phone: string
          pincode: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          line1: string
          line2?: string | null
          phone: string
          pincode: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          line1?: string
          line2?: string | null
          phone?: string
          pincode?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          button_text: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          button_text?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          button_text?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          category: string | null
          content: string
          cover_alt: string | null
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          read_time: string | null
          related_links: string[]
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          read_time?: string | null
          related_links?: string[]
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          cover_alt?: string | null
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          read_time?: string | null
          related_links?: string[]
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_slug: string
          qty: number
          size: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_slug: string
          qty?: number
          size?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_slug?: string
          qty?: number
          size?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number
          per_customer_limit: number | null
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number
          per_customer_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      customer_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
          template: string
          to_email: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          template: string
          to_email: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          template?: string
          to_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          actor_id: string | null
          change: number
          created_at: string
          id: string
          product_id: string
          reason: string
          reference: string | null
          resulting_stock: number
        }
        Insert: {
          actor_id?: string | null
          change: number
          created_at?: string
          id?: string
          product_id: string
          reason: string
          reference?: string | null
          resulting_stock: number
        }
        Update: {
          actor_id?: string | null
          change?: number
          created_at?: string
          id?: string
          product_id?: string
          reason?: string
          reference?: string | null
          resulting_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          line_total: number
          name: string
          order_id: string
          product_id: string | null
          product_slug: string
          qty: number
          size: string | null
          sku: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total: number
          name: string
          order_id: string
          product_id?: string | null
          product_slug: string
          qty: number
          size?: string | null
          sku?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total?: number
          name?: string
          order_id?: string
          product_id?: string | null
          product_slug?: string
          qty?: number
          size?: string | null
          sku?: string | null
          unit_price?: number
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
          },
        ]
      }
      orders: {
        Row: {
          address: string
          admin_notes: string | null
          city: string
          coupon_code: string | null
          courier: string | null
          created_at: string
          customer_name: string
          delivery_note: string | null
          discount: number
          email: string
          expected_delivery: string | null
          id: string
          items: Json
          order_number: string
          paid_at: string | null
          payment_id: string | null
          payment_order_id: string | null
          payment_provider: string | null
          payment_status: string
          phone: string
          pincode: string
          shipping: number
          state: string
          status: string
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          city: string
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          customer_name: string
          delivery_note?: string | null
          discount?: number
          email: string
          expected_delivery?: string | null
          id?: string
          items?: Json
          order_number: string
          paid_at?: string | null
          payment_id?: string | null
          payment_order_id?: string | null
          payment_provider?: string | null
          payment_status?: string
          phone: string
          pincode: string
          shipping?: number
          state: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          city?: string
          coupon_code?: string | null
          courier?: string | null
          created_at?: string
          customer_name?: string
          delivery_note?: string | null
          discount?: number
          email?: string
          expected_delivery?: string | null
          id?: string
          items?: Json
          order_number?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_order_id?: string | null
          payment_provider?: string | null
          payment_status?: string
          phone?: string
          pincode?: string
          shipping?: number
          state?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          gateway: string
          gateway_order_id: string | null
          id: string
          method: string
          order_id: string
          raw: Json
          screenshot_path: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          upi_ref: string | null
          verified_at: string | null
          verified_by: string | null
          webhook_status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway?: string
          gateway_order_id?: string | null
          id?: string
          method?: string
          order_id: string
          raw?: Json
          screenshot_path?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          upi_ref?: string | null
          verified_at?: string | null
          verified_by?: string | null
          webhook_status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway?: string
          gateway_order_id?: string | null
          id?: string
          method?: string
          order_id?: string
          raw?: Json
          screenshot_path?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          upi_ref?: string | null
          verified_at?: string | null
          verified_by?: string | null
          webhook_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved: boolean
          comment: string
          created_at: string
          id: string
          name: string
          product_slug: string
          rating: number
          user_id: string | null
        }
        Insert: {
          approved?: boolean
          comment: string
          created_at?: string
          id?: string
          name: string
          product_slug: string
          rating: number
          user_id?: string | null
        }
        Update: {
          approved?: boolean
          comment?: string
          created_at?: string
          id?: string
          name?: string
          product_slug?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          features: string[]
          id: string
          image_url: string | null
          images: Json
          is_active: boolean
          is_bestseller: boolean
          is_featured: boolean
          is_new_arrival: boolean
          low_stock_threshold: number
          name: string
          price: number
          seo_description: string | null
          seo_h1: string | null
          seo_keywords: string | null
          seo_subtitle: string | null
          seo_title: string | null
          short_description: string | null
          sizes: string[]
          sku: string | null
          slug: string
          specifications: Json
          status: string
          stock_quantity: number
          subcategory: string | null
          tax_rate: number
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          image_url?: string | null
          images?: Json
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          name: string
          price?: number
          seo_description?: string | null
          seo_h1?: string | null
          seo_keywords?: string | null
          seo_subtitle?: string | null
          seo_title?: string | null
          short_description?: string | null
          sizes?: string[]
          sku?: string | null
          slug: string
          specifications?: Json
          status?: string
          stock_quantity?: number
          subcategory?: string | null
          tax_rate?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          category?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          features?: string[]
          id?: string
          image_url?: string | null
          images?: Json
          is_active?: boolean
          is_bestseller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          name?: string
          price?: number
          seo_description?: string | null
          seo_h1?: string | null
          seo_keywords?: string | null
          seo_subtitle?: string | null
          seo_title?: string | null
          short_description?: string | null
          sizes?: string[]
          sku?: string | null
          slug?: string
          specifications?: Json
          status?: string
          stock_quantity?: number
          subcategory?: string | null
          tax_rate?: number
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_method: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_disabled: boolean
          last_login_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          auth_method?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_disabled?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          auth_method?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
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
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_slug?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_stock: {
        Args: { _qty: number; _reference: string; _slug: string }
        Returns: number
      }
      place_order: {
        Args: {
          _coupon: string
          _customer: Json
          _items: Json
          _payment_method: string
          _user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer"
        | "super_admin"
        | "product_manager"
        | "order_manager"
        | "support_staff"
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
      app_role: [
        "admin",
        "customer",
        "super_admin",
        "product_manager",
        "order_manager",
        "support_staff",
      ],
    },
  },
} as const
