import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, Upload, Trash, Camera, Check, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Select } from '../../components/ui';
import { Modal } from '../../components/ui';
import { Badge } from '../../components/ui';
import { Textarea } from '../../components/ui';
import { createProduct, updateProduct, deleteProduct, uploadProductImage, createVariant, updateVariant } from '../../services/products';
import { formatPrice } from '../../lib/utils';
import { SIZES, SHOE_SIZES } from '../../lib/constants';

export function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
    full_description: '',
    material: '',
    price_cents: 0,
    sale_price_cents: '',
    sku: '',
    featured: false,
    best_seller: false,
    published: false,
  });

  const [variants, setVariants] = useState<Array<{
    id?: string;
    size: string;
    color: string;
    stock: number;
    sku: string;
  }>>([]);

  const [images, setImages] = useState<Array<{
    id?: string;
    url: string;
    alt_text: string;
    is_main: boolean;
    display_order: number;
  }>>([]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Use a simpler approach - fetch all products
      const { data, error } = await import('../../lib/supabase').then(({ supabase }) =>
        supabase
          .from('products')
          .select(`
            *,
            category:categories(name, slug),
            images:product_images(*),
            variants:product_variants(*)
          `)
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(data?.length || 0);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await import('../../lib/supabase').then(({ supabase }) =>
        supabase.from('categories').select('*').order('display_order')
      );
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && p.published) ||
      (statusFilter === 'draft' && !p.published);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const productData = {
        ...formData,
        price_cents: parseInt(formData.price_cents.toString()),
        sale_price_cents: formData.sale_price_cents ? parseInt(formData.sale_price_cents.toString()) : undefined,
      };

      let product;
      if (isEditing && selectedProduct) {
        product = await updateProduct({ id: selectedProduct.id, ...productData });
      } else {
        product = await createProduct(productData);
      }

      // Handle variants
      for (const variant of variants) {
        if (variant.id) {
          await updateVariant(variant.id, { ...variant, product_id: product.id });
        } else {
          await createVariant(product.id, variant.size, variant.color, variant.stock, variant.sku);
        }
      }

      // Handle images (in real app, upload to storage first)
      // For now, just close modal and refresh
      setShowProductModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: any) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setFormData({
      category_id: product.category_id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      full_description: product.full_description || '',
      material: product.material || '',
      price_cents: product.price_cents,
      sale_price_cents: product.sale_price_cents || '',
      sku: product.sku,
      featured: product.featured,
      best_seller: product.best_seller,
      published: product.published,
    });
    setVariants(product.variants?.map((v: any) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      stock: v.stock,
      sku: v.sku,
    })) || []);
    setImages(product.images?.map((img: any) => ({
      id: img.id,
      url: img.url,
      alt_text: img.alt_text || '',
      is_main: img.is_main,
      display_order: img.display_order,
    })) || []);
    setShowProductModal(true);
  };

  const handleDelete = (product: any) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    } finally {
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    setFormData({
      category_id: '',
      name: '',
      slug: '',
      description: '',
      full_description: '',
      material: '',
      price_cents: 0,
      sale_price_cents: '',
      sku: '',
      featured: false,
      best_seller: false,
      published: false,
    });
    setVariants([]);
    setImages([]);
  };

  const addVariant = () => {
    setVariants([...variants, { size: '', color: '', stock: 0, sku: '' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-elbro-100">Gestion des produits</h1>
          <p className="text-elbro-400 mt-1">{totalCount} produit{totalCount > 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={() => { setIsEditing(false); resetForm(); setShowProductModal(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Ajouter un produit
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-elbro-400" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[{ value: '', label: 'Toutes catégories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
          className="w-48"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Tous les statuts' },
            { value: 'published', label: 'Publiés' },
            { value: 'draft', label: 'Brouillons' },
          ]}
          className="w-40"
        />
      </div>

      {/* Products Table */}
      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-elbro-100 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-elbro-400/10 bg-elbro-950">
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Produit</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Catégorie</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Prix</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Stock</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Statut</th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-elbro-400/10">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-elbro-950 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-elbro-950 flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-elbro-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-elbro-100">{product.name}</p>
                          <p className="text-sm text-elbro-400">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-elbro-100">{product.category?.name || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-elbro-100">{formatPrice(product.sale_price_cents && product.sale_price_cents < product.price_cents ? product.sale_price_cents : product.price_cents)}</span>
                        {product.sale_price_cents && product.sale_price_cents < product.price_cents && (
                          <span className="text-sm text-elbro-400 line-through">{formatPrice(product.price_cents)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-elbro-100">
                      {product.variants?.reduce((sum: number, v: any) => sum + v.stock, 0) || 0}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={product.published ? 'success' : 'outline'}
                        className={product.published ? '' : 'border-elbro-400/20 text-elbro-400'}
                      >
                        {product.published ? 'Publié' : 'Brouillon'}
                      </Badge>
                      {product.featured && <Badge variant="info" className="ml-1">Coup de cœur</Badge>}
                      {product.best_seller && <Badge variant="warning" className="ml-1">Best-seller</Badge>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(product)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
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
            <p>Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); resetForm(); }}
        title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          {/* Basic Info */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-elbro-100">Informations de base</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Catégorie *"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                required
              />
              <Input
                label="Nom *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du produit"
                required
              />
              <Input
                label="Slug *"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="nom-du-produit"
                required
              />
              <Input
                label="SKU"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="ELBRO-001"
              />
              <Input
                label="Prix (MAD) *"
                value={formData.price_cents}
                onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) * 100 || 0 })}
                type="number"
                step="1"
                min="0"
                required
              />
              <Input
                label="Prix promo (MAD)"
                value={typeof formData.sale_price_cents === 'number' && formData.sale_price_cents > 0 ? formData.sale_price_cents / 100 : ''}
                onChange={(e) => setFormData({ ...formData, sale_price_cents: e.target.value ? parseInt(e.target.value) * 100 : '' })}
                type="number"
                step="1"
                min="0"
              />
            </div>
            <Textarea
              label="Description courte *"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description courte pour les listings..."
              required
              rows={2}
            />
            <Textarea
              label="Description complète"
              value={formData.full_description}
              onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
              placeholder="Description détaillée pour la page produit..."
              rows={4}
            />
            <Input
              label="Matière / Composition"
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              placeholder="Ex: 100% Coton bio, Cuir véritable..."
            />
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                />
                <span className="text-sm text-elbro-100">Publié</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                />
                <span className="text-sm text-elbro-100">Coup de cœur</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.best_seller}
                  onChange={(e) => setFormData({ ...formData, best_seller: e.target.checked })}
                  className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                />
                <span className="text-sm text-elbro-100">Best-seller</span>
              </label>
            </div>
          </div>

          {/* Variants */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-elbro-100">Variantes (Tailles / Couleurs)</h3>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter une variante
              </Button>
            </div>
            {variants.length === 0 ? (
              <p className="text-elbro-400 text-sm text-center py-4">Aucune variante. Ajoutez au moins une taille/couleur.</p>
            ) : (
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-elbro-950 border border-elbro-400/10 rounded-lg">
                    <Select
                      label="Taille"
                      value={variant.size}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = { ...newVariants[index], size: e.target.value };
                        setVariants(newVariants);
                      }}
                      options={[
                        { value: '', label: 'Taille' },
                        ...SIZES.map(s => ({ value: s, label: s })),
                        ...SHOE_SIZES.map(s => ({ value: s, label: s })),
                      ]}
                      className="flex-1 min-w-[140px]"
                    />
                    <Select
                      label="Couleur"
                      value={variant.color}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = { ...newVariants[index], color: e.target.value };
                        setVariants(newVariants);
                      }}
                      options={[
                        { value: '', label: 'Couleur' },
                        { value: 'Noir', label: 'Noir' },
                        { value: 'Blanc', label: 'Blanc' },
                        { value: 'Gris', label: 'Gris' },
                        { value: 'Bleu', label: 'Bleu' },
                        { value: 'Marine', label: 'Marine' },
                        { value: 'Rouge', label: 'Rouge' },
                        { value: 'Vert', label: 'Vert' },
                        { value: 'Beige', label: 'Beige' },
                        { value: 'Marron', label: 'Marron' },
                      ]}
                      className="flex-1 min-w-[140px]"
                    />
                    <Input
                      label="Stock"
                      value={variant.stock}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = { ...newVariants[index], stock: parseInt(e.target.value) || 0 };
                        setVariants(newVariants);
                      }}
                      type="number"
                      min="0"
                      className="w-24"
                    />
                    <Input
                      label="SKU Variante"
                      value={variant.sku}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = { ...newVariants[index], sku: e.target.value.toUpperCase() };
                        setVariants(newVariants);
                      }}
                      placeholder="SKU"
                      className="flex-1 min-w-[140px]"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-elbro-100">Images du produit</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-elbro-950 border border-elbro-400/10 relative">
                    {image.url ? (
                      <img src={image.url} alt={image.alt_text || formData.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-elbro-400" />
                      </div>
                    )}
                    {image.is_main && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="success" size="sm">Principal</Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!image.is_main && (
                        <Button size="sm" variant="primary" onClick={() => {
                          const newImages = images.map((img, i) => ({
                            ...img,
                            is_main: i === index
                          }));
                          setImages(newImages);
                        }}>
                          <Check className="w-4 h-4 mr-1" />
                          Principal
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setImages(images.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    label={`Alt text ${index + 1}`}
                    value={image.alt_text}
                    onChange={(e) => {
                      const newImages = [...images];
                      newImages[index] = { ...newImages[index], alt_text: e.target.value };
                      setImages(newImages);
                    }}
                    placeholder="Texte alternatif"
                    className="mt-2"
                  />
                </div>
              ))}
              {/* Add Image Button */}
              <label className="col-span-2 md:col-span-3 lg:col-span-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="image-upload"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                      try {
                        const result = await uploadProductImage(formData.sku || 'temp', file, {
                          altText: file.name,
                          isMain: images.length === 0,
                          displayOrder: images.length,
                        });
                        setImages(prev => [...prev, {
                          url: result.url,
                          alt_text: file.name,
                          is_main: images.length === 0,
                          display_order: images.length,
                        }]);
                      } catch (err) {
                        console.error('Upload failed:', err);
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full aspect-square flex-col gap-2 border-dashed border-elbro-400/30 hover:border-elbro-100 hover:bg-elbro-950"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="w-8 h-8 text-elbro-400" />
                  <span className="text-sm text-elbro-400">Ajouter des images</span>
                  <span className="text-xs text-elbro-400/50">Cliquez ou glissez-déposez</span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-elbro-400/50">Cliquez sur une image pour la définir comme principale. La première image ajoutée devient l'image principale par défaut.</p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-elbro-400/10">
            <Button type="button" variant="outline" onClick={() => { setShowProductModal(false); resetForm(); }}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                isEditing ? 'Mettre à jour' : 'Créer le produit'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setProductToDelete(null); }}
        title="Supprimer le produit"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-elbro-400">Êtes-vous sûr de vouloir supprimer <strong className="text-elbro-100">{productToDelete?.name}</strong> ?</p>
          <p className="text-sm text-elbro-400/50">Cette action est irréversible et supprimera également toutes les variantes et images associées.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { setShowDeleteModal(false); setProductToDelete(null); }}>
              Annuler
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={submitting}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}