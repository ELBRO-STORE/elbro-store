import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Category, ProductImage, ProductVariant } from '../types/database';

export interface ProductWithRelations extends Product {
  images: ProductImage[];
  variants: ProductVariant[];
  category: Category;
}

export interface ProductsFilter {
  categorySlug?: string;
  search?: string;
  featured?: boolean;
  bestSeller?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_seller';
  limit?: number;
  offset?: number;
}

export interface ProductsResponse {
  products: ProductWithRelations[];
  total: number;
  hasMore: boolean;
}

export function useProducts(filter: ProductsFilter = {}) {
  const [data, setData] = useState<ProductsResponse>({ products: [], total: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          images:product_images(*),
          variants:product_variants(*)
        `, { count: 'exact' })
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (filter.categorySlug) {
        query = query.eq('category.slug', filter.categorySlug);
      }

      if (filter.search) {
        query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
      }

      if (filter.featured !== undefined) {
        query = query.eq('featured', filter.featured);
      }

      if (filter.bestSeller !== undefined) {
        query = query.eq('best_seller', filter.bestSeller);
      }

      // Apply sorting
      switch (filter.sort) {
        case 'price_asc':
          query = query.order('price_cents', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price_cents', { ascending: false });
          break;
        case 'best_seller':
          query = query.order('best_seller', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const limit = filter.limit || 20;
      const offset = filter.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: products, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setData({
        products: products as ProductWithRelations[],
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filter.categorySlug, filter.search, filter.featured, filter.bestSeller, filter.sort, filter.limit, filter.offset]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { ...data, loading, error, refetch: fetchProducts };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            images:product_images(*),
            variants:product_variants(*)
          `)
          .eq('slug', slug)
          .eq('published', true)
          .single();

        if (fetchError) throw fetchError;

        setProduct(data as ProductWithRelations);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  return { product, loading, error };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;
        setCategories(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
}

export function useFeaturedProducts(limit = 4) {
  return useProducts({ featured: true, limit, sort: 'newest' });
}

export function useBestSellers(limit = 4) {
  return useProducts({ bestSeller: true, limit, sort: 'best_seller' });
}