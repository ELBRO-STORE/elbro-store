import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, ArrowLeft, MapPin, User, Eye, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui';
import { Badge } from '../components/ui';
import { Container } from '../components/layout/Container';
import { getOrder } from '../services/orders';
import { formatPriceMAD, ORDER_STATUS_LABELS } from '../lib/constants';
import type { OrderStatus } from '../types/database';

const STATUS_ORDER: OrderStatus[] = ['NEW', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export function OrderTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderRef, setOrderRef] = useState(searchParams.get('ref') || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadOrder = async (ref: string) => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getOrder(ref);
      setOrder(data);
    } catch (err: any) {
      if (err.code === 'PGRST116') {
        setNotFound(true);
      } else {
        setError('Erreur lors du chargement de la commande');
        console.error('Failed to load order:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = orderRef.trim().toUpperCase();
    if (ref) {
      setSearchParams({ ref });
      loadOrder(ref);
    }
  };

  // Auto-load if ref in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setOrderRef(ref);
      loadOrder(ref);
    }
  }, [searchParams]);

  const getStatusIndex = (status: OrderStatus) => STATUS_ORDER.indexOf(status);
  const currentStatusIndex = order ? getStatusIndex(order.status) : 0;

  const statusColors: Record<OrderStatus, string> = {
    NEW: 'bg-blue-500',
    CONFIRMED: 'bg-indigo-500',
    PREPARING: 'bg-yellow-500',
    SHIPPED: 'bg-orange-500',
    DELIVERED: 'bg-green-500',
    CANCELLED: 'bg-red-500',
  };

  const statusIcons: Record<OrderStatus, any> = {
    NEW: <Clock className="w-5 h-5" />,
    CONFIRMED: <CheckCircle className="w-5 h-5" />,
    PREPARING: <Package className="w-5 h-5" />,
    SHIPPED: <Truck className="w-5 h-5" />,
    DELIVERED: <CheckCircle className="w-5 h-5" />,
    CANCELLED: <XCircle className="w-5 h-5" />,
  };

  if (!orderRef && !order) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12">
        <Container>
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <Package className="w-16 h-16 mx-auto mb-4 text-elbro-400/50" />
              <h1 className="text-3xl font-bold text-elbro-100">Suivi de commande</h1>
              <p className="text-elbro-400 mt-2">Entrez votre référence de commande pour suivre votre livraison</p>
            </div>

            <form onSubmit={handleSearch} className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-elbro-400" />
                  <input
                    type="text"
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value.toUpperCase())}
                    placeholder="ELBRO-20241110-XXXXXX"
                    className="w-full pl-10 pr-4 py-3 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100 text-lg"
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg" className="whitespace-nowrap">
                  Suivre
                </Button>
              </div>
              <p className="text-xs text-elbro-400 text-center mt-4">
                La référence se trouve dans votre email de confirmation ou SMS
              </p>
            </form>

            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => window.location.href = '/produits'}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la boutique
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12">
        <Container>
          <div className="max-w-3xl w-full">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-elbro-900 rounded-lg w-1/3" />
              <div className="h-40 bg-elbro-900 rounded-2xl border border-elbro-400/10" />
              <div className="h-60 bg-elbro-900 rounded-2xl border border-elbro-400/10" />
              <div className="h-40 bg-elbro-900 rounded-2xl border border-elbro-400/10" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12">
        <Container>
          <div className="max-w-md w-full text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h1 className="text-2xl font-bold text-red-400 mb-2">Erreur</h1>
              <p className="text-elbro-400 mb-6">{error}</p>
              <Button onClick={() => setSearchParams({})} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12">
        <Container>
          <div className="max-w-md w-full text-center">
            <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-8">
              <Package className="w-12 h-12 mx-auto mb-4 text-elbro-400/50" />
              <h1 className="text-2xl font-bold text-elbro-100 mb-2">Commande introuvable</h1>
              <p className="text-elbro-400 mb-6">Aucune commande ne correspond à la référence <strong className="text-elbro-100">{orderRef}</strong></p>
              <Button onClick={() => setSearchParams({})} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Nouvelle recherche
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-elbro-950 py-12">
      <Container>
        {/* Back to search */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setSearchParams({})} className="text-elbro-400 hover:text-elbro-100">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Nouvelle recherche
          </Button>
        </div>

        {/* Order Header */}
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-2xl font-bold text-elbro-100">{order.order_ref}</span>
                <Badge variant="outline" className={statusColors[order.status as OrderStatus] + ' text-white border-transparent'}>
                  {statusIcons[order.status as OrderStatus]}
                  <span className="ml-1">{ORDER_STATUS_LABELS[order.status] || order.status}</span>
                </Badge>
              </div>
              <p className="text-elbro-400">Commandée le {new Date(order.created_at).toLocaleDateString('fr-MA', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
            </div>
            <div className="text-right sm:text-left">
              <p className="text-2xl font-bold text-elbro-100">{formatPriceMAD(order.total_cents)}</p>
              <p className="text-elbro-400 text-sm">Total payable à la livraison</p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-elbro-100 mb-6">Progression de la commande</h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-elbro-400/10" />

            <div className="space-y-6">
              {STATUS_ORDER.map((status, index) => {
                const isCompleted = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const isCancelled = order.status === 'CANCELLED' && index > currentStatusIndex;

                return (
                  <div key={status} className="relative flex gap-4">
                    <div className={`relative flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-full transition-all ${
                      isCompleted ? 'bg-green-500' :
                      isCurrent ? `ring-4 ring-offset-2 ring-offset-elbro-950 ${statusColors[status]}` :
                      isCancelled ? 'bg-elbro-400/10 text-elbro-400/50' :
                      'bg-elbro-950 border border-elbro-400/20 text-elbro-400/50'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-7 h-7 text-white" />
                      ) : (
                        statusIcons[status]
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${isCurrent ? 'text-elbro-100' : isCancelled ? 'text-elbro-400/50' : 'text-elbro-400'}`}>
                          {ORDER_STATUS_LABELS[status] || status}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-elbro-100 text-elbro-950 rounded-full">
                            Actuel
                          </span>
                        )}
                      </div>

                      {/* Status-specific details */}
                      {(status === 'SHIPPED' || status === 'DELIVERED') && order.tracking_number && (
                        <div className="ml-16 mt-2 p-3 bg-elbro-950 rounded-lg border border-elbro-400/10">
                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="w-4 h-4 text-elbro-400" />
                            <span className="text-elbro-400">Numéro de suivi :</span>
                            <span className="font-mono text-elbro-100">{order.tracking_number}</span>
                          </div>
                          {order.carrier && (
                            <div className="flex items-center gap-2 text-sm mt-1 ml-6">
                              <MapPin className="w-4 h-4 text-elbro-400" />
                              <span className="text-elbro-400">Transporteur :</span>
                              <span className="text-elbro-100">{order.carrier}</span>
                            </div>
                          )}
                          {order.shipped_at && (
                            <div className="flex items-center gap-2 text-sm mt-1 ml-6">
                              <Clock className="w-4 h-4 text-elbro-400" />
                              <span className="text-elbro-400">Expédié le :</span>
                              <span className="text-elbro-100">{new Date(order.shipped_at).toLocaleDateString('fr-MA', {
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {status === 'DELIVERED' && !order.tracking_number && (
                        <p className="ml-16 mt-2 text-sm text-green-400">Commande livrée avec succès</p>
                      )}

                      {status === 'CANCELLED' && order.status === 'CANCELLED' && (
                        <p className="ml-16 mt-2 text-sm text-red-400">Commande annulée</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Details Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Customer Info */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
            <h3 className="font-semibold text-elbro-100 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> Informations client
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-elbro-400">Nom</dt>
                <dd className="text-elbro-100 font-medium">{order.customer_name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <dt className="text-elbro-400">Téléphone</dt>
                <dd className="text-elbro-100">{order.customer_phone}</dd>
              </div>
              {order.customer_email && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <dt className="text-elbro-400">Email</dt>
                  <dd className="text-elbro-100">{order.customer_email}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Shipping Address */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
            <h3 className="font-semibold text-elbro-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Adresse de livraison
            </h3>
            <address className="text-elbro-100 text-sm not-italic whitespace-pre-wrap">
              {order.customer_address}
              <br />
              {order.customer_city}
            </address>
            {order.delivery_instructions && (
              <div className="mt-4 p-3 bg-elbro-950 rounded-lg border border-elbro-400/10">
                <p className="text-xs text-elbro-400">Instructions de livraison :</p>
                <p className="text-sm text-elbro-100">{order.delivery_instructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-elbro-400/10">
            <h3 className="font-semibold text-elbro-100">Articles ({order.items?.length || 0})</h3>
          </div>
          <div className="divide-y divide-elbro-400/10">
            {order.items?.map((item: any) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-elbro-950 flex-shrink-0">
                    {item.product?.images?.[0]?.url ? (
                      <img src={item.product.images[0].url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-elbro-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-elbro-100">{item.product?.name || item.piece_name}</p>
                    <p className="text-sm text-elbro-400">{item.size} • {item.color}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-elbro-400 sm:ml-auto">
                  <span>Qté: {item.quantity}</span>
                  <span>{formatPriceMAD(item.unit_price_cents)}</span>
                  <span className="font-semibold text-elbro-100">{formatPriceMAD(item.subtotal_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals & Notes */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Totals */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
            <h3 className="font-semibold text-elbro-100 mb-4">Récapitulatif</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-elbro-400">Sous-total</dt>
                <dd className="text-elbro-100">{formatPriceMAD(order.subtotal_cents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-elbro-400">Livraison</dt>
                <dd className="text-elbro-100">
                  {order.delivery_fee_cents === 0 ? 'Offerte' : formatPriceMAD(order.delivery_fee_cents)}
                </dd>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between text-green-400">
                  <dt className="text-elbro-400">Réduction</dt>
                  <dd>-{formatPriceMAD(order.discount_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-elbro-400/10 pt-3 text-lg font-bold">
                <dt>Total</dt>
                <dd>{formatPriceMAD(order.total_cents)}</dd>
              </div>
            </dl>
            <p className="text-xs text-elbro-400 mt-4 text-center">
              Paiement à la livraison (Cash on Delivery)
            </p>
          </div>

          {/* Notes */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
            <h3 className="font-semibold text-elbro-100 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" /> Notes
            </h3>
            {order.notes ? (
              <p className="text-elbro-400 text-sm whitespace-pre-wrap">{order.notes}</p>
            ) : (
              <p className="text-elbro-400/50 text-sm">Aucune note</p>
            )}

            {/* WhatsApp Contact */}
            <div className="mt-6 pt-4 border-t border-elbro-400/10">
              <p className="text-sm text-elbro-400 mb-3">Besoin d'aide ?</p>
              <a
                href={`https://wa.me/212783865276?text=${encodeURIComponent(`Bonjour, je souhaite des informations sur ma commande ${order.order_ref}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Contacter par WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-elbro-400/50 text-sm">
          <p>ELBRO STORE — Votre référence : <strong className="text-elbro-100">{order.order_ref}</strong></p>
        </div>
      </Container>
    </div>
  );
}

