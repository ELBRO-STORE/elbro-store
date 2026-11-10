import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, DollarSign, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '../../components/ui';
import { Badge } from '../../components/ui';
import { getOrderStats, getRecentOrders, getBestSellingProducts, formatPriceMAD } from '../../services/orders';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, ordersData, sellersData] = await Promise.all([
          getOrderStats(),
          getRecentOrders(5),
          getBestSellingProducts(5),
        ]);
        setStats(statsData);
        setRecentOrders(ordersData);
        setBestSellers(sellersData);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Total commandes',
      value: stats?.total || 0,
      icon: ShoppingBag,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      link: '/admin/commandes',
    },
    {
      title: 'Nouvelles',
      value: stats?.new || 0,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      link: '/admin/commandes?status=NEW',
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatPriceMAD(stats?.revenue || 0),
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      link: '/admin/commandes',
    },
    {
      title: 'Produits',
      value: '—',
      icon: Package,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      link: '/admin/produits',
    },
  ];

  const statusColors: Record<string, string> = {
    NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    CONFIRMED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    PREPARING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    SHIPPED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6" />
          ))}
        </div>
        <div className="animate-pulse bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-elbro-100">Tableau de bord</h1>
          <p className="text-elbro-400 mt-1">Vue d'ensemble de votre boutique</p>
        </div>
        <div className="flex gap-3">
          <Link to="/admin/commandes">
            <Button variant="outline">Voir toutes les commandes</Button>
          </Link>
          <Link to="/admin/produits">
            <Button>Gérer les produits</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link} className="group">
            <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6 hover:border-elbro-400/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-elbro-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-elbro-100 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders & Best Sellers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-elbro-400/10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-elbro-100">Commandes récentes</h2>
            <Link to="/admin/commandes" className="text-sm text-elbro-400 hover:text-elbro-100">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-elbro-400/10">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/commandes/${order.id}`}
                  className="p-4 hover:bg-elbro-950 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-elbro-950 border border-elbro-400/10">
                      <ShoppingBag className="w-5 h-5 text-elbro-400" />
                    </div>
                    <div>
                      <p className="font-medium text-elbro-100">{order.order_ref}</p>
                      <p className="text-sm text-elbro-400">{order.customer_name} • {formatPriceMAD(order.total_cents)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={statusColors[order.status] || 'bg-elbro-900 text-elbro-400 border-elbro-400/20'}
                    >
                      {order.status}
                    </Badge>
                    <MoreHorizontal className="w-5 h-5 text-elbro-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-elbro-400">Aucune commande récente</div>
            )}
          </div>
        </div>

        {/* Best Sellers */}
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-elbro-400/10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-elbro-100">Meilleures ventes</h2>
            <Link to="/admin/produits" className="text-sm text-elbro-400 hover:text-elbro-100">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-elbro-400/10">
            {bestSellers.length > 0 ? (
              bestSellers.map((product, index) => (
                <div key={product.slug} className="p-4 flex items-center gap-4">
                  <span className="w-8 text-center text-2xl font-bold text-elbro-400/50">{index + 1}</span>
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-elbro-950 flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-elbro-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-elbro-100 truncate">{product.name}</p>
                    <p className="text-sm text-elbro-400">{formatPriceMAD(product.price_cents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-elbro-100">{product.totalSold}</p>
                    <p className="text-xs text-elbro-400">vendus</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-elbro-400">Aucune vente pour le moment</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-elbro-100 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/produits/nouveau" className="group">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-elbro-100">Ajouter un produit</p>
                <p className="text-sm text-elbro-400">Nouveau produit au catalogue</p>
              </div>
            </Button>
          </Link>
          <Link to="/admin/commandes?status=NEW" className="group">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-elbro-100">Commandes à traiter</p>
                <p className="text-sm text-elbro-400">{stats?.new || 0} nouvelle(s) commande(s)</p>
              </div>
            </Button>
          </Link>
          <Link to="/admin/produits" className="group">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-elbro-100">Gérer le catalogue</p>
                <p className="text-sm text-elbro-400">Produits, variantes, stocks</p>
              </div>
            </Button>
          </Link>
          <Link to="/admin/parametres" className="group">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-elbro-100">Paramètres boutique</p>
                <p className="text-sm text-elbro-400">Configuration générale</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}