import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Package } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { Select } from '../components/ui';
import { useProducts, useCategories } from '../hooks/useProducts';
import { formatPrice } from '../lib/utils';
import { cn } from '../lib/utils';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'best_seller', label: 'Best-sellers' },
];

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const categorySlug = searchParams.get('category') || undefined;
  const search = searchParams.get('search') || undefined;
  const featured = searchParams.get('featured') === 'true' ? true : undefined;
  const sort = (searchParams.get('sort') as any) || 'newest';

  const { products, total, loading, error, hasMore } = useProducts({
    categorySlug,
    search,
    featured,
    bestSeller: undefined,
    sort,
    limit: 24,
    offset: 0,
  });

  const { categories } = useCategories();

  const updateFilters = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = categorySlug || search || featured;

  return (
    <div className="min-h-screen bg-elbro-950">
      {/* Page Header */}
      <header className="bg-elbro-900 border-b border-elbro-400/10 py-12 lg:py-16">
        <Container>
          <div className="max-w-3xl">
            <nav className="flex items-center gap-2 text-sm text-elbro-400 mb-4" aria-label="Fil d'Ariane">
              <Link to="/" className="hover:text-elbro-100">Accueil</Link>
              <span>/</span>
              <span className="text-elbro-100">Produits</span>
            </nav>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-elbro-100 mb-2">
              {categorySlug ? categories.find(c => c.slug === categorySlug)?.name || 'Produits' : 'Tous nos produits'}
            </h1>
            <p className="text-elbro-400 text-lg">
              {total} produit{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
            </p>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-8 lg:py-12">
        <Container>
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className={cn(
              'lg:w-64 flex-shrink-0',
              mobileFiltersOpen ? 'fixed inset-0 z-50 lg:static lg:z-auto' : 'lg:block hidden'
            )}>
              {/* Mobile Filters Trigger */}
              <button
                className="lg:hidden flex items-center gap-2 px-4 py-3 bg-elbro-900 border border-elbro-400/10 rounded-lg text-elbro-100 mb-4 w-full"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <Filter className="w-5 h-5" />
                <span>Filtres</span>
                {hasActiveFilters && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-elbro-100 text-elbro-950 rounded-full">
                    {Number(!!categorySlug) + Number(!!featured)}
                  </span>
                )}
              </button>

              {/* Filters Panel */}
              <div className={cn(
                'bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6',
                mobileFiltersOpen ? 'fixed inset-0 z-50 lg:static lg:z-auto max-h-[90vh] overflow-y-auto' : ''
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-elbro-100">Filtres</h2>
                  {mobileFiltersOpen && (
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="lg:hidden p-2 text-elbro-400 hover:text-elbro-100"
                      aria-label="Fermer les filtres"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Search */}
                <div className="mb-6">
                  <label htmlFor="search" className="block text-sm font-medium text-elbro-100 mb-2">
                    Rechercher
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="Nom, description..."
                    value={search || ''}
                    onChange={(e) => updateFilters({ search: e.target.value || null })}
                    className="w-full px-4 py-2 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100"
                  />
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label htmlFor="category" className="block text-sm font-medium text-elbro-100 mb-2">
                    Catégorie
                  </label>
                  <Select
                    id="category"
                    value={categorySlug || ''}
                    onChange={(e) => updateFilters({ category: e.target.value || null })}
                    options={[
                      { value: '', label: 'Toutes les catégories' },
                      ...categories.map(c => ({ value: c.slug, label: c.name })),
                    ]}
                    placeholder="Sélectionner une catégorie"
                  />
                </div>

                {/* Featured */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!featured}
                      onChange={(e) => updateFilters({ featured: e.target.checked ? 'true' : null })}
                      className="w-4 h-4 rounded border-elbro-400/30 bg-elbro-950 text-elbro-100 focus:ring-elbro-100"
                    />
                    <span className="text-elbro-100">Coups de cœur seulement</span>
                  </label>
                </div>

                {/* Sort */}
                <div className="mb-6">
                  <label htmlFor="sort" className="block text-sm font-medium text-elbro-100 mb-2">
                    Trier par
                  </label>
                  <Select
                    id="sort"
                    value={sort}
                    onChange={(e) => updateFilters({ sort: e.target.value })}
                    options={SORT_OPTIONS}
                  />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={clearFilters}
                  >
                    <X className="w-4 h-4" />
                    Effacer les filtres
                  </Button>
                )}
              </div>

              {/* Mobile Overlay */}
              {mobileFiltersOpen && (
                <div
                  className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-hidden="true"
                />
              )}
            </aside>

            {/* Products Grid */}
            <section className="flex-1 min-w-0" aria-label="Liste des produits">
              {/* Results Info & Sort (Mobile) */}
              <div className="lg:hidden flex items-center justify-between mb-6">
                <p className="text-sm text-elbro-400">
                  {total} produit{total > 1 ? 's' : ''}
                </p>
                <Select
                  id="sort-mobile"
                  value={sort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  options={SORT_OPTIONS}
                  className="w-40"
                />
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <ProductSkeleton key={i} />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-10 text-center">
                      <Button variant="outline" onClick={() => { /* load more */ }}>
                        Charger plus
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 text-elbro-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-elbro-100 mb-2">Aucun produit trouvé</h3>
                  <p className="text-elbro-400 mb-6">Essayez de modifier vos filtres ou votre recherche</p>
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              )}

              {error && (
                <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center">
                  Erreur lors du chargement des produits. Veuillez réessayer.
                </div>
              )}
            </section>
          </div>
        </Container>
      </main>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const mainImage = product.images?.find((img: any) => img.is_main) || product.images?.[0];
  const price = product.sale_price_cents && product.sale_price_cents < product.price_cents
    ? product.sale_price_cents
    : product.price_cents;
  const oldPrice = product.sale_price_cents && product.sale_price_cents < product.price_cents
    ? product.price_cents
    : null;

  return (
    <Link to={`/produit/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-elbro-900 border border-elbro-400/10">
        {mainImage?.url ? (
          <img
            src={mainImage.url}
            alt={mainImage.alt_text || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-elbro-400" />
          </div>
        )}
        {(product.featured || product.best_seller) && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full"
            style={{
              background: product.best_seller ? 'rgba(251,191,36,0.9)' : 'rgba(59,130,246,0.9)',
              color: product.best_seller ? '#000' : '#fff'
            }}
          >
            {product.best_seller ? 'Best-seller' : 'Coup de cœur'}
          </span>
        )}
        {oldPrice && (
          <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-red-500/90 text-white rounded-full">
            -{Math.round((1 - price / oldPrice) * 100)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="font-medium text-elbro-100 group-hover:text-elbro-400 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-semibold text-elbro-100">{formatPrice(price)}</span>
          {oldPrice && (
            <span className="text-sm text-elbro-400 line-through">{formatPrice(oldPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-elbro-900 rounded-xl border border-elbro-400/10" />
      <div className="mt-3 h-4 bg-elbro-900 rounded w-3/4" />
      <div className="mt-1 h-4 bg-elbro-900 rounded w-1/2" />
      <div className="mt-2 h-5 bg-elbro-900 rounded w-1/4" />
    </div>
  );
}