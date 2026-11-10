import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Product, ProductVariant } from '../types/database';

export interface CartItem {
  id: string; // unique key for this cart line
  productId: string;
  variantId: string | null;
  productName: string;
  pieceName: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
  imageUrl: string | null;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART'; payload?: boolean }
  | { type: 'HYDRATE'; payload: CartItem[] };

const CART_STORAGE_KEY = 'elbro-store-cart';

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        (item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId &&
          item.size === action.payload.size &&
          item.color === action.payload.color
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        const newQuantity = Math.min(
          newItems[existingIndex].quantity + action.payload.quantity,
          action.payload.stock
        );
        newItems[existingIndex] = { ...newItems[existingIndex], quantity: newQuantity };
        return { ...state, items: newItems, isOpen: true };
      }

      return { ...state, items: [...state.items, action.payload], isOpen: true };
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) };

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter((item) => item.id !== action.payload.id) };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.min(action.payload.quantity, item.stock) }
            : item
        ),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    case 'TOGGLE_CART':
      return { ...state, isOpen: action.payload ?? !state.isOpen };

    case 'HYDRATE':
      return { ...state, items: action.payload };

    default:
      return state;
  }
}

const initialState: CartState = {
  items: [],
  isOpen: false,
};

interface CartContextValue {
  state: CartState;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: (open?: boolean) => void;
  itemCount: number;
  subtotalCents: number;
  itemTotal: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored) as CartItem[];
        dispatch({ type: 'HYDRATE', payload: items });
      }
    } catch (e) {
      console.warn('Failed to hydrate cart:', e);
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch (e) {
      console.warn('Failed to persist cart:', e);
    }
  }, [state.items]);

  const addItem = (item: Omit<CartItem, 'id'>) => {
    const id = `${item.productId}-${item.variantId || 'none'}-${item.size}-${item.color}-${Date.now()}`;
    dispatch({ type: 'ADD_ITEM', payload: { ...item, id } });
  };

  const removeItem = (id: string) => dispatch({ type: 'REMOVE_ITEM', payload: id });
  const updateQuantity = (id: string, quantity: number) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const toggleCart = (open?: boolean) => dispatch({ type: 'TOGGLE_CART', payload: open });

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = state.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const itemTotal = state.items.length;

  return (
    <CartContext.Provider
      value={{
        state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        toggleCart,
        itemCount,
        subtotalCents,
        itemTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// Helper to create cart item from product/variant
export function createCartItem(
  product: Product,
  variant: ProductVariant | null,
  pieceName: string,
  quantity: number,
  selectedSize: string,
  selectedColor: string
): Omit<CartItem, 'id'> {
  return {
    productId: product.id,
    variantId: variant?.id || null,
    productName: product.name,
    pieceName,
    size: selectedSize,
    color: selectedColor,
    quantity,
    unitPriceCents: product.sale_price_cents && product.sale_price_cents < product.price_cents
      ? product.sale_price_cents
      : product.price_cents,
    imageUrl: product.images?.[0]?.url || null,
    stock: variant?.stock || 999,
  };
}