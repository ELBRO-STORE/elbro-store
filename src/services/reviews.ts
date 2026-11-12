import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type ProductReview = Database['public']['Tables']['product_reviews']['Row'];

export interface ReviewWithUser extends ProductReview {
  user_name: string;
  user_avatar: string | null;
}

export interface ReviewStats {
  total_reviews: number;
  average_rating: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
  verified_count: number;
}

export interface CanReviewResult {
  can_review: boolean;
  has_delivered_order: boolean;
  existing_review_id: string | null;
}

export async function getProductReviews(productId: string, limit = 20, offset = 0): Promise<ReviewWithUser[]> {
  const { data, error } = await supabase.rpc('get_product_reviews', {
    p_product_id: productId,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;
  return (data || []) as ReviewWithUser[];
}

export async function getProductReviewStats(productId: string): Promise<ReviewStats> {
  const { data, error } = await supabase.rpc('get_product_review_stats', {
    p_product_id: productId,
  });

  if (error) throw error;
  return (data?.[0] || {
    total_reviews: 0,
    average_rating: 0,
    rating_1: 0,
    rating_2: 0,
    rating_3: 0,
    rating_4: 0,
    rating_5: 0,
    verified_count: 0,
  }) as ReviewStats;
}

export async function canUserReviewProduct(userId: string, productId: string): Promise<CanReviewResult> {
  const { data, error } = await supabase.rpc('can_user_review_product', {
    p_user_id: userId,
    p_product_id: productId,
  });

  if (error) throw error;
  return (data?.[0] || { can_review: false, has_delivered_order: false, existing_review_id: null }) as CanReviewResult;
}

export async function createProductReview(params: {
  product_id: string;
  user_id: string;
  rating: number;
  title?: string | null;
  content?: string | null;
  order_id?: string | null;
  verified_purchase?: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_product_review', {
    p_product_id: params.product_id,
    p_user_id: params.user_id,
    p_rating: params.rating,
    p_title: params.title ?? null,
    p_content: params.content ?? null,
    p_order_id: params.order_id ?? null,
    p_verified_purchase: params.verified_purchase ?? false,
  });

  if (error) throw error;
  return data as string;
}

export async function updateProductReview(params: {
  review_id: string;
  user_id: string;
  rating?: number | null;
  title?: string | null;
  content?: string | null;
}): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_product_review', {
    p_review_id: params.review_id,
    p_user_id: params.user_id,
    p_rating: params.rating ?? null,
    p_title: params.title ?? null,
    p_content: params.content ?? null,
  });

  if (error) throw error;
  return data as boolean;
}

export async function deleteProductReview(reviewId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_product_review', {
    p_review_id: reviewId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data as boolean;
}