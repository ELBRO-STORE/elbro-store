// Utility functions

export function formatPrice(cents: number, currency = 'MAD'): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatPriceRaw(cents: number): string {
  return (cents / 100).toLocaleString('fr-MA');
}

export function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned) * 100);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateOrderRef(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ELBRO-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

export function validateMoroccanPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s.\-()]/g, '');
  const match = cleaned.match(/^(?:\+212|00212|212|0)([5-7]\d{8})$/);
  return match ? `+212${match[1]}` : null;
}

export function formatPhoneForDisplay(phone: string): string {
  const validated = validateMoroccanPhone(phone);
  if (!validated) return phone;
  // Format: +212 6 XX XX XX XX
  const num = validated.slice(4);
  return `+212 ${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return '/images/placeholder-product.svg';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}