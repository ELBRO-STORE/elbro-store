
import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Upload,
  Trash,
  Camera,
  Check,
  Loader2,
} from 'lucide-react';

import { Button } from '../../components/ui';
import { Input } from '../../components/ui';
import { Select } from '../../components/ui';
import { Modal } from '../../components/ui';
import { Badge } from '../../components/ui';
import { Textarea } from '../../components/ui';

import {
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  createVariant,
  updateVariant,
} from '../../services/products';

import { formatPrice } from '../../lib/utils';
import { SIZES, SHOE_SIZES } from '../../lib/constants';

type ProductImageForm = {
  id?: string;
  url: string;
  alt_text: string;
  is_main: boolean;
  display_order: number;
  file?: File;
};

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
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
    full_description: '',
    material: '',
    price_cents: 0,
    sale_price_cents: 0,
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

  const [images, setImages] = useState<ProductImageForm[]>([]);

  // Load products
  const fetchProducts = async () => {
    setLoading(true);

    try {
      const { supabase } = await import('../../lib/supabase');

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(name, slug),
          images:product_images(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      setTotalCount(data?.length || 0);
    } catch (error: any) {
      console.error('Failed to load products:', error);
      setErrorMessage(
        error?.message || 'Impossible de charger les produits.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Load categories
  const fetchCategories = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order');

      if (error) throw error;

      setCategories(data || []);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      !search ||
      (p.name || '').toLowerCase().includes(searchText) ||
      (p.description || '').toLowerCase().includes(searchText) ||
      (p.sku || '').toLowerCase().includes(searchText);

    const matchesCategory =
      !categoryFilter || p.category_id === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && p.published) ||
      (statusFilter === 'draft' && !p.published);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Save product, variants and images
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const productData = {
        ...formData,
        price_cents: Number(formData.price_cents),
        sale_price_cents:
          formData.sale_price_cents > 0
            ? Number(formData.sale_price_cents)
            : undefined,
      };

      let product: any;

      // Create or update product first
      if (isEditing && selectedProduct) {
        product = await updateProduct({
          id: selectedProduct.id,
          ...productData,
        });
      } else {
        product = await createProduct(productData);
      }

      if (!product?.id) {
        throw new Error(
          'Le produit a été enregistré sans identifiant valide.'
        );
      }

      // Save variants
      for (const variant of variants) {
        if (variant.id) {
          await updateVariant(variant.id, {
            ...variant,
            product_id: product.id,
          });
        } else {
          await createVariant(
            product.id,
            variant.size,
            variant.color,
            variant.stock,
            variant.sku
          );
        }
      }

      // Upload new images using the real product UUID
      const pendingImages = images.filter((image) => image.file);

      for (let i = 0; i < pendingImages.length; i++) {
        const image = pendingImages[i];

        await uploadProductImage(
          product.id,
          image.file!,
          {
            altText: image.alt_text,
            isMain: image.is_main,
            displayOrder: image.display_order,
          }
        );
      }

      alert('Produit enregistré avec succès !');

      setShowProductModal(false);
      resetForm();

      await fetchProducts();
    } catch (error: any) {
      console.error('Failed to save product:', error);

      const message =
        error?.message ||
        error?.details ||
        'Une erreur inconnue est survenue.';

      setErrorMessage(message);
      alert(`Erreur lors de l'enregistrement : ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit product
  const handleEdit = (product: any) => {
    setIsEditing(true);
    setSelectedProduct(product);
    setErrorMessage('');

    setFormData({
      category_id: product.category_id || '',
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      full_description: product.full_description || '',
      material: product.material || '',
      price_cents: product.price_cents || 0,
      sale_price_cents: product.sale_price_cents || 0,
      sku: product.sku || '',
      featured: !!product.featured,
      best_seller: !!product.best_seller,
      published: !!product.published,
    });

    setVariants(
      product.variants?.map((v: any) => ({
        id: v.id,
        size: v.size || '',
        color: v.color || '',
        stock: v.stock || 0,
        sku: v.sku || '',
      })) || []
    );

    setImages(
      product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
        alt_text: img.alt_text || '',
        is_main: !!img.is_main,
        display_order: img.display_order || 0,
      })) || []
    );

    setShowProductModal(true);
  };

  // Delete product
  const handleDelete = (product: any) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete || submitting) return;

    setSubmitting(true);

    try {
      await deleteProduct(productToDelete.id);

      setShowDeleteModal(false);
      setProductToDelete(null);

      await fetchProducts();

      alert('Produit supprimé avec succès.');
    } catch (error: any) {
      console.error('Failed to delete product:', error);

      alert(
        `Erreur de suppression : ${
          error?.message || 'Erreur inconnue'
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    setErrorMessage('');

    setFormData({
      category_id: '',
      name: '',
      slug: '',
      description: '',
      full_description: '',
      material: '',
      price_cents: 0,
      sale_price_cents: 0,
      sku: '',
      featured: false,
      best_seller: false,
      published: false,
    });

    setVariants([]);
    setImages([]);
  };

  // Variants
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: '',
        color: '',
        stock: 0,
        sku: '',
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  // Price helpers
  const centsToMad = (cents: number): string => {
    return cents > 0 ? (cents / 100).toString() : '';
  };

  const madToCents = (mad: string): number => {
    return mad ? Math.round(Number(mad) * 100) : 0;
  };

  // Add selected images locally before product creation
  const handleImageSelection = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter((file) =>
      file.type.startsWith('image/')
    );

    if (validFiles.length !== files.length) {
      alert('Veuillez sélectionner uniquement des images.');
    }

    setImages((prev) => {
      const newImages = validFiles.map((file, index) => ({
        url: URL.createObjectURL(file),
        alt_text: file.name,
        is_main: prev.length === 0 && index === 0,
        display_order: prev.length + index,
        file,
      }));

      return [...prev, ...newImages];
    });

    e.target.value = '';
  };

  // Select main image
  const selectMainImage = (index: number) => {
    setImages((prev) =>
      prev.map((image, i) => ({
        ...image,
        is_main: i === index,
      }))
    );
  };

  // Remove image from form
  const removeImageFromForm = (index: number) => {
    setImages((prev) => {
      const image = prev[index];

      if (image?.file && image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }

      return prev
        .filter((_, i) => i !== index)
        .map((image, i) => ({
          ...image,
          display_order: i,
        }));
    });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-elbro-100">
            Gestion des produits
          </h1>

          <p className="text-elbro-400 mt-1">
            {totalCount} produit{totalCount > 1 ? 's' : ''} au total
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setShowProductModal(true);
          }}
        >
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
          options={[
            { value: '', label: 'Toutes catégories' },
            ...categories.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
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
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Produit
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Catégorie
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Prix
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Stock
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Statut
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-elbro-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-elbro-400/10">

                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-elbro-950 transition-colors"
                  >

                    <td className="p-4">
                      <div className="flex items-center gap-3">

                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-elbro-950 flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
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
                            {product.name}
                          </p>
                          <p className="text-sm text-elbro-400">
                            {product.sku}
                          </p>
                        </div>

                      </div>
                    </td>

                    <td className="p-4 text-elbro-100">
                      {product.category?.name || '—'}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">

                        <span className="font-semibold text-elbro-100">
                          {formatPrice(
                            product.sale_price_cents &&
                            product.sale_price_cents < product.price_cents
                              ? product.sale_price_cents
                              : product.price_cents
                          )}
                        </span>

                        {product.sale_price_cents &&
                          product.sale_price_cents < product.price_cents && (
                            <span className="text-sm text-elbro-400 line-through">
                              {formatPrice(product.price_cents)}
                            </span>
                          )}

                      </div>
                    </td>

                    <td className="p-4 text-elbro-100">
                      {product.variants?.reduce(
                        (sum: number, v: any) => sum + (v.stock || 0),
                        0
                      ) || 0}
                    </td>

                    <td className="p-4">
                      <Badge
                        variant={product.published ? 'success' : 'outline'}
                        className={
                          product.published
                            ? ''
                            : 'border-elbro-400/20 text-elbro-400'
                        }
                      >
                        {product.published ? 'Publié' : 'Brouillon'}
                      </Badge>

                      {product.featured && (
                        <Badge variant="info" className="ml-1">
                          Coup de cœur
                        </Badge>
                      )}

                      {product.best_seller && (
                        <Badge variant="warning" className="ml-1">
                          Best-seller
                        </Badge>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product)}
                        >
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
        onClose={() => {
          setShowProductModal(false);
          resetForm();
        }}
        title={isEditing ? 'Modifier le produit' : 'Nouveau produit'}
        size="xl"
      >

        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-h-[80vh] overflow-y-auto pr-2"
        >

          {/* Error message */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">

            <h3 className="font-semibold text-elbro-100">
              Informations de base
            </h3>

            <div className="grid md:grid-cols-2 gap-4">

              <Select
                label="Catégorie *"
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category_id: e.target.value,
                  })
                }
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                required
              />

              <Input
                label="Nom *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                placeholder="Nom du produit"
                required
              />

              <Input
                label="Slug *"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value,
                  })
                }
                placeholder="nom-du-produit"
                required
              />

              <Input
                label="SKU"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sku: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ELBRO-001"
              />

              <Input
                label="Prix (MAD) *"
                value={centsToMad(formData.price_cents)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_cents: madToCents(e.target.value),
                  })
                }
                type="number"
                step="1"
                min="0"
                required
              />

              <Input
                label="Prix promo (MAD)"
                value={centsToMad(formData.sale_price_cents)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sale_price_cents: madToCents(e.target.value),
                  })
                }
                type="number"
                step="1"
                min="0"
              />

            </div>

            <Textarea
              label="Description courte *"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Description courte pour les listings..."
              required
              rows={2}
            />

            <Textarea
              label="Description complète"
              value={formData.full_description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  full_description: e.target.value,
                })
              }
              placeholder="Description détaillée pour la page produit..."
              rows={4}
            />

            <Input
              label="Matière / Composition"
              value={formData.material}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  material: e.target.value,
                })
              }
              placeholder="Ex: 100% Coton bio, Cuir véritable..."
            />

            <div className="flex flex-wrap gap-4 pt-2">

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      published: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                />
                <span className="text-sm text-elbro-100">
                  Publié
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      featured: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                />
                <span className="text-sm text-elbro-100">
                  Coup de cœur
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.best_seller}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      best_seller: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                />
                <span className="text-sm text-elbro-100">
                  Best-seller
                </span>
              </label>

            </div>
          </div>

          {/* Variants */}
          <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-4">

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-elbro-100">
                Variantes (Tailles / Couleurs)
              </h3>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addVariant}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter une variante
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className="text-elbro-400 text-sm text-center py-4">
                Aucune variante. Ajoutez au moins une taille/couleur.
              </p>
            ) : (

              <div className="space-y-3">

                {variants.map((variant, index) => (
                  <div
                    key={variant.id || index}
                    className="flex flex-col sm:flex-row gap-3 p-4 bg-elbro-950 border border-elbro-400/10 rounded-lg"
                  >

                    <Select
                      label="Taille"
                      value={variant.size}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = {
                          ...newVariants[index],
                          size: e.target.value,
                        };
                        setVariants(newVariants);
                      }}
                      options={[
                        { value: '', label: 'Taille' },
                        ...SIZES.map((s) => ({
                          value: s,
                          label: s,
                        })),
                        ...SHOE_SIZES.map((s) => ({
                          value: s,
                          label: s,
                        })),
                      ]}
                      className="flex-1 min-w-[140px]"
                    />

                    <Select
                      label="Couleur"
                      value={variant.color}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = {
                          ...newVariants[index],
                          color: e.target.value,
                        };
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
                        newVariants[index] = {
                          ...newVariants[index],
                          stock: parseInt(e.target.value, 10) || 0,
                        };
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
                        newVariants[index] = {
                          ...newVariants[index],
                          sku: e.target.value.toUpperCase(),
                        };
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

            <h3 className="font-semibold text-elbro-100">
              Images du produit
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

              {images.map((image, index) => (
                <div
                  key={image.id || image.url || index}
                  className="relative group"
                >

                  <div className="aspect-square rounded-lg overflow-hidden bg-elbro-950 border border-elbro-400/10 relative">

                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.alt_text || formData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-elbro-400" />
                      </div>
                    )}

                    {image.is_main && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="success" size="sm">
                          Principal
                        </Badge>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">

                      {!image.is_main && (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => selectMainImage(index)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Principal
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeImageFromForm(index)}
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

                      newImages[index] = {
                        ...newImages[index],
                        alt_text: e.target.value,
                      };

                      setImages(newImages);
                    }}
                    placeholder="Texte alternatif"
                    className="mt-2"
                  />

                </div>
              ))}

              {/* Image selector */}
              <label className="col-span-2 md:col-span-3 lg:col-span-4">

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="image-upload"
                  onChange={handleImageSelection}
                />

                <Button
                  type="button"
                  variant="outline"
                  className="w-full aspect-square flex-col gap-2 border-dashed border-elbro-400/30 hover:border-elbro-100 hover:bg-elbro-950"
                  onClick={() =>
                    document.getElementById('image-upload')?.click()
                  }
                >
                  <Upload className="w-8 h-8 text-elbro-400" />

                  <span className="text-sm text-elbro-400">
                    Ajouter des images
                  </span>

                  <span className="text-xs text-elbro-400/50">
                    Cliquez pour sélectionner vos images
                  </span>
                </Button>

              </label>

            </div>

            <p className="text-xs text-elbro-400/50">
              La première image ajoutée devient l'image principale par défaut.
            </p>

          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-elbro-400/10">

            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => {
                setShowProductModal(false);
                resetForm();
              }}
            >
              Annuler
            </Button>

            <Button
              type="submit"
              loading={submitting}
              disabled={submitting}
            >
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
        onClose={() => {
          if (submitting) return;

          setShowDeleteModal(false);
          setProductToDelete(null);
        }}
        title="Supprimer le produit"
        size="sm"
      >

        <div className="space-y-4">

          <p className="text-elbro-400">
            Êtes-vous sûr de vouloir supprimer{' '}
            <strong className="text-elbro-100">
              {productToDelete?.name}
            </strong>
            ?
          </p>

          <p className="text-sm text-elbro-400/50">
            Cette action est irréversible et supprimera également les
            variantes et images associées selon les règles de la base de données.
          </p>

          <div className="flex justify-end gap-3 pt-4">

            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => {
                setShowDeleteModal(false);
                setProductToDelete(null);
              }}
            >
              Annuler
            </Button>

            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={submitting}
              disabled={submitting}
            >
              Supprimer
            </Button>

          </div>

        </div>

      </Modal>

    </div>
  );
}
