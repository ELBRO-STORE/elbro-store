import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, UserPlus, UserX, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { Button, Input, Select, Modal, Badge } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

type AdminRole = 'admin' | 'manager' | 'super_admin';

interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  admin_role: string | null;
}

export function AdminUsers() {
  const { addToast } = useToast();

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<AdminUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'manager'>('manager');

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const [usersResult, adminsResult, authResult] = await Promise.all([
        supabase.rpc('admin_list_users'),
        supabase.from('admin_users').select('*').order('created_at', { ascending: false }),
        supabase.auth.getUser(),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (adminsResult.error) throw adminsResult.error;
      if (authResult.error) throw authResult.error;

      const users = (usersResult.data || []) as UserProfile[];
      const admins = adminsResult.data || [];

      setAllUsers(users);

      const enrichedAdmins: AdminUser[] = admins.map((admin) => {
        const user = users.find((item) => item.id === admin.user_id);

        return {
          ...admin,
          role: admin.role as AdminRole,
          email: user?.email,
          full_name: user?.full_name,
          phone: user?.phone,
        };
      });

      setAdminUsers(enrichedAdmins);

      const currentUserId = authResult.data.user?.id;
      setCanManageAdmins(
        enrichedAdmins.some(
          (admin) =>
            admin.user_id === currentUserId &&
            admin.role === 'super_admin'
        )
      );
    } catch (error) {
      console.error('Failed to load users:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les utilisateurs',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredAdminUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      const term = search.toLowerCase();

      const matchesSearch =
        !term ||
        user.email?.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term) ||
        user.user_id.toLowerCase().includes(term);

      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [adminUsers, search, roleFilter]);

  const newUsersCount = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return allUsers.filter(
      (user) => new Date(user.created_at).getTime() > thirtyDaysAgo
    ).length;
  }, [allUsers]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageAdmins) {
      addToast({
        type: 'error',
        title: 'Accès refusé',
        message: 'Seul le Super Admin peut gérer les administrateurs',
      });
      return;
    }

    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;

    setSubmitting(true);

    try {
      const user = allUsers.find(
        (item) => item.email?.toLowerCase() === email
      );

      if (!user) {
        addToast({
          type: 'error',
          title: 'Utilisateur introuvable',
          message: 'Aucun compte ne correspond à cet email',
        });
        return;
      }

      if (adminUsers.some((admin) => admin.user_id === user.id)) {
        addToast({
          type: 'error',
          title: 'Déjà administrateur',
          message: 'Cet utilisateur possède déjà un rôle administrateur',
        });
        return;
      }

      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          role: newAdminRole,
        });

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Administrateur ajouté',
        message: `${email} est maintenant ${newAdminRole}`,
      });

      setShowAddModal(false);
      setNewAdminEmail('');
      await fetchUsers();
    } catch (error) {
      console.error('Failed to add admin:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible d’ajouter cet administrateur',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove || !canManageAdmins) return;

    if (adminToRemove.role === 'super_admin') {
      addToast({
        type: 'error',
        title: 'Action interdite',
        message: 'Le Super Admin ne peut pas être supprimé ici',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', adminToRemove.user_id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Administrateur retiré',
        message: `${adminToRemove.email || adminToRemove.user_id} n’est plus administrateur`,
      });

      setShowRemoveModal(false);
      setAdminToRemove(null);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to remove admin:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de retirer cet administrateur',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (
    adminUser: AdminUser,
    newRole: 'admin' | 'manager'
  ) => {
    if (!canManageAdmins || adminUser.role === 'super_admin') return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role: newRole })
        .eq('user_id', adminUser.user_id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Rôle mis à jour',
        message: `Nouveau rôle : ${newRole}`,
      });

      await fetchUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de modifier le rôle',
      });
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    manager: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    super_admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrateur',
    manager: 'Gestionnaire',
    super_admin: 'Super Admin',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-elbro-100">
            Gestion des utilisateurs
          </h1>
          <p className="text-elbro-400 mt-1">
            {allUsers.length} utilisateur{allUsers.length > 1 ? 's' : ''}
            {' - '}
            {adminUsers.length} administrateur{adminUsers.length > 1 ? 's' : ''}
          </p>
        </div>

        {canManageAdmins && (
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-5 h-5 mr-2" />
            Ajouter un administrateur
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
          <p className="text-elbro-400 text-sm">Total utilisateurs</p>
          <p className="text-3xl font-bold text-elbro-100 mt-1">{allUsers.length}</p>
        </div>

        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
          <p className="text-elbro-400 text-sm">Administrateurs</p>
          <p className="text-3xl font-bold text-purple-400 mt-1">
            {adminUsers.filter((user) => user.role === 'admin').length}
          </p>
        </div>

        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
          <p className="text-elbro-400 text-sm">Gestionnaires</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">
            {adminUsers.filter((user) => user.role === 'manager').length}
          </p>
        </div>

        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
          <p className="text-elbro-400 text-sm">Nouveaux (30 jours)</p>
          <p className="text-3xl font-bold text-green-400 mt-1">
            {newUsersCount}
          </p>
        </div>
      </div>

      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-elbro-400" />
          <input
            type="text"
            placeholder="Rechercher (email, nom, ID)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100"
          />
        </div>

        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Tous les rôles' },
            { value: 'admin', label: 'Administrateurs' },
            { value: 'manager', label: 'Gestionnaires' },
            { value: 'super_admin', label: 'Super Admins' },
          ]}
          className="w-48"
        />
      </div>

      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-elbro-400/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-elbro-100">
            Administrateurs
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchUsers()}
            disabled={loading}
          >
            {loading ? 'Chargement...' : 'Actualiser'}
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-elbro-400">
            <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
            Chargement des utilisateurs...
          </div>
        ) : filteredAdminUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-elbro-400/10 bg-elbro-950">
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Utilisateur</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Email</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Rôle</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Date d'ajout</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elbro-400/10">
                {filteredAdminUsers.map((adminUser) => (
                  <tr key={adminUser.user_id} className="hover:bg-elbro-950">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-elbro-950 border border-elbro-400/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-elbro-400" />
                        </div>
                        <div>
                          <p className="font-medium text-elbro-100">
                            {adminUser.full_name || '—'}
                          </p>
                          <p className="text-sm text-elbro-400 font-mono">
                            {adminUser.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-elbro-100">
                      {adminUser.email || '—'}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={roleColors[adminUser.role]}>
                        {roleLabels[adminUser.role]}
                      </Badge>
                    </td>
                    <td className="p-4 text-elbro-400 text-sm">
                      {formatDate(adminUser.created_at)}
                    </td>
                    <td className="p-4">
                      {canManageAdmins && adminUser.role !== 'super_admin' ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={adminUser.role}
                            onChange={(e) =>
                              handleUpdateRole(
                                adminUser,
                                e.target.value as 'admin' | 'manager'
                              )
                            }
                            options={[
                              { value: 'manager', label: 'Gestionnaire' },
                              { value: 'admin', label: 'Administrateur' },
                            ]}
                            className="w-36"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAdminToRemove(adminUser);
                              setShowRemoveModal(true);
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-elbro-400">
                          {adminUser.role === 'super_admin' ? 'Protégé' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-elbro-400">
            <Shield className="w-12 h-12 mx-auto mb-4 text-elbro-400/50" />
            <p>Aucun administrateur trouvé</p>
          </div>
        )}

        <div className="border-t border-elbro-400/10">
          <div className="p-6 border-b border-elbro-400/10 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-elbro-100">Tous les clients</h2>
            <span className="text-sm text-elbro-400">{allUsers.length} au total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-elbro-400/10 bg-elbro-950">
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Client</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Email</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Téléphone</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Ville</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Inscription</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elbro-400/10">
                {allUsers.slice(0, 50).map((user) => {
                  const admin = adminUsers.find((item) => item.user_id === user.id);

                  return (
                    <tr key={user.id} className="hover:bg-elbro-950">
                      <td className="p-4">
                        <p className="font-medium text-elbro-100">
                          {user.full_name || '—'}
                        </p>
                        <p className="text-xs text-elbro-400 font-mono">
                          {user.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="p-4 text-elbro-100">{user.email || '—'}</td>
                      <td className="p-4 text-elbro-400">{user.phone || '—'}</td>
                      <td className="p-4 text-elbro-400">{user.city || '—'}</td>
                      <td className="p-4 text-elbro-400 text-sm">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="p-4">
                        {admin ? (
                          <Badge variant="outline" className={roleColors[admin.role]}>
                            {roleLabels[admin.role]}
                          </Badge>
                        ) : canManageAdmins ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNewAdminEmail(user.email || '');
                              setShowAddModal(true);
                            }}
                            className="text-green-400 hover:text-green-300"
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Rendre admin
                          </Button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {allUsers.length > 50 && (
              <div className="p-4 text-center text-elbro-400 border-t border-elbro-400/10">
                Affichage des 50 premiers utilisateurs sur {allUsers.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setNewAdminEmail('');
        }}
        title="Ajouter un administrateur"
        size="md"
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-elbro-100">
              Email de l'utilisateur *
            </label>
            <Input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value.toLowerCase())}
              placeholder="client@example.com"
              required
            />
            <p className="text-xs text-elbro-400">
              L'utilisateur doit avoir un compte sur la boutique
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-elbro-100">
              Rôle *
            </label>
            <Select
              value={newAdminRole}
              onChange={(e) =>
                setNewAdminRole(e.target.value as 'admin' | 'manager')
              }
              options={[
                { value: 'manager', label: 'Gestionnaire - Accès produits, commandes, coupons' },
                { value: 'admin', label: 'Administrateur - Gestion complète' },
              ]}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-elbro-400/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setNewAdminEmail('');
              }}
            >
              Annuler
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ajout...
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showRemoveModal}
        onClose={() => {
          setShowRemoveModal(false);
          setAdminToRemove(null);
        }}
        title="Retirer l'administrateur"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-elbro-950 border border-elbro-400/10 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-elbro-100">
                {adminToRemove?.full_name || 'Utilisateur'}
              </p>
              <p className="text-sm text-elbro-400">{adminToRemove?.email}</p>
              <p className="text-xs text-elbro-400/50">
                Rôle actuel : {roleLabels[adminToRemove?.role || 'manager']}
              </p>
            </div>
          </div>

          <p className="text-elbro-400">
            Cette action retirera les privilèges d'administration.
            Le compte client sera conservé.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveModal(false);
                setAdminToRemove(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveAdmin}
              loading={submitting}
              disabled={submitting}
            >
              Retirer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}