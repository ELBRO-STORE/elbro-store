import { supabase } from '../lib/supabase';
import type { Product, ProductImage, ProductVariant, Category } from '../types/database';
import type { Database } from '../types/database';

type ProductsTable = Database['public']['Tables']['products'];
type ProductImagesTable = Database['public']['Tables']['product_images'];
type ProductVariantsTable = Database['public']['Tables']['product_variants'];
type CategoriesTable = Database['public']['Tables']['categories'];

export interface CreateProductData {
  category_id: string;
  name: string;
  slug: string;
  description: string;
  full_description?: string;
  material?: string;
  price_cents: number;
  sale_price_cents?: number;
  sku: string;
  featured?: boolean;
  best_seller?: boolean;
  published?: boolean;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string;
}

export async function createProduct(data: CreateProductData) {
  const { data: product, error } = await supabase
    .from('products')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return product as Product;
}

export async function updateProduct(data: UpdateProductData) {
  const { id, ...updateData } = data;
  const { data: product, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return product as Product;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadProductImage(
  productId: string,
  file: File,
  options: { altText?: string; isMain?: boolean; displayOrder?: number } = {}
) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${productId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  // If this is main, unset other main images
  if (options.isMain) {
    await supabase
      .from('product_images')
      .update({ is_main: false })
      .eq('product_id', productId);
  }

  const { data: image, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      url: publicUrl,
      alt_text: options.altText || null,
      is_main: options.isMain || false,
      display_order: options.displayOrder || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return image as ProductImage;
}

export async function deleteProductImage(imageId: string) {
  // Get image to delete from storage
  const { data: image } = await supabase
    .from('product_images')
    .select('url')
    .eq('id', imageId)
    .single();

  if (image?.url) {
    const url = new URL(image.url);
    const path = url.pathname.split('/product-images/')[1];
    if (path) {
      await supabase.storage.from('product-images').remove([path]);
    }
  }

  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
}

export async function setMainProductImage(imageId: string) {
  const { data: image } = await supabase
    .from('product_images')
    .select('product_id')
    .eq('id', imageId)
    .single();

  if (!image) throw new Error('Image not found');

  // Unset all other main images for this product
  await supabase
    .from('product_images')
    .update({ is_main: false })
    .eq('product_id', image.product_id);

  // Set this as main
  const { error } = await supabase
    .from('product_images')
    .update({ is_main: true })
    .eq('id', imageId);

  if (error) throw error;
}

export async function createVariant(
  productId: string,
  size: string,
  color: string,
  stock: number,
  sku: string
) {
  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({ product_id: productId, size, color, stock, sku })
    .select()
    .single();

  if (error) throw error;
  return variant as ProductVariant;
}

export async function updateVariant(id: string, data: Partial<ProductVariant>) {
  const { data: variant, error } = await supabase
    .from('product_variants')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return variant as ProductVariant;
}

export async function deleteVariant(id: string) {
  const { error } = await supabase.from('product_variants').delete().eq('id', id);
  if (error) throw error;
}

export async function createCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) {
  const { data: category, error } = await supabase
    .from('categories')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return category as Category;
}

export async function updateCategory(id: string, data: Partial<Category>) {
  const { data: category, error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return category as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}