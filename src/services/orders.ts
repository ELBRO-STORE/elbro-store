import { supabase } from '../lib/supabase';
import type { Order, OrderItem, CartItem } from '../types/database';

export interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  customer_address: string;
  customer_email?: string;
  delivery_instructions?: string;
  notes?: string;
  items: CartItem[];
  delivery_fee_cents: number;
  user_id?: string;
  discount_cents?: number;
  coupon_id?: string;
}

export interface OrderResponse {
  order: Order;
  orderItems: OrderItem[];
  whatsappUrl: string;
}

export async function createOrder(data: CreateOrderData): Promise<OrderResponse> {
  // Create order
  const { data: order, error: orderError } = await supabase
    .rpc('create_order', {
      p_customer_name: data.customer_name,
      p_customer_phone: data.customer_phone,
      p_customer_city: data.customer_city,
      p_customer_address: data.customer_address,
      p_customer_email: data.customer_email ?? '',
      p_delivery_instructions: data.delivery_instructions ?? '',
      p_notes: data.notes ?? '',
      p_items: data.items.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId,
        piece_name: item.pieceName,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
      })),
      p_delivery_fee_cents: data.delivery_fee_cents,
      p_user_id: data.user_id ?? null,
      p_discount_cents: data.discount_cents ?? 0,
      p_coupon_id: data.coupon_id ?? null,
    });

  if (orderError) throw orderError;

  // Fetch the created order with items
  const { data: orderWithItems, error: fetchError } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*, product:products(*), variant:product_variants(*))
    `)
    .eq('id', order)
    .single();

  if (fetchError) throw fetchError;

  // Create order items for response
  const orderItemsData = data.items.map((item) => ({
    order_id: order,
    product_id: item.productId,
    variant_id: item.variantId,
    piece_name: item.pieceName,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unit_price_cents: item.unitPriceCents,
    subtotal_cents: item.unitPriceCents * item.quantity,
  }));

  // Generate WhatsApp URL
  const whatsappUrl = generateWhatsAppUrl(orderWithItems as Order, orderItemsData as OrderItem[]);

  return {
    order: orderWithItems as Order,
    orderItems: orderItemsData as OrderItem[],
    whatsappUrl,
  };
}

export async function getOrder(orderRef: string) {
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*, product:products(*), variant:product_variants(*))
    `)
    .eq('order_ref', orderRef)
    .single();

  if (error) throw error;
  return order as Order & { items: OrderItem[] };
}

export async function getOrders(filters?: {
  status?: Order['status'];
  limit?: number;
  offset?: number;
  search?: string;
}) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*, product:products(*), variant:product_variants(*))
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(`order_ref.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    orders: data as (Order & { items: OrderItem[] })[],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

export async function updateOrderStatus(orderId: string, status: Order['status']) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data as Order;
}

export async function markOrderSynced(orderId: string, sheetsOrderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({
      google_sheets_synced: true,
      google_sheets_order_id: sheetsOrderId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) throw error;
}

function generateWhatsAppUrl(order: Order, items: OrderItem[]): string {
  const whatsappNumber = '212783865276'; // From store settings
  const storeName = 'ELBRO STORE';

  const lines = [
    `🛍️ NOUVELLE COMMANDE — ${storeName}`,
    '',
    `N° COMMANDE : ${order.order_ref}`,
    '',
    'CLIENT :',
    `Nom : ${order.customer_name}`,
    `Téléphone : ${order.customer_phone}`,
    `Ville : ${order.customer_city}`,
    `Adresse : ${order.customer_address}`,
  ];

  if (order.customer_email) {
    lines.push(`Email : ${order.customer_email}`);
  }

  lines.push('', 'DÉTAILS DE LA COMMANDE :');

  items.forEach((item, i) => {
    lines.push(
      '',
      `Article ${i + 1} :`,
      `Produit : ${item.product?.name || item.piece_name}`,
      `Pièce : ${item.piece_name}`,
      `Taille : ${item.size}`,
      `Couleur : ${item.color}`,
      `Quantité : ${item.quantity}`,
      `Prix unitaire : ${formatPriceMAD(item.unit_price_cents)}`,
      `Sous-total : ${formatPriceMAD(item.subtotal_cents)}`
    );
  });

  lines.push(
    '',
    `Sous-total commande : ${formatPriceMAD(order.subtotal_cents)}`,
    `Livraison : ${order.delivery_fee_cents === 0 ? 'Offerte' : formatPriceMAD(order.delivery_fee_cents)}`,
    `TOTAL : ${formatPriceMAD(order.total_cents)}`
  );

  if (order.delivery_instructions) {
    lines.push('', `Instructions de livraison : ${order.delivery_instructions}`);
  }

  if (order.notes) {
    lines.push('', `Notes client : ${order.notes}`);
  }

  lines.push('', `Merci d'avoir choisi ${storeName}.`);

  const message = lines.join('\n');
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function formatPriceMAD(cents: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function getOrderStats() {
  const { data, error } = await supabase
    .from('orders')
    .select('status, total_cents');

  if (error) throw error;

  const stats = {
    total: data.length,
    new: data.filter(o => o.status === 'NEW').length,
    confirmed: data.filter(o => o.status === 'CONFIRMED').length,
    preparing: data.filter(o => o.status === 'PREPARING').length,
    shipped: data.filter(o => o.status === 'SHIPPED').length,
    delivered: data.filter(o => o.status === 'DELIVERED').length,
    cancelled: data.filter(o => o.status === 'CANCELLED').length,
    revenue: data
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.total_cents, 0),
  };

  return stats;
}

export async function getRecentOrders(limit = 10) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*, product:products(*), variant:product_variants(*))
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as (Order & { items: OrderItem[] })[];
}

export async function getBestSellingProducts(limit = 10) {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      quantity,
      product:products(name, slug, price_cents, images:product_images(url))
    `)
    .neq('orders.status', 'CANCELLED');

  if (error) throw error;

  // Aggregate by product
  const productMap = new Map<string, { name: string; slug: string; price_cents: number; image: string | null; totalSold: number }>();

  data?.forEach((item: any) => {
    const key = item.product_id;
    const existing = productMap.get(key) || {
      name: item.product?.name || 'Produit',
      slug: item.product?.slug || '',
      price_cents: item.product?.price_cents || 0,
      image: item.product?.images?.[0]?.url || null,
      totalSold: 0,
    };
    existing.totalSold += item.quantity;
    productMap.set(key, existing);
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, limit);
}