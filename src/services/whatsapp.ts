import type { Order, OrderItem } from '../types/database';
import { formatPriceMAD } from './orders';

export interface WhatsAppMessageData {
  orderRef: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  customerEmail?: string;
  deliveryInstructions?: string;
  notes?: string;
  items: Array<{
    productName: string;
    pieceName: string;
    size: string;
    color: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
  }>;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
}

export function generateWhatsAppMessage(data: WhatsAppMessageData): string {
  const lines = [
    `🛍️ NOUVELLE COMMANDE — ${data.storeName}`,
    '',
    `N° COMMANDE : ${data.orderRef}`,
    '',
    'CLIENT :',
    `Nom : ${data.customerName}`,
    `Téléphone : ${data.customerPhone}`,
    `Ville : ${data.customerCity}`,
    `Adresse : ${data.customerAddress}`,
  ];

  if (data.customerEmail) {
    lines.push(`Email : ${data.customerEmail}`);
  }

  lines.push('', 'DÉTAILS DE LA COMMANDE :');

  data.items.forEach((item, i) => {
    lines.push(
      '',
      `Article ${i + 1} :`,
      `Produit : ${item.productName}`,
      `Pièce : ${item.pieceName}`,
      `Taille : ${item.size}`,
      `Couleur : ${item.color}`,
      `Quantité : ${item.quantity}`,
      `Prix unitaire : ${formatPriceMAD(item.unitPriceCents)}`,
      `Sous-total : ${formatPriceMAD(item.subtotalCents)}`
    );
  });

  lines.push(
    '',
    `Sous-total commande : ${formatPriceMAD(data.subtotalCents)}`,
    `Livraison : ${data.deliveryFeeCents === 0 ? 'Offerte' : formatPriceMAD(data.deliveryFeeCents)}`,
    `TOTAL : ${formatPriceMAD(data.totalCents)}`
  );

  if (data.deliveryInstructions) {
    lines.push('', `Instructions de livraison : ${data.deliveryInstructions}`);
  }

  if (data.notes) {
    lines.push('', `Notes client : ${data.notes}`);
  }

  lines.push('', `Merci d'avoir choisi ${data.storeName}.`);

  return lines.join('\n');
}

export function generateWhatsAppUrl(
  message: string,
  whatsappNumber: string = '212783865276'
): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(
  order: Order,
  items: OrderItem[],
  storeName: string = 'ELBRO STORE',
  whatsappNumber: string = '212783865276'
): void {
  const message = generateWhatsAppMessage({
    orderRef: order.order_ref,
    storeName,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerCity: order.customer_city,
    customerAddress: order.customer_address,
    customerEmail: order.customer_email || undefined,
    deliveryInstructions: order.delivery_instructions || undefined,
    notes: order.notes || undefined,
    items: items.map((item) => ({
      productName: item.product?.name || item.piece_name,
      pieceName: item.piece_name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      subtotalCents: item.subtotal_cents,
    })),
    subtotalCents: order.subtotal_cents,
    deliveryFeeCents: order.delivery_fee_cents,
    totalCents: order.total_cents,
  });

  const url = generateWhatsAppUrl(message, whatsappNumber);
  window.open(url, '_blank', 'noopener,noreferrer');
}