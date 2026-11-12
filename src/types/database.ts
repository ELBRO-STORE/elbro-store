
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
  items?: OrderItem[];
  [key: string]: unknown;
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

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

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string | null;
  minimum_order_cents: number;
  applicable_categories: string[];
  applicable_products: string[];
  excluded_products: string[];
  is_active: boolean;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string | null;
  order_id: string | null;
  discount_applied_cents: number;
  created_at: string;
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
      coupons: {
        Row: Coupon;
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string | null;
          discount_type: 'percentage' | 'fixed_amount';
          discount_value: number;
          usage_limit?: number | null;
          usage_limit_per_user?: number | null;
          usage_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          minimum_order_cents?: number;
          applicable_categories?: string[];
          applicable_products?: string[];
          excluded_products?: string[];
          is_active?: boolean;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          discount_type?: 'percentage' | 'fixed_amount';
          discount_value?: number;
          usage_limit?: number | null;
          usage_limit_per_user?: number | null;
          usage_count?: number;
          valid_from?: string;
          valid_until?: string | null;
          minimum_order_cents?: number;
          applicable_categories?: string[];
          applicable_products?: string[];
          excluded_products?: string[];
          is_active?: boolean;
          is_public?: boolean;
          created_by?: string | null;
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
      coupon_usages: {
        Row: CouponUsage;
        Insert: {
          id?: string;
          coupon_id: string;
          user_id?: string | null;
          order_id?: string | null;
          discount_applied_cents: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          user_id?: string | null;
          order_id?: string | null;
          discount_applied_cents?: number;
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
      wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          variant_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          variant_id?: string | null;
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
      product_reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          order_id: string | null;
          rating: number;
          title: string | null;
          content: string | null;
          verified_purchase: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          order_id?: string | null;
          rating: number;
          title?: string | null;
          content?: string | null;
          verified_purchase?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          order_id?: string | null;
          rating?: number;
          title?: string | null;
          content?: string | null;
          verified_purchase?: boolean;
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
          p_user_id?: string | null;
          p_discount_cents?: number;
          p_coupon_id?: string | null;
        };
        Returns: string;
      };
      link_guest_orders_to_user: {
        Args: {
          p_user_id: string;
          p_phone: string;
        };
        Returns: number;
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
      validate_coupon: {
        Args: {
          p_code: string;
          p_user_id?: string | null;
          p_order_subtotal_cents: number;
          p_category_ids?: string[];
          p_product_ids?: string[];
        };
        Returns: {
          valid: boolean;
          coupon_id: string | null;
          discount_type: string | null;
          discount_value: number | null;
          discount_cents: number | null;
          error_message: string | null;
        }[];
      };
      record_coupon_usage: {
        Args: {
          p_coupon_id: string;
          p_user_id?: string | null;
          p_order_id: string;
          p_discount_cents: number;
        };
        Returns: void;
      };
      get_available_coupons: {
        Args: {
          p_user_id?: string | null;
        };
        Returns: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          discount_type: string;
          discount_value: number;
          minimum_order_cents: number;
          valid_until: string | null;
        }[];
      };
      admin_create_coupon: {
        Args: {
          p_code: string;
          p_name: string;
          p_description: string;
          p_discount_type: 'percentage' | 'fixed_amount';
          p_discount_value: number;
          p_usage_limit?: number | null;
          p_usage_limit_per_user?: number | null;
          p_valid_from?: string;
          p_valid_until?: string | null;
          p_minimum_order_cents?: number;
          p_applicable_categories?: string[];
          p_applicable_products?: string[];
          p_excluded_products?: string[];
          p_is_active?: boolean;
          p_is_public?: boolean;
        };
        Returns: string;
      };
      admin_update_coupon: {
        Args: {
          p_coupon_id: string;
          p_name?: string | null;
          p_description?: string | null;
          p_discount_value?: number | null;
          p_usage_limit?: number | null;
          p_usage_limit_per_user?: number | null;
          p_valid_until?: string | null;
          p_minimum_order_cents?: number | null;
          p_applicable_categories?: string[] | null;
          p_applicable_products?: string[] | null;
          p_excluded_products?: string[] | null;
          p_is_active?: boolean | null;
          p_is_public?: boolean | null;
        };
        Returns: boolean;
      };
      admin_delete_coupon: {
        Args: {
          p_coupon_id: string;
        };
        Returns: boolean;
      };
      is_in_wishlist: {
        Args: {
          p_user_id: string;
          p_product_id: string;
          p_variant_id?: string | null;
        };
        Returns: boolean;
      };
      get_user_wishlist: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          id: string;
          product_id: string;
          variant_id: string | null;
          product_name: string;
          product_slug: string;
          product_price_cents: number;
          product_sale_price_cents: number | null;
          product_image: string | null;
          variant_size: string | null;
          variant_color: string | null;
          variant_stock: number | null;
          variant_sku: string | null;
          created_at: string;
        }[];
      };
      toggle_wishlist: {
        Args: {
          p_user_id: string;
          p_product_id: string;
          p_variant_id?: string | null;
        };
        Returns: boolean;
      };
      get_wishlist_count: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      get_product_reviews: {
        Args: {
          p_product_id: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          product_id: string;
          user_id: string;
          order_id: string | null;
          rating: number;
          title: string | null;
          content: string | null;
          verified_purchase: boolean;
          created_at: string;
          updated_at: string;
          user_name: string;
          user_avatar: string | null;
        }[];
      };
      get_product_review_stats: {
        Args: {
          p_product_id: string;
        };
        Returns: {
          total_reviews: number;
          average_rating: number;
          rating_1: number;
          rating_2: number;
          rating_3: number;
          rating_4: number;
          rating_5: number;
          verified_count: number;
        }[];
      };
      can_user_review_product: {
        Args: {
          p_user_id: string;
          p_product_id: string;
        };
        Returns: {
          can_review: boolean;
          has_delivered_order: boolean;
          existing_review_id: string | null;
        }[];
      };
      create_product_review: {
        Args: {
          p_product_id: string;
          p_user_id: string;
          p_rating: number;
          p_title?: string | null;
          p_content?: string | null;
          p_order_id?: string | null;
          p_verified_purchase?: boolean;
        };
        Returns: string;
      };
      update_product_review: {
        Args: {
          p_review_id: string;
          p_user_id: string;
          p_rating?: number | null;
          p_title?: string | null;
          p_content?: string | null;
        };
        Returns: boolean;
      };
      delete_product_review: {
        Args: {
          p_review_id: string;
          p_user_id: string;
        };
        Returns: boolean;
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          city: string | null;
          address: string | null;
          created_at: string;
          admin_role: string | null;
        }[];
      };
    };
  };
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (3e9f9a2)';
  };
}

export type DatabaseWithInternals = Database;
