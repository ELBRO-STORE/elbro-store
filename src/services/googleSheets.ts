import type { Order, OrderItem } from '../types/database';

const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

export interface SheetsResponse {
  ok: boolean;
  orderId?: string;
  duplicate?: boolean;
  message?: string;
  configured?: boolean;
}

export interface SheetsOrderData {
  requestId: string;
  website: string;
  currency: string;
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    email: string;
  };
  notes: string;
  instructions: string;
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  lines: Array<{
    productId: string;
    productName: string;
    piece: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

function formatOrderForSheets(order: Order, items: OrderItem[]): SheetsOrderData {
  return {
    requestId: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`,
    website: '',
    currency: 'MAD',
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
      city: order.customer_city,
      address: order.customer_address,
      email: order.customer_email || '',
    },
    notes: order.notes || '',
    instructions: order.delivery_instructions || '',
    subtotal: order.subtotal_cents / 100,
    deliveryFee: order.delivery_fee_cents === 0 ? null : order.delivery_fee_cents / 100,
    total: order.total_cents / 100,
    lines: items.map((item) => ({
      productId: item.product?.sku || item.product_id,
      productName: order.order_ref, // Order ref as product name for grouping
      piece: item.piece_name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.unit_price_cents / 100,
      subtotal: item.subtotal_cents / 100,
    })),
  };
}

export async function archiveOrderToSheets(order: Order, items: OrderItem[]): Promise<SheetsResponse> {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    return { ok: false, message: 'Google Apps Script URL not configured', configured: false };
  }

  const payload = formatOrderForSheets(order, items);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const result = await response.json();

    if (result.ok) {
      return {
        ok: true,
        orderId: result.orderId,
        duplicate: result.duplicate,
      };
    }

    return {
      ok: false,
      message: result.message || 'Commande refusée par le serveur',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, message: 'Délai d\'attente dépassé' };
    }
    console.error('Google Sheets sync error:', error);
    return { ok: false, message: 'Erreur de connexion au serveur' };
  }
}

export async function checkSheetsConnection(): Promise<SheetsResponse> {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    return { ok: false, configured: false };
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
    const result = await response.json();
    return { ok: result.ok, configured: result.configured };
  } catch {
    return { ok: false, configured: false };
  }
}