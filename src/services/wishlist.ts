import { supabase } from '../lib/supabase';
import type { Product } from '../types/database';

export interface WishlistItem {
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
}

export interface WishlistProduct extends Product {
  in_wishlist: boolean;
  variant_in_wishlist: string | null;
  wishlist_id: string | null;
}

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  const { data, error } = await supabase.rpc('get_user_wishlist', {
    p_user_id: userId,
  });

  if (error) throw error;
  return (data || []) as WishlistItem[];
}

export async function getWishlistCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_wishlist_count', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data as number;
}

export async function isInWishlist(userId: string, productId: string, variantId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_in_wishlist', {
    p_user_id: userId,
    p_product_id: productId,
    p_variant_id: variantId ?? null,
  });

  if (error) throw error;
  return data as boolean;
}

export async function toggleWishlist(userId: string, productId: string, variantId?: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_wishlist', {
    p_user_id: userId,
    p_product_id: productId,
    p_variant_id: variantId ?? null,
  });

  if (error) throw error;
  return data as boolean;
}

export async function addToWishlist(userId: string, productId: string, variantId?: string): Promise<WishlistItem> {
  // Use RPC function for atomic toggle instead of direct insert
  const added = await toggleWishlist(userId, productId, variantId);
  if (!added) {
    throw new Error('Product already in wishlist');
  }
  // Fetch the newly added item
  const wishlist = await getWishlist(userId);
  const item = wishlist.find(w => w.product_id === productId && w.variant_id === (variantId ?? null));
  if (!item) {
    throw new Error('Failed to fetch added wishlist item');
  }
  return item;
}

export async function removeFromWishlist(wishlistId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('id', wishlistId);

  if (error) throw error;
}

export async function clearWishlist(userId: string): Promise<void> {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}