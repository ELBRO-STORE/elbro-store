import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  User,
  Package,
  CheckCircle,
  Download,
} from 'lucide-react';

import { Button, Select, Modal, Badge } from '../../components/ui';
import { supabase } from '../../lib/supabase';

import {
  updateOrderStatus,
  markOrderSynced,
  formatPriceMAD,
} from '../../services/orders';

import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from '../../lib/constants';

import type { OrderStatus } from '../../types/database';

type OrderStatusFilter = OrderStatus | 'all';

const PAGE_SIZE = 20;

export function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<OrderStatusFilter>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [syncingOrder, setSyncingOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('orders')
        .select(
          `
            *,
            items:order_items(
              *,
              product:products(name, sku, images),
              variant:product_variants(size, color)
            )
          `,
          { count: 'exact' }
        );

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const searchValue = search.trim();

      if (searchValue) {
        const safeSearch = searchValue.replace(/[,%()]/g, '');

        query = query.or(
          `order_ref.ilike.%${safeSearch}%,customer_name.ilike.%${safeSearch}%,customer_phone.ilike.%${safeSearch}%`
        );
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const loadedOrders = data || [];

      setOrders(loadedOrders);
      setTotalCount(count || 0);
      setTotalPages(
        Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
      );

      if (selectedOrder) {
        const updatedOrder = loadedOrders.find(
          (order: any) => order.id === selectedOrder.id
        );

        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fetchOrders();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: string
  ) => {
    setUpdatingStatus(orderId);

    try {
      await updateOrderStatus(orderId, newStatus as OrderStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleSyncSheets = async (orderId: string) => {
    setSyncingOrder(orderId);

    try {
      await markOrderSynced(orderId, `SHEETS-${Date.now()}`);
      await fetchOrders();
    } catch (error) {
      console.error('Failed to sync to Sheets:', error);
    } finally {
      setSyncingOrder(null);
    }
  };

  const statusColors: Record<string, string> = {
    NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CONFIRMED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    PREPARING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    SHIPPED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-elbro-100">
            Gestion des commandes
          </h1>

          <p className="text-elbro-400 mt-1">
            {totalCount} commande{totalCount > 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-elbro-400" />

          <input
            type="text"
            placeholder="Rechercher (référence, client, téléphone)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatusFilter)
          }
          options={[
            { value: 'all', label: 'Tous les statuts' },
            ...ORDER_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          ]}
          className="w-48"
        />
      </div>

      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-elbro-100 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-elbro-400/10 bg-elbro-950">
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Commande
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Client
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Articles
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Total
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Statut
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Date
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-elbro-400/10">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-elbro-950 transition-colors"
                  >
                    <td className="p-4">
                      <p className="font-mono font-medium text-elbro-100">
                        {order.order_ref}
                      </p>

                      {order.google_sheets_synced && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Synchronisé Sheets
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-medium text-elbro-100">
                        {order.customer_name}
                      </p>

                      <p className="text-sm text-elbro-400">
                        {order.customer_phone}
                      </p>

                      <p className="text-xs text-elbro-400">
                        {order.customer_city}
                      </p>
                    </td>

                    <td className="p-4 text-elbro-100">
                      {order.items?.length || 0} article
                      {order.items?.length > 1 ? 's' : ''}
                    </td>

                    <td className="p-4 font-semibold text-elbro-100">
                      {formatPriceMAD(order.total_cents)}
                    </td>

                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          statusColors[order.status] ||
                          'bg-elbro-900 text-elbro-400 border-elbro-400/20'
                        }
                      >
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </td>

                    <td className="p-4 text-elbro-400 text-sm">
                      {new Date(order.created_at).toLocaleString('fr-MA', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <div className="relative group">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>

                          <div className="absolute right-0 top-full mt-1 hidden group-hover:block group-focus-within:block bg-elbro-900 border border-elbro-400/10 rounded-lg shadow-lg py-1 min-w-[190px] z-20">
                            {ORDER_STATUSES.map((status) => (
                              <button
                                key={status.value}
                                onClick={() =>
                                  handleStatusChange(order.id, status.value)
                                }
                                disabled={
                                  updatingStatus === order.id ||
                                  order.status === status.value
                                }
                                className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-elbro-950 disabled:opacity-50"
                              >
                                {status.label}
                              </button>
                            ))}

                            <hr className="my-1 border-elbro-400/10" />

                            <button
                              onClick={() => handleSyncSheets(order.id)}
                              disabled={
                                order.google_sheets_synced ||
                                syncingOrder === order.id
                              }
                              className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-elbro-950 text-green-400 disabled:opacity-50"
                            >
                              <Download className="w-4 h-4" />

                              {syncingOrder === order.id
                                ? 'Synchronisation...'
                                : 'Synchroniser Google Sheets'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-elbro-400">
            <Package className="w-12 h-12 mx-auto mb-4 text-elbro-400/50" />
            <p>Aucune commande trouvée</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-elbro-400/10 flex items-center justify-between">
            <p className="text-sm text-elbro-400">
              Page {currentPage} sur {totalPages} ({totalCount} total)
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || loading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={`Commande ${selectedOrder?.order_ref || ''}`}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-semibold text-elbro-100 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" /> Client
                </h3>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-elbro-400">Nom</dt>
                    <dd className="text-elbro-100 font-medium">
                      {selectedOrder.customer_name}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-elbro-400">Téléphone</dt>
                    <dd className="text-elbro-100">
                      {selectedOrder.customer_phone}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-elbro-400">Email</dt>
                    <dd className="text-elbro-100">
                      {selectedOrder.customer_email || '—'}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-elbro-400">Ville</dt>
                    <dd className="text-elbro-100">
                      {selectedOrder.customer_city}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-semibold text-elbro-100 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" /> Adresse de livraison
                </h3>

                <address className="text-elbro-100 text-sm not-italic whitespace-pre-wrap">
                  {selectedOrder.customer_address}
                </address>

                {selectedOrder.delivery_instructions && (
                  <div className="mt-4 p-3 bg-elbro-950 rounded-lg border border-elbro-400/10">
                    <p className="text-xs text-elbro-400">
                      Instructions :
                    </p>
                    <p className="text-sm text-elbro-100">
                      {selectedOrder.delivery_instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-elbro-400/10">
                <h3 className="font-semibold text-elbro-100">
                  Articles ({selectedOrder.items?.length || 0})
                </h3>
              </div>

              <div className="divide-y divide-elbro-400/10">
                {selectedOrder.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-elbro-950 flex-shrink-0">
                        {item.product?.images?.[0]?.url ? (
                          <img
                            src={item.product.images[0].url}
                            alt={
                              item.product?.name ||
                              item.product_name ||
                              'Produit'
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-elbro-400" />
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-elbro-100">
                          {item.product?.name ||
                            item.piece_name ||
                            item.product_name}
                        </p>

                        <p className="text-sm text-elbro-400">
                          {item.size || item.variant?.size || '—'} •{' '}
                          {item.color || item.variant?.color || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-elbro-400">
                      <span>Qté: {item.quantity}</span>
                      <span>{formatPriceMAD(item.unit_price_cents)}</span>
                      <span className="font-semibold text-elbro-100">
                        {formatPriceMAD(item.subtotal_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-semibold text-elbro-100 mb-4">
                  Totaux
                </h3>

                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-elbro-400">Sous-total</dt>
                    <dd className="text-elbro-100">
                      {formatPriceMAD(selectedOrder.subtotal_cents)}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-elbro-400">Livraison</dt>
                    <dd className="text-elbro-100">
                      {selectedOrder.delivery_fee_cents === 0
                        ? 'Offerte'
                        : formatPriceMAD(selectedOrder.delivery_fee_cents)}
                    </dd>
                  </div>

                  {selectedOrder.discount_cents > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-elbro-400">Réduction</dt>
                      <dd className="text-green-400">
                        -{formatPriceMAD(selectedOrder.discount_cents)}
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-elbro-400/10 pt-2 text-lg font-bold">
                    <dt>Total</dt>
                    <dd>{formatPriceMAD(selectedOrder.total_cents)}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-4">
                <h3 className="font-semibold text-elbro-100 mb-4">
                  Notes client
                </h3>

                <p className="text-elbro-400 text-sm whitespace-pre-wrap">
                  {selectedOrder.notes || 'Aucune note'}
                </p>
              </div>
            </div>

            <div className="border-t border-elbro-400/10 pt-4 flex flex-wrap gap-3">
              {ORDER_STATUSES.map((status) => (
                <Button
                  key={status.value}
                  variant={
                    selectedOrder.status === status.value
                      ? 'primary'
                      : 'outline'
                  }
                  onClick={() =>
                    handleStatusChange(selectedOrder.id, status.value)
                  }
                  disabled={updatingStatus === selectedOrder.id}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}