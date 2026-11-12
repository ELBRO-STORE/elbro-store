import { supabase } from '../lib/supabase';
import type { Coupon, CouponUsage } from '../types/database';

export type { Coupon, CouponUsage };

export interface CouponValidationResult {
  valid: boolean;
  coupon: Coupon | null;
  discount_cents: number;
  error_message: string | null;
}

export interface AvailableCoupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  minimum_order_cents: number;
  valid_until: string | null;
}

export interface AdminCouponInput {
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  usage_limit?: number | null;
  usage_limit_per_user?: number | null;
  valid_from?: string;
  valid_until?: string | null;
  minimum_order_cents?: number;
  applicable_categories?: string[];
  applicable_products?: string[];
  excluded_products?: string[];
  is_active?: boolean;
  is_public?: boolean;
}

export async function validateCoupon(
  code: string,
  orderSubtotalCents: number,
  options?: {
    userId?: string | null;
    categoryIds?: string[];
    productIds?: string[];
  }
): Promise<CouponValidationResult> {
  const { data, error } = await supabase
    .rpc('validate_coupon', {
      p_code: code,
      p_user_id: options?.userId ?? null,
      p_order_subtotal_cents: orderSubtotalCents,
      p_category_ids: options?.categoryIds ?? [],
      p_product_ids: options?.productIds ?? [],
    });

  if (error) throw error;

  const result = (data as any[])[0];
  if (!result) {
    return { valid: false, coupon: null, discount_cents: 0, error_message: 'Coupon invalide' };
  }

  let coupon: Coupon | null = null;
  if (result.valid && result.coupon_id) {
    const { data: couponData, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', result.coupon_id)
      .single();

    if (!couponError && couponData) {
      coupon = couponData as Coupon;
    }
  }

  return {
    valid: result.valid,
    coupon,
    discount_cents: result.discount_cents || 0,
    error_message: result.error_message,
  };
}

export async function getAvailableCoupons(userId?: string): Promise<AvailableCoupon[]> {
  const { data, error } = await supabase
    .rpc('get_available_coupons', {
      p_user_id: userId ?? null,
    });

  if (error) throw error;
  return (data as AvailableCoupon[]) || [];
}

export async function recordCouponUsage(
  couponId: string,
  orderId: string,
  discountCents: number,
  userId?: string | null
): Promise<void> {
  const { error } = await supabase
    .rpc('record_coupon_usage', {
      p_coupon_id: couponId,
      p_user_id: userId ?? null,
      p_order_id: orderId,
      p_discount_cents: discountCents,
    });

  if (error) throw error;
}

export async function getCoupon(couponId: string): Promise<Coupon | null> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Coupon;
}

export async function getCoupons(filters?: {
  is_active?: boolean;
  is_public?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ coupons: Coupon[]; total: number }> {
  let query = supabase
    .from('coupons')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.is_public !== undefined) {
    query = query.eq('is_public', filters.is_public);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    coupons: (data as Coupon[]) || [],
    total: count || 0,
  };
}

export async function createCoupon(input: AdminCouponInput): Promise<string> {
  const { data, error } = await supabase
    .rpc('admin_create_coupon', {
      p_code: input.code,
      p_name: input.name,
      p_description: input.description,
      p_discount_type: input.discount_type,
      p_discount_value: input.discount_value,
      p_usage_limit: input.usage_limit ?? null,
      p_usage_limit_per_user: input.usage_limit_per_user ?? 1,
      p_valid_from: input.valid_from ?? new Date().toISOString(),
      p_valid_until: input.valid_until ?? null,
      p_minimum_order_cents: input.minimum_order_cents ?? 0,
      p_applicable_categories: input.applicable_categories ?? [],
      p_applicable_products: input.applicable_products ?? [],
      p_excluded_products: input.excluded_products ?? [],
      p_is_active: input.is_active ?? true,
      p_is_public: input.is_public ?? true,
    });

  if (error) throw error;
  return data as string;
}

export async function updateCoupon(
  couponId: string,
  updates: Partial<AdminCouponInput>
): Promise<void> {
  const { error } = await supabase
    .rpc('admin_update_coupon', {
      p_coupon_id: couponId,
      p_name: updates.name ?? null,
      p_description: updates.description ?? null,
      p_discount_value: updates.discount_value ?? null,
      p_usage_limit: updates.usage_limit ?? null,
      p_usage_limit_per_user: updates.usage_limit_per_user ?? null,
      p_valid_until: updates.valid_until ?? null,
      p_minimum_order_cents: updates.minimum_order_cents ?? null,
      p_applicable_categories: updates.applicable_categories ?? null,
      p_applicable_products: updates.applicable_products ?? null,
      p_excluded_products: updates.excluded_products ?? null,
      p_is_active: updates.is_active ?? null,
      p_is_public: updates.is_public ?? null,
    });

  if (error) throw error;
}

export async function deleteCoupon(couponId: string): Promise<void> {
  const { error } = await supabase
    .rpc('admin_delete_coupon', {
      p_coupon_id: couponId,
    });

  if (error) throw error;
}

export async function getCouponUsages(couponId: string): Promise<CouponUsage[]> {
  const { data, error } = await supabase
    .from('coupon_usages')
    .select('*')
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as CouponUsage[]) || [];
}

export interface CouponUsageWithCoupon extends CouponUsage {
  coupon: Coupon;
}

export async function getUserCouponUsages(userId: string): Promise<CouponUsageWithCoupon[]> {
  const { data, error } = await supabase
    .from('coupon_usages')
    .select('*, coupon:coupons(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}