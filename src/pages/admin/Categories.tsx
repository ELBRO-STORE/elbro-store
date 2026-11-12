
import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, FolderTree, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { createCategory, updateCategory, deleteCategory } from '../../services/products';
import type { Category } from '../../types/database';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
};

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  display_order: 0,
};

function makeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function AdminCategories() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  async function loadCategories() {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.message });
    } else {
      setCategories((data || []) as Category[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return categories;
    return categories.filter(category =>
      category.name.toLowerCase().includes(term) ||
      category.slug.toLowerCase().includes(term)
    );
  }, [categories, search]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, display_order: categories.length });
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      display_order: category.display_order,
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.slug.trim()) {
      addToast({ type: 'error', title: 'Champs obligatoires', message: 'Le nom et le slug sont obligatoires.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        display_order: Number(form.display_order) || 0,
      };

      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }

      addToast({
        type: 'success',
        title: 'Succès',
        message: editingId ? 'Catégorie modifiée.' : 'Catégorie créée.',
      });
      setModalOpen(false);
      await loadCategories();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Une erreur est survenue.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ?`)) return;

    try {
      await deleteCategory(category.id);
      addToast({ type: 'success', title: 'Succès', message: 'Catégorie supprimée.' });
      await loadCategories();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Suppression impossible',
        message: error instanceof Error
          ? error.message
          : 'Cette catégorie est peut-être utilisée par des produits.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-elbro-100">Catégories</h1>
          <p className="text-sm text-elbro-400 mt-1">
            Gérez les catégories de votre boutique.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Ajouter une catégorie
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-5">
          <p className="text-sm text-elbro-400">Total catégories</p>
          <p className="text-3xl font-bold text-elbro-100 mt-2">{categories.length}</p>
        </div>
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-5">
          <p className="text-sm text-elbro-400">Résultats affichés</p>
          <p className="text-3xl font-bold text-elbro-100 mt-2">{filteredCategories.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Rechercher une catégorie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Button variant="ghost" onClick={loadCategories} disabled={loading}>
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-elbro-400">Chargement...</div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-12 text-center">
          <FolderTree className="w-12 h-12 mx-auto text-elbro-400 mb-3" />
          <p className="text-elbro-100 font-semibold">Aucune catégorie</p>
          <p className="text-sm text-elbro-400 mt-1">Ajoutez votre première catégorie.</p>
          <Button className="mt-5" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Ajouter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCategories.map(category => (
            <div
              key={category.id}
              className="bg-elbro-900 border border-elbro-400/10 rounded-xl overflow-hidden"
            >
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="h-32 flex items-center justify-center bg-elbro-950">
                  <FolderTree className="w-10 h-10 text-elbro-400" />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-elbro-100">{category.name}</h3>
                <p className="text-xs text-elbro-400 mt-1">/{category.slug}</p>
                {category.description && (
                  <p className="text-sm text-elbro-400 mt-3 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <p className="text-xs text-elbro-400 mt-3">
                  Ordre d'affichage : {category.display_order}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => openEdit(category)}
                  >
                    <Pencil className="w-4 h-4" /> Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(category)}
                    aria-label={`Supprimer ${category.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom"
            value={form.name}
            onChange={e => setForm({
              ...form,
              name: e.target.value,
              slug: editingId ? form.slug : makeSlug(e.target.value),
            })}
            placeholder="Ex: Sneakers"
            required
          />
          <Input
            label="Slug URL"
            value={form.slug}
            onChange={e => setForm({ ...form, slug: makeSlug(e.target.value) })}
            placeholder="sneakers"
            required
          />
          <div>
            <label className="block text-sm font-medium text-elbro-100 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full p-3 bg-elbro-900 border border-elbro-400/30 rounded-lg text-elbro-100"
              placeholder="Description de la catégorie..."
            />
          </div>
          <Input
            label="URL de l'image"
            type="url"
            value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
          <Input
            label="Ordre d'affichage"
            type="number"
            min="0"
            value={String(form.display_order)}
            onChange={e => setForm({ ...form, display_order: Number(e.target.value) })}
          />
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Enregistrer' : 'Créer la catégorie'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
