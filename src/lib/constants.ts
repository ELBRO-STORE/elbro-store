// Application constants

export const ORDER_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'NEW', label: 'Nouvelle', color: 'bg-blue-500' },
  { value: 'CONFIRMED', label: 'Confirmée', color: 'bg-indigo-500' },
  { value: 'PREPARING', label: 'En préparation', color: 'bg-yellow-500' },
  { value: 'SHIPPED', label: 'Expédiée', color: 'bg-orange-500' },
  { value: 'DELIVERED', label: 'Livrée', color: 'bg-green-500' },
  { value: 'CANCELLED', label: 'Annulée', color: 'bg-red-500' },
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouvelle',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

export const DEFAULT_DELIVERY_FEE_CENTS = 3500; // 35 MAD
export const DEFAULT_FREE_DELIVERY_FROM_CENTS = 50000; // 500 MAD
export const DEFAULT_CURRENCY = 'MAD';
export const DEFAULT_STORE_NAME = 'ELBRO STORE';
export const DEFAULT_WHATSAPP_NUMBER = '212783865276';

export const MOROCCAN_CITIES = [
  'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Agadir', 'Tanger',
  'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Safi', 'Mohammedia',
  'Khouribga', 'El Jadida', 'Beni Mellal', 'Nador', 'Taza', 'Settat',
  'Larache', 'Ksar El Kebir', 'Guelmim', 'Berkane', 'Taourirt',
  'Ouarzazate', 'Errachidia', 'Khenifra', 'Midelt', 'Azrou', 'Ifrane'
].sort();

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE SIZE'];
export const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];

export const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '';

export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  LOGO: 'store-assets',
} as const;