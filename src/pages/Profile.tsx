import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Mail, Phone, LogOut, Edit2, Save, X, Settings, History } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { getOrders, formatPriceMAD } from '../services/orders';
import { useToast } from '../components/ui/Toast';
import type { OrderStatus } from '../types/database';

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Nouvelle',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CONFIRMED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  PREPARING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  SHIPPED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function Profile() {
  const { user, signOut } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses'>('orders');
  const [orders, setOrders] = useState<Array<{ id: string; order_ref: string; status: OrderStatus; total_cents: number; items: any[]; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    city: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);

  // Load user profile and orders
  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    loadProfile();
    loadOrders();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          city: data.city || '',
          address: data.address || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const { orders: userOrders } = await getOrders({ limit: 50 });
      setOrders(userOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_id: user.id,
          ...profileData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      addToast({ type: 'success', title: 'Profil mis à jour', message: 'Vos informations ont été enregistrées' });
      setEditing(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de sauvegarder le profil' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    addToast({ type: 'success', title: 'Déconnexion', message: 'À bientôt !' });
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12">
        <Container>
          <div className="text-center py-16">
            <div className="animate-spin w-12 h-12 border-3 border-elbro-100 border-t-transparent rounded-full mx-auto" />
            <p className="text-elbro-400 mt-4">Chargement de votre profil...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-elbro-950 py-12">
      <Container>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-elbro-100">Mon compte</h1>
              <p className="text-elbro-400 mt-1">Gérez votre profil et vos commandes</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>

          {/* Tabs */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
            <nav className="flex border-b border-elbro-400/10" aria-label="Profile tabs">
              {[
                { id: 'orders', label: 'Mes commandes', icon: History },
                { id: 'profile', label: 'Profil', icon: User },
                { id: 'addresses', label: 'Adresses', icon: MapPin },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-elbro-100 text-elbro-100 bg-elbro-950'
                      : 'border-transparent text-elbro-400 hover:text-elbro-100 hover:bg-elbro-950'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="p-6">
              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-elbro-100">Historique des commandes</h2>
                  {loadingOrders ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-elbro-100 border-t-transparent rounded-full mx-auto" />
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <Link
                          key={order.id}
                          to={`/admin/commandes/${order.id}`}
                          className="block p-4 bg-elbro-950 border border-elbro-400/10 rounded-xl hover:border-elbro-400/30 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-lg bg-elbro-900 border border-elbro-400/10">
                                <Package className="w-5 h-5 text-elbro-400" />
                              </div>
                              <div>
                                <p className="font-medium text-elbro-100">{order.order_ref}</p>
                                <p className="text-sm text-elbro-400">
                                  {order.items?.length || 0} article{order.items?.length > 1 ? 's' : ''} • {formatPriceMAD(order.total_cents)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <Badge
                                variant="outline"
                                className={STATUS_COLORS[order.status] || 'bg-elbro-900 text-elbro-400 border-elbro-400/20'}
                              >
                                {STATUS_LABELS[order.status] || order.status}
                              </Badge>
                              <span className="text-elbro-400">
                                {new Date(order.created_at).toLocaleDateString('fr-MA', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-elbro-400">
                      <Package className="w-12 h-12 mx-auto mb-4 text-elbro-400/50" />
                      <p className="text-lg">Aucune commande</p>
                      <p className="text-sm mt-1">Vos commandes apparaîtront ici</p>
                      <Link to="/produits" className="mt-4 inline-block">
                        <Button>
                          <Package className="w-4 h-4 mr-2" />
                          Découvrir nos produits
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6 max-w-2xl">
                  <h2 className="text-lg font-semibold text-elbro-100">Informations personnelles</h2>

                  <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">
                    {!editing ? (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full bg-elbro-950 border border-elbro-400/10 flex items-center justify-center">
                            <User className="w-10 h-10 text-elbro-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-elbro-100">{profileData.full_name || user.email?.split('@')[0] || 'Utilisateur'}</p>
                            <p className="text-elbro-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-elbro-400/10">
                          <div>
                            <p className="text-xs text-elbro-400/50 uppercase tracking-wider mb-1">Nom complet</p>
                            <p className="text-elbro-100">{profileData.full_name || 'Non renseigné'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-elbro-400/50 uppercase tracking-wider mb-1">Email</p>
                            <p className="text-elbro-100">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-elbro-400/50 uppercase tracking-wider mb-1">Téléphone</p>
                            <p className="text-elbro-100">{profileData.phone || 'Non renseigné'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-elbro-400/50 uppercase tracking-wider mb-1">Membre depuis</p>
                            <p className="text-elbro-100">{new Date(user.created_at).toLocaleDateString('fr-MA')}</p>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => setEditing(true)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Modifier le profil
                        </Button>
                      </>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Input
                            label="Nom complet *"
                            value={profileData.full_name}
                            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                            placeholder="Votre nom complet"
                            required
                            autoComplete="name"
                            icon={<User className="w-5 h-5" />}
                          />
                          <Input
                            label="Email"
                            value={user.email || ''}
                            readOnly
                            icon={<Mail className="w-5 h-5" />}
                          />
                          <Input
                            label="Téléphone"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            placeholder="06 12 34 56 78"
                            type="tel"
                            autoComplete="tel"
                            icon={<Phone className="w-5 h-5" />}
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <Input
                            label="Ville"
                            value={profileData.city}
                            onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                            placeholder="Casablanca"
                            autoComplete="address-level2"
                            icon={<MapPin className="w-5 h-5" />}
                          />
                        </div>
                        <Input
                          label="Adresse"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          placeholder="Numéro, rue, quartier, code postal..."
                          autoComplete="street-address"
                          icon={<MapPin className="w-5 h-5" />}
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t border-elbro-400/10">
                          <Button type="button" variant="outline" onClick={() => { setEditing(false); loadProfile(); }}>
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                          <Button type="submit" loading={saving} disabled={saving}>
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Security Section */}
                  <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">
                    <h3 className="font-semibold text-elbro-100 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Sécurité
                    </h3>
                    <p className="text-elbro-400 text-sm">
                      Gérez votre mot de passe et vos préférences de sécurité depuis votre compte Supabase.
                    </p>
                    <p className="text-xs text-elbro-400/50">
                      Pour changer votre mot de passe, utilisez la fonction "Mot de passe oublié" sur la page de connexion.
                    </p>
                  </div>
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div className="space-y-6 max-w-2xl">
                  <h2 className="text-lg font-semibold text-elbro-100 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Adresses de livraison
                  </h2>

                  <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">
                    <div className="space-y-3">
                      {profileData.address ? (
                        <div className="p-4 border border-elbro-400/10 rounded-lg bg-elbro-950">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-green-500/10 text-green-400 mt-0.5">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium text-elbro-100">Adresse principale</p>
                                <address className="text-elbro-400 not-italic whitespace-pre-wrap mt-1">
                                  {profileData.full_name || user.email?.split('@')[0]}
                                  {profileData.address}
                                  {profileData.city && `${profileData.city}`}
                                  {profileData.phone && `Tél: ${profileData.phone}`}
                                  Maroc
                                </address>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                              <Edit2 className="w-4 h-4 mr-1" />
                              Modifier
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 border-2 border-dashed border-elbro-400/20 rounded-lg text-center">
                          <MapPin className="w-12 h-12 mx-auto mb-3 text-elbro-400/50" />
                          <p className="text-elbro-400 mb-4">Aucune adresse enregistrée</p>
                          <Button variant="outline" onClick={() => setEditing(true)}>
                            <MapPin className="w-4 h-4 mr-2" />
                            Ajouter une adresse
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-elbro-400/50 text-center">
                      Cette adresse sera pré-remplie lors de vos prochaines commandes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}