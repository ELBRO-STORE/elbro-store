import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Tag, Users, Eye } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Select } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { useAdminCoupons } from '../../hooks/useCoupons';
import type { AdminCouponInput } from '../../services/coupons';
import { formatPrice, formatDate } from '../../lib/utils';
import type { Coupon } from '../../services/coupons';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Pourcentage (%)' },
  { value: 'fixed_amount', label: 'Montant fixe (MAD)' },
];

export function AdminCoupons() {
  const { user, isAdmin } = useAuth();
  const { addToast } = useToast();
  const {
    coupons,
    total,
    loading,
    saving,
    couponUsages,
    loadCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    loadCouponUsages,
  } = useAdminCoupons();

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showUsagesModal, setShowUsagesModal] = useState(false);
  const [selectedCouponForUsages, setSelectedCouponForUsages] = useState<Coupon | null>(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state
  const defaultValidFrom = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [formData, setFormData] = useState<AdminCouponInput>({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    usage_limit: null,
    usage_limit_per_user: 1,
    valid_from: defaultValidFrom,
    valid_until: '',
    minimum_order_cents: 0,
    applicable_categories: [],
    applicable_products: [],
    excluded_products: [],
    is_active: true,
    is_public: true,
  });

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadCoupons({ is_active: filterActive === 'active' ? true : filterActive === 'inactive' ? false : undefined });
  }, [filterActive, user, isAdmin, loadCoupons]);

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(search.toLowerCase()) ||
    coupon.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      usage_limit: null,
      usage_limit_per_user: 1,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      minimum_order_cents: 0,
      applicable_categories: [],
      applicable_products: [],
      excluded_products: [],
      is_active: true,
      is_public: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      usage_limit: coupon.usage_limit,
      usage_limit_per_user: coupon.usage_limit_per_user || 1,
      valid_from: coupon.valid_from.split('T')[0],
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      minimum_order_cents: coupon.minimum_order_cents || 0,
      applicable_categories: coupon.applicable_categories || [],
      applicable_products: coupon.applicable_products || [],
      excluded_products: coupon.excluded_products || [],
      is_active: coupon.is_active,
      is_public: coupon.is_public,
    });
    setShowModal(true);
  };

  const handleOpenUsages = (coupon: Coupon) => {
    setSelectedCouponForUsages(coupon);
    loadCouponUsages(coupon.id);
    setShowUsagesModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: AdminCouponInput = {
      ...formData,
      usage_limit: formData.usage_limit === 0 ? null : formData.usage_limit,
      usage_limit_per_user: formData.usage_limit_per_user === 0 ? null : formData.usage_limit_per_user,
      valid_until: formData.valid_until || null,
    };

    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, submitData);
      } else {
        await createCoupon(submitData);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save coupon:', error);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Êtes-vous sûr de vouloir désactiver le coupon "${coupon.code}" ?`)) return;

    try {
      await deleteCoupon(coupon.id);
      addToast({ type: 'success', title: 'Succès', message: 'Coupon désactivé' });
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de désactiver le coupon' });
    }
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      usage_limit: null,
      usage_limit_per_user: 1,
      valid_from: defaultValidFrom,
      valid_until: '',
      minimum_order_cents: 0,
      applicable_categories: [],
      applicable_products: [],
      excluded_products: [],
      is_active: true,
      is_public: true,
    });
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-elbro-950 flex items-center justify-center py-12">
        <Container>
          <div className="text-center py-16">
            <p className="text-elbro-400 text-lg">Accès réservé aux administrateurs</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elbro-950 py-12">
      <Container>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-elbro-100">Gestion des coupons</h1>
              <p className="text-elbro-400 mt-1">Créez et gérez les codes promo pour vos clients</p>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau coupon
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-elbro-400" />
                <input
                  type="text"
                  placeholder="Rechercher par code ou nom..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-elbro-950 border border-elbro-400/10 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-400/50"
                />
              </div>
              <Select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                options={[
                  { value: 'all', label: 'Tous' },
                  { value: 'active', label: 'Actifs' },
                  { value: 'inactive', label: 'Inactifs' },
                ]}
                className="w-full sm:w-48"
              />
            </div>
          </div>

          {/* Coupons Table */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-elbro-100 border-t-transparent rounded-full mx-auto" />
                <p className="text-elbro-400 mt-4">Chargement des coupons...</p>
              </div>
            ) : filteredCoupons.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="w-12 h-12 mx-auto mb-4 text-elbro-400/50" />
                <p className="text-lg text-elbro-400">Aucun coupon trouvé</p>
                <p className="text-sm text-elbro-400/50 mt-1">
                  {search ? 'Essayez de modifier votre recherche' : 'Commencez par créer votre premier coupon'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-elbro-400/10 bg-elbro-950">
                      <th className="px-6 py-4 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Réduction</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Validité</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Utilisations</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-elbro-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-elbro-400/10">
                    {filteredCoupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-elbro-950/50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="font-mono text-sm text-elbro-100 bg-elbro-950 px-2 py-1 rounded">{coupon.code}</code>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-elbro-100">{coupon.name}</p>
                          {coupon.description && (
                            <p className="text-xs text-elbro-400 line-clamp-1 mt-1">{coupon.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-elbro-100 font-medium">
                            {coupon.discount_type === 'percentage'
                              ? `${coupon.discount_value}%`
                              : formatPrice(coupon.discount_value)}
                          </span>
                          {coupon.minimum_order_cents > 0 && (
                            <p className="text-xs text-elbro-400 mt-1">Min: {formatPrice(coupon.minimum_order_cents)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-elbro-400 text-sm">
                            {formatDate(coupon.valid_from)}
                            {coupon.valid_until && ` → ${formatDate(coupon.valid_until)}`}
                          </p>
                          {!coupon.valid_until && (
                            <p className="text-xs text-green-400 mt-1">Sans expiration</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-elbro-100 font-medium">{coupon.usage_count}</span>
                            {coupon.usage_limit && (
                              <span className="text-elbro-400 text-sm">/ {coupon.usage_limit}</span>
                            )}
                            <span className="text-elbro-400 text-sm">• {coupon.usage_limit_per_user || '∞'} /user</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              coupon.is_active
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {coupon.is_active ? 'Actif' : 'Inactif'}
                            {!coupon.is_public && (
                              <span className="ml-1 px-1.5 py-0.5 bg-elbro-400/20 text-elbro-400 rounded text-[10px]">Privé</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenUsages(coupon)}
                              className="text-elbro-400 hover:text-elbro-100"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(coupon)}
                              className="text-elbro-400 hover:text-elbro-100"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(coupon)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" disabled>Précédent</Button>
              <span className="text-elbro-400">Page 1</span>
              <Button variant="outline" disabled>Suivant</Button>
            </div>
          )}
        </div>
      </Container>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingCoupon ? 'Modifier le coupon' : 'Nouveau coupon'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Code *"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="EX: WELCOME10"
              required
              disabled={!!editingCoupon}
              autoComplete="off"
            />
            <Select
              label="Type de réduction *"
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed_amount' })}
              options={DISCOUNT_TYPES}
              required
            />
          </div>

          <Input
            label="Nom *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Bienvenue chez ELBRO"
            required
            autoComplete="off"
          />

          <Input
            label="Valeur de la réduction *"
            type="number"
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: parseInt(e.target.value) || 0 })}
            placeholder={formData.discount_type === 'percentage' ? '10' : '5000'}
            required
            min={1}
            max={formData.discount_type === 'percentage' ? 100 : 999999}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Limite d'utilisations totales"
              type="number"
              value={formData.usage_limit ?? ''}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="Illimité"
              min={1}
            />
            <Input
              label="Limite par utilisateur"
              type="number"
              value={formData.usage_limit_per_user ?? ''}
              onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="1"
              min={1}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Date de début *"
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              required
            />
            <Input
              label="Date de fin"
              type="date"
              value={formData.valid_until || ''}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              placeholder="Sans expiration"
            />
          </div>

          <Input
            label="Montant minimum de commande (centimes)"
            type="number"
            value={formData.minimum_order_cents}
            onChange={(e) => setFormData({ ...formData, minimum_order_cents: parseInt(e.target.value) || 0 })}
            placeholder="0"
            min={0}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-elbro-400">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description du coupon (optionnel)"
              rows={3}
              className="w-full px-4 py-3 bg-elbro-950 border border-elbro-400/10 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-400/50 resize-none"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-elbro-400/10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-elbro-100 bg-elbro-950 border-elbro-400/20 rounded focus:ring-elbro-400"
              />
              <span className="text-sm text-elbro-100">Coupon actif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 text-elbro-100 bg-elbro-950 border-elbro-400/20 rounded focus:ring-elbro-400"
              />
              <span className="text-sm text-elbro-100">Coupon public (visible par tous)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-elbro-400/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm(); }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              {editingCoupon ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Usages Modal */}
      <Modal
        isOpen={showUsagesModal}
        onClose={() => { setShowUsagesModal(false); setSelectedCouponForUsages(null); }}
        title={`Utilisations: ${selectedCouponForUsages?.code}`}
        size="lg"
      >
        {couponUsages.length === 0 ? (
          <div className="text-center py-12 text-elbro-400">
            <Users className="w-12 h-12 mx-auto mb-4 text-elbro-400/50" />
            <p>Aucune utilisation pour ce coupon</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-elbro-400/10 bg-elbro-950">
                  <th className="px-4 py-3 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-elbro-400 uppercase tracking-wider">Commande</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-elbro-400 uppercase tracking-wider">Réduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elbro-400/10">
                {couponUsages.map((usage) => (
                  <tr key={usage.id} className="hover:bg-elbro-950/50">
                    <td className="px-4 py-3 text-sm text-elbro-400">{formatDate(usage.created_at)}</td>
                    <td className="px-4 py-3 text-sm">
                      {usage.user_id ? (
                        <span className="text-elbro-100 font-mono text-xs">{usage.user_id.slice(0, 8)}...</span>
                      ) : (
                        <span className="text-elbro-400">Invité</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {usage.order_id ? (
                        <span className="text-elbro-100 font-mono text-xs">{usage.order_id.slice(0, 8)}...</span>
                      ) : (
                        <span className="text-elbro-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-400 font-medium text-right">
                      -{formatPrice(usage.discount_applied_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}