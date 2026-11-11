export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  pieceName: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
  imageUrl: string | null;
  stock: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  full_description: string | null;
  material: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  sku: string;
  featured: boolean;
  best_seller: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
  [key: string]: unknown;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  is_main: boolean;
  display_order: number;
  created_at: string;
  [key: string]: unknown;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  order_ref: string;
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  customer_email: string | null;
  delivery_instructions: string | null;
  notes: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  status: OrderStatus;
  google_sheets_synced: boolean;
  google_sheets_order_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  items?: OrderItem[];
  [key: string]: unknown;
}

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  piece_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  created_at: string;
  // Relations
  product?: Product;
  variant?: ProductVariant;
  [key: string]: unknown;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'manager';
  created_at: string;
  [key: string]: unknown;
}

export interface StoreSettings {
  id: string;
  key: string;
  value: string | number | boolean | null;
  description: string | null;
  updated_at: string;
  [key: string]: unknown;
}

export interface StoreSettingsMap {
  store_name: string;
  whatsapp_number: string;
  currency: string;
  delivery_fee_cents: number;
  free_delivery_from_cents: number | null;
  logo_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  store_open: boolean;
}

// Database types matching Supabase schema exactly
// Generated from actual SQL migrations
// The __InternalSupabase key is required for proper type inference with postgrest-js
// The structure must match GenericSchema = { Tables, Views, Functions } at the schema level
// Relationships must be arrays (GenericRelationship[]), not tuples
export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      products: {
        Row: Product;
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          slug: string;
          description: string;
          full_description?: string | null;
          material?: string | null;
          price_cents: number;
          sale_price_cents?: number | null;
          sku: string;
          featured?: boolean;
          best_seller?: boolean;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          slug?: string;
          description?: string;
          full_description?: string | null;
          material?: string | null;
          price_cents?: number;
          sale_price_cents?: number | null;
          sku?: string;
          featured?: boolean;
          best_seller?: boolean;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      product_images: {
        Row: ProductImage;
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt_text?: string | null;
          is_main?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt_text?: string | null;
          is_main?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      product_variants: {
        Row: ProductVariant;
        Insert: {
          id?: string;
          product_id: string;
          size: string;
          color: string;
          stock?: number;
          sku: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          size?: string;
          color?: string;
          stock?: number;
          sku?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      orders: {
        Row: Order;
        Insert: {
          id?: string;
          order_ref: string;
          customer_name: string;
          customer_phone: string;
          customer_city: string;
          customer_address: string;
          customer_email?: string | null;
          delivery_instructions?: string | null;
          notes?: string | null;
          subtotal_cents: number;
          delivery_fee_cents?: number;
          total_cents: number;
          status?: OrderStatus;
          google_sheets_synced?: boolean;
          google_sheets_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_ref?: string;
          customer_name?: string;
          customer_phone?: string;
          customer_city?: string;
          customer_address?: string;
          customer_email?: string | null;
          delivery_instructions?: string | null;
          notes?: string | null;
          subtotal_cents?: number;
          delivery_fee_cents?: number;
          total_cents?: number;
          status?: OrderStatus;
          google_sheets_synced?: boolean;
          google_sheets_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      order_items: {
        Row: OrderItem;
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          piece_name: string;
          size: string;
          color: string;
          quantity: number;
          unit_price_cents: number;
          subtotal_cents: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string | null;
          piece_name?: string;
          size?: string;
          color?: string;
          quantity?: number;
          unit_price_cents?: number;
          subtotal_cents?: number;
          created_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          user_id: string;
          full_name?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          phone?: string | null;
          city?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      admin_users: {
        Row: AdminUser;
        Insert: {
          id?: string;
          user_id: string;
          role?: 'super_admin' | 'admin' | 'manager';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'super_admin' | 'admin' | 'manager';
          created_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      store_settings: {
        Row: StoreSettings;
        Insert: {
          id?: string;
          key: string;
          value?: string | number | boolean | null;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: string | number | boolean | null;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne?: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
    };
    Views: {};
    Functions: {
      get_store_settings: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_order: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_city: string;
          p_customer_address: string;
          p_customer_email: string;
          p_delivery_instructions: string;
          p_notes: string;
          p_items: Json;
          p_delivery_fee_cents: number;
        };
        Returns: string;
      };
      update_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: string;
          p_admin_user_id: string;
        };
        Returns: boolean;
      };
      mark_order_synced: {
        Args: {
          p_order_id: string;
          p_sheets_order_id: string;
        };
        Returns: void;
      };
      get_product_detail: {
        Args: {
          p_slug: string;
        };
        Returns: Json;
      };
      get_products_filtered: {
        Args: {
          p_category_slug: string | null;
          p_search: string | null;
          p_featured: boolean | null;
          p_best_seller: boolean | null;
          p_sort: string;
          p_limit: number;
          p_offset: number;
        };
        Returns: Json;
      };
      decrement_variant_stock: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
  };
  // Internal marker for Supabase type inference (used by supabase-js)
  // This must be at the root level of Database, not nested under 'public'
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (3e9f9a2)';
  };
}
// Export Database type for use in services
export type DatabaseWithInternals = Database;