import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Trash2, ArrowLeft, Truck, Shield, RefreshCw, ShoppingBag } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../lib/utils';

const DELIVERY_FEE_CENTS = 3500; // 35 MAD
const FREE_DELIVERY_FROM_CENTS = 50000; // 500 MAD

export function Cart() {
  const { state, removeItem, updateQuantity, subtotalCents, itemCount } = useCart();
  const [promoCode, setPromoCode] = useState('');

  const deliveryFeeCents = subtotalCents >= FREE_DELIVERY_FROM_CENTS ? 0 : DELIVERY_FEE_CENTS;
  const totalCents = subtotalCents + deliveryFeeCents;
  const isFreeDelivery = subtotalCents >= FREE_DELIVERY_FROM_CENTS;
  const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_FROM_CENTS - subtotalCents);

  if (state.items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-elbro-950">
        <Container>
          <div className="text-center py-16">
            <ShoppingBag className="w-24 h-24 text-elbro-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-elbro-100 mb-4">Votre panier est vide</h1>
            <p className="text-elbro-400 text-lg mb-8 max-w-md mx-auto">
              Il n'y a pas encore d'articles dans votre panier. Découvrez nos collections et trouvez votre style.
            </p>
            <Link to="/produits">
              <Button size="lg">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Continuer mes achats
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elbro-950">
      <header className="bg-elbro-900 border-b border-elbro-400/10 py-6">
        <Container>
          <h1 className="text-2xl lg:text-3xl font-bold text-elbro-100">
            Mon panier ({itemCount} article{itemCount > 1 ? 's' : ''})
          </h1>
        </Container>
      </header>

      <main className="py-8 lg:py-12">
        <Container>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {state.items.map((item) => (
                <CartItem key={item.id} item={item} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
              ))}

              {/* Promo Code */}
              <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="promo" className="block text-sm font-medium text-elbro-100 mb-2">
                      Code promo
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="promo"
                        type="text"
                        placeholder="Entrez votre code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="flex-1 px-4 py-3 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100"
                      />
                      <Button variant="outline" disabled={!promoCode.trim()}>
                        Appliquer
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-elbro-400">
                    <Shield className="w-4 h-4" />
                    <span>Paiement 100% sécurisé</span>
                  </div>
                </div>
              </div>

              {/* Continue Shopping */}
              <div className="text-center">
                <Link to="/produits" className="inline-flex items-center gap-2 text-elbro-400 hover:text-elbro-100 font-medium transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  Continuer mes achats
                </Link>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 space-y-6">
                <h2 className="text-lg font-semibold text-elbro-100">Résumé de la commande</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-elbro-400">
                    <span>Sous-total ({itemCount} article{itemCount > 1 ? 's' : ''})</span>
                    <span className="text-elbro-100">{formatPrice(subtotalCents)}</span>
                  </div>

                  {/* Free Delivery Progress */}
                  {!isFreeDelivery && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-elbro-400">
                        <span>Livraison</span>
                        <span className="text-elbro-100">{formatPrice(DELIVERY_FEE_CENTS)}</span>
                      </div>
                      <div className="h-2 bg-elbro-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-elbro-100 transition-all duration-500"
                          style={{ width: `${(subtotalCents / FREE_DELIVERY_FROM_CENTS) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-elbro-400 text-center">
                        Ajoutez {formatPrice(remainingForFreeDelivery)} pour la livraison gratuite
                      </p>
                    </div>
                  )}

                  {isFreeDelivery && (
                    <div className="flex justify-between text-green-400">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Livraison
                      </span>
                      <span className="font-medium">Offerte</span>
                    </div>
                  )}

                  <div className="border-t border-elbro-400/10 pt-3 flex justify-between text-lg">
                    <span className="font-semibold text-elbro-100">Total</span>
                    <span className="font-bold text-elbro-100">{formatPrice(totalCents)}</span>
                  </div>
                </div>

                <div className="border-t border-elbro-400/10 pt-4 space-y-3">
                  <Link to="/checkout">
                    <Button size="lg" className="w-full">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Passer la commande
                    </Button>
                  </Link>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-elbro-950 border border-elbro-400/10">
                      <Truck className="w-5 h-5 text-elbro-400 mx-auto mb-1" />
                      <p className="text-xs text-elbro-400">Livraison offerte dès 500 MAD</p>
                    </div>
                    <div className="p-3 rounded-lg bg-elbro-950 border border-elbro-400/10">
                      <Shield className="w-5 h-5 text-elbro-400 mx-auto mb-1" />
                      <p className="text-xs text-elbro-400">Paiement sécurisé</p>
                    </div>
                    <div className="p-3 rounded-lg bg-elbro-950 border border-elbro-400/10">
                      <RefreshCw className="w-5 h-5 text-elbro-400 mx-auto mb-1" />
                      <p className="text-xs text-elbro-400">Retours 30 jours</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

import type { CartItem } from '../hooks/useCart';

function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const imageUrl = item.imageUrl;
  const lineTotal = item.unitPriceCents * item.quantity;

  return (
    <div className="flex gap-4 bg-elbro-900 border border-elbro-400/10 rounded-xl overflow-hidden">
      <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden bg-elbro-950">
        {imageUrl ? (
          <img src={imageUrl} alt={item.productName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-elbro-400" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 p-4">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium text-elbro-100 line-clamp-1">{item.productName}</h3>
            <p className="text-sm text-elbro-400 mt-1">{item.pieceName}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-elbro-400">
              <span>{item.size}</span>
              <span>•</span>
              <span>{item.color}</span>
            </div>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-2 text-elbro-400 hover:text-red-400 transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center border border-elbro-400/20 rounded-lg overflow-hidden">
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
              className="px-3 py-2 text-elbro-400 hover:text-elbro-100 hover:bg-elbro-950 transition-colors"
              disabled={item.quantity <= 1}
              aria-label="Diminuer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 text-elbro-100 font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="px-3 py-2 text-elbro-400 hover:text-elbro-100 hover:bg-elbro-950 transition-colors"
              disabled={item.quantity >= item.stock}
              aria-label="Augmenter"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="font-semibold text-elbro-100">{formatPrice(lineTotal)}</span>
        </div>
      </div>
    </div>
  );
}