import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, MessageSquare, Home, Package, Truck, Shield, RotateCw, Loader2, MapPin } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { useCart } from '../hooks/useCart';
import { formatPrice } from '../lib/utils';
import { openWhatsApp } from '../services/whatsapp';

import type { Order, OrderItem as DbOrderItem } from '../types/database';

interface OrderData extends Omit<Order, 'items'> {}

export function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  useEffect(() => {
    // Try to get order data from URL params or sessionStorage
    const orderRef = searchParams.get('ref');
    const storedOrder = sessionStorage.getItem(`elbro_order_${orderRef}`);
    const storedItems = sessionStorage.getItem(`elbro_order_items_${orderRef}`);

    if (storedOrder && storedItems) {
      setOrder(JSON.parse(storedOrder));
      setItems(JSON.parse(storedItems));
      setLoading(false);
    } else if (orderRef) {
      // In a real app, fetch from Supabase using the order reference
      // For now, show a generic success state
      setOrder({
        id: '',
        order_ref: orderRef,
        customer_name: 'Client',
        customer_phone: '',
        customer_city: '',
        customer_address: '',
        customer_email: null,
        delivery_instructions: null,
        notes: null,
        total_cents: 0,
        delivery_fee_cents: 0,
        subtotal_cents: 0,
        status: 'NEW',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setItems([]);
      setLoading(false);
    } else {
      // No order reference, redirect to home
      setLoading(false);
    }
  }, [searchParams]);

  const handleWhatsAppClick = () => {
    if (order && items.length > 0) {
      setSendingWhatsApp(true);
      try {
        openWhatsApp(order, items);
        setWhatsAppSent(true);
      } catch (error) {
        console.error('WhatsApp error:', error);
      } finally {
        setSendingWhatsApp(false);
      }
    }
  };

  const handleNewOrder = () => {
    clearCart();
    sessionStorage.clear();
    window.location.href = '/produits';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center">
        <Container>
          <div className="text-center py-16">
            <div className="animate-spin w-12 h-12 border-3 border-elbro-100 border-t-transparent rounded-full mx-auto" />
            <p className="text-elbro-400 mt-4">Chargement de votre commande...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center">
        <Container>
          <div className="text-center py-16">
            <Package className="w-24 h-24 text-elbro-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-elbro-100 mb-4">Aucune commande trouvée</h1>
            <p className="text-elbro-400 text-lg mb-8 max-w-md mx-auto">
              Nous n'avons pas trouvé les détails de votre commande. Retournez à l'accueil pour continuer vos achats.
            </p>
            <Link to="/">
              <Button size="lg">
                <Home className="w-5 h-5 mr-2" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const isFreeDelivery = order.subtotal_cents >= 50000;
  const deliveryFeeDisplay = isFreeDelivery ? 'Offerte' : formatPrice(order.delivery_fee_cents);

  return (
    <div className="min-h-screen bg-elbro-950 py-12">
      <Container>
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Success Header */}
          <div className="text-center">
            <div className="mx-auto mb-6 p-4 rounded-full bg-green-500/10 border border-green-500/20 w-20 h-20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-elbro-100 mb-2">Merci pour votre commande !</h1>
            <p className="text-elbro-400 text-lg">Votre commande a été enregistrée avec succès.</p>
          </div>

          {/* Order Reference */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-elbro-400" />
              <span className="text-sm text-elbro-400 uppercase tracking-wider">Numéro de commande</span>
            </div>
            <p className="font-mono text-2xl lg:text-3xl font-bold text-elbro-100 bg-elbro-950 px-6 py-3 rounded-lg inline-block">
              {order.order_ref}
            </p>
            <p className="text-sm text-elbro-400 mt-3">
              Un récapitulatif a été envoyé à <strong className="text-elbro-100">{order.customer_phone}</strong>
            </p>
          </div>

          {/* Order Details */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
            {/* Items */}
            {items.length > 0 && (
              <div className="p-6 border-b border-elbro-400/10">
                <h2 className="text-lg font-semibold text-elbro-100 mb-4">Articles commandés</h2>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-elbro-950">
                        {item.product?.images?.[0]?.url ? (
                          <img src={item.product.images[0].url} alt={item.product?.name || item.piece_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-elbro-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-elbro-100">{item.product?.name || item.piece_name}</p>
                        <p className="text-sm text-elbro-400">{item.piece_name}</p>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-elbro-400">
                          <span>{item.size}</span>
                          <span>•</span>
                          <span>{item.color}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-elbro-100">{formatPrice(item.unit_price_cents * item.quantity)}</p>
                        <p className="text-sm text-elbro-400">Qté: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-elbro-400">
                <span>Sous-total</span>
                <span className="text-elbro-100">{formatPrice(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between text-elbro-400">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Livraison
                </span>
                <span className={isFreeDelivery ? 'text-green-400' : 'text-elbro-100'}>
                  {deliveryFeeDisplay}
                </span>
              </div>
              {isFreeDelivery && (
                <div className="text-center text-green-400 text-sm">
                  <Truck className="w-4 h-4 inline mr-1" /> Livraison offerte dès 500 MAD
                </div>
              )}
              <div className="border-t border-elbro-400/10 pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total_cents)}</span>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="p-6 border-t border-elbro-400/10 bg-elbro-950">
              <h3 className="font-semibold text-elbro-100 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Adresse de livraison
              </h3>
              <address className="text-elbro-400 not-italic whitespace-pre-wrap">
                {order.customer_name}
                {order.customer_address}
                {order.customer_city}
                Maroc
              </address>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-elbro-100 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Prochaine étape : Confirmer sur WhatsApp
            </h2>
            <p className="text-elbro-400 mb-6">
              Votre commande est en attente de confirmation. Cliquez sur le bouton ci-dessous pour ouvrir WhatsApp
              et envoyer votre commande. Notre équipe la traitera dès réception.
            </p>

            <Button
              size="lg"
              className="w-full sm:w-auto mb-3"
              onClick={handleWhatsAppClick}
              loading={sendingWhatsApp}
              disabled={sendingWhatsApp || whatsAppSent}
            >
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ouverture de WhatsApp...
                </>
              ) : whatsAppSent ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Message ouvert dans WhatsApp
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Envoyer la commande sur WhatsApp
                </>
              )}
            </Button>

            {!whatsAppSent && (
              <p className="text-center text-sm text-elbro-400/50">
                Votre commande ne sera transmise qu'une fois le message envoyé dans WhatsApp.
                Appuyez sur « Envoyer » dans la conversation WhatsApp.
              </p>
            )}

            {whatsAppSent && (
              <div className="text-center text-green-400 text-sm mt-3">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Parfait ! Votre commande a été transmise. Nous vous contacterons bientôt pour la confirmation.
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-elbro-900 border border-elbro-400/10 text-center">
              <Truck className="w-6 h-6 text-elbro-400 mx-auto mb-2" />
              <p className="text-xs text-elbro-400">Livraison offerte dès 500 MAD</p>
            </div>
            <div className="p-4 rounded-xl bg-elbro-900 border border-elbro-400/10 text-center">
              <Shield className="w-6 h-6 text-elbro-400 mx-auto mb-2" />
              <p className="text-xs text-elbro-400">Paiement à la livraison</p>
            </div>
            <div className="p-4 rounded-xl bg-elbro-900 border border-elbro-400/10 text-center">
              <RotateCw className="w-6 h-6 text-elbro-400 mx-auto mb-2" />
              <p className="text-xs text-elbro-400">Retours 30 jours</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" size="lg" onClick={handleNewOrder} className="w-full sm:w-auto">
              <Package className="w-5 h-5 mr-2" />
              Continuer mes achats
            </Button>
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full">
                <Home className="w-5 h-5 mr-2" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}