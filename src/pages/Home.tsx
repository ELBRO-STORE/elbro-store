
import { useMemo } from 'react';
import { Hero3D } from '../components/hero/Hero3D';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import {
  useFeaturedProducts,
  useBestSellers,
  useCategories,
  useProducts,
} from '../hooks/useProducts';
import { formatPrice } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  Truck,
  Shield,
  RefreshCw,
  Headphones,
} from 'lucide-react';
import type { ProductPiece } from '../components/hero/Hero3D';

const HERO_PRODUCTS = [
  { key: 'outfit', slug: 'elbro-premium-outfit' },
  { key: 'cap', slug: 'hoodie-premium' },
  { key: 'hoodie', slug: 'JACKET' },
  { key: 'shoes', slug: 'Chaussures' },
  { key: 'pants', slug: 'ACCESSOIR' },
] as const;

export function Home() {
  const navigate = useNavigate();

  const { products: allProducts } = useProducts({ limit: 100 });
  const { products: featuredProducts, loading: featuredLoading } =
    useFeaturedProducts(4);
  const { products: bestSellers, loading: bestSellersLoading } =
    useBestSellers(4);
  const { categories, loading: categoriesLoading } = useCategories();

  const heroPieces = useMemo<ProductPiece[]>(() => {
    return HERO_PRODUCTS.flatMap(({ key, slug }) => {
      const product = allProducts.find(
        (item) => item.slug.toLowerCase() === slug.toLowerCase()
      );

      if (!product) return [];

      const mainImage =
        product.images?.find((image) => image.is_main) ||
        product.images?.[0];

      const price =
        product.sale_price_cents &&
        product.sale_price_cents < product.price_cents
          ? product.sale_price_cents
          : product.price_cents;

      const inStock =
        product.variants?.some(
          (variant) => Number(variant.stock_quantity ?? 0) > 0
        ) ?? false;

      return [
        {
          key,
          name: product.name,
          price,
          image: mainImage?.url || '',
          alt: mainImage?.alt_text || product.name,
          inStock,
        },
      ];
    });
  }, [allProducts]);

  const handleBuyClick = (pieceKey: ProductPiece['key']) => {
    const heroProduct = HERO_PRODUCTS.find(
      (item) => item.key === pieceKey
    );

    if (!heroProduct) return;

    const product = allProducts.find(
      (item) =>
        item.slug.toLowerCase() === heroProduct.slug.toLowerCase()
    );

    if (!product) return;

    navigate(`/produits/${product.slug}`);
  };

  const benefits = [
    {
      icon: Truck,
      title: 'Livraison gratuite',
      desc: "Dès 500 MAD d'achat partout au Maroc",
    },
    {
      icon: RefreshCw,
      title: 'Retours 30 jours',
      desc: 'Satisfait ou remboursé, sans tracas',
    },
    {
      icon: Shield,
      title: 'Paiement sécurisé',
      desc: 'Transactions 100% sécurisées',
    },
    {
      icon: Headphones,
      title: 'Support 7j/7',
      desc: 'Équipe dédiée à votre écoute',
    },
  ];

  return (
    <main>
      {/* 3D Hero */}
      <Hero3D
        pieces={heroPieces}
        onBuyClick={handleBuyClick}
      />

      {/* Benefits */}
      <section className="py-12 lg:py-16 bg-elbro-900 border-y border-elbro-400/10">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-xl bg-elbro-950 border border-elbro-400/10 w-12 h-12 flex items-center justify-center">
                  <benefit.icon
                    className="w-6 h-6 text-elbro-100"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="font-semibold text-elbro-100 mb-1">
                  {benefit.title}
                </h3>
                <p className="text-sm text-elbro-400">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Products */}
      <section className="py-12 lg:py-16">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-elbro-100">
                Nos coups de cœur
              </h2>
              <p className="text-elbro-400 mt-1">
                Sélection premium choisie pour vous
              </p>
            </div>

            <Link
              to="/produits?featured=true"
              className="hidden md:inline-flex items-center gap-2 text-elbro-400 hover:text-elbro-100 font-medium transition-colors"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {(featuredLoading || bestSellersLoading || categoriesLoading) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="aspect-[3/4] bg-elbro-900 rounded-xl border border-elbro-400/10" />
                  <div className="mt-3 h-4 bg-elbro-900 rounded w-3/4" />
                  <div className="mt-1 h-4 bg-elbro-900 rounded w-1/2" />
                  <div className="mt-2 h-5 bg-elbro-900 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-elbro-400">
                Aucun produit mis en avant pour le moment
              </p>
            </div>
          )}

          <div className="mt-8 md:hidden text-center">
            <Link
              to="/produits?featured=true"
              className="inline-flex items-center gap-2 text-elbro-400 hover:text-elbro-100 font-medium transition-colors"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="py-12 lg:py-16 bg-elbro-900 border-y border-elbro-400/10">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-elbro-100 text-center mb-10">
            Shop by Category
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/produits?category=${category.slug}`}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-elbro-400/10 hover:border-elbro-400/30 transition-colors"
              >
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-elbro-950 to-elbro-900">
                    <Package className="w-12 h-12 text-elbro-400 group-hover:text-elbro-100 transition-colors" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-lg font-semibold text-elbro-100">
                    {category.name}
                  </h3>
                  <p className="text-sm text-elbro-400 mt-1">
                    {category.description || 'Voir la collection'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Best Sellers */}
      <section className="py-12 lg:py-16">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-elbro-100">
                Best-sellers
              </h2>
              <p className="text-elbro-400 mt-1">
                Les pièces les plus populaires
              </p>
            </div>

            <Link
              to="/produits?sort=best_seller"
              className="hidden md:inline-flex items-center gap-2 text-elbro-400 hover:text-elbro-100 font-medium transition-colors"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {bestSellers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  badge="Best-seller"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-elbro-400">
                Aucun best-seller pour le moment
              </p>
            </div>
          )}

          <div className="mt-8 md:hidden text-center">
            <Link
              to="/produits?sort=best_seller"
              className="inline-flex items-center gap-2 text-elbro-400 hover:text-elbro-100 font-medium transition-colors"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 lg:py-24 bg-elbro-900 border-y border-elbro-400/10">
        <Container size="md">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl lg:text-4xl font-bold tracking-tight text-elbro-100 mb-4">
              Rejoignez la famille ELBRO
            </h2>

            <p className="text-elbro-400 text-lg mb-8">
              Inscrivez-vous pour recevoir nos nouveautés, offres exclusives et actualités en avant-première.
            </p>

            <form
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              onSubmit={(event) => event.preventDefault()}
            >
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 px-4 py-3 bg-elbro-950 border border-elbro-400/20 rounded-lg text-elbro-100 placeholder-elbro-400 focus:outline-none focus:ring-2 focus:ring-elbro-100"
                required
              />

              <Button
                type="submit"
                size="lg"
                className="whitespace-nowrap"
              >
                S'inscrire
              </Button>
            </form>

            <p className="text-xs text-elbro-400 mt-4">
              En vous inscrivant, vous acceptez notre{' '}
              <a
                href="/confidentialite"
                className="underline hover:text-elbro-100"
              >
                politique de confidentialité
              </a>
              . Désabonnement possible à tout moment.
            </p>
          </div>
        </Container>
      </section>
    </main>
  );
}

function ProductCard({
  product,
  badge,
}: {
  product: any;
  badge?: string;
}) {
  const mainImage =
    product.images?.find((image: any) => image.is_main) ||
    product.images?.[0];

  const price =
    product.sale_price_cents &&
    product.sale_price_cents < product.price_cents
      ? product.sale_price_cents
      : product.price_cents;

  const oldPrice =
    product.sale_price_cents &&
    product.sale_price_cents < product.price_cents
      ? product.price_cents
      : null;

  return (
    <Link to={`/produits/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-elbro-900 border border-elbro-400/10">
        {mainImage?.url ? (
          <img
            src={mainImage.url}
            alt={mainImage.alt_text || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-elbro-400" />
          </div>
        )}

        {badge && (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium bg-elbro-100 text-elbro-950 rounded-full">
            {badge}
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
          <span className="font-semibold text-elbro-100">
            {formatPrice(price)}
          </span>

          {oldPrice && (
            <span className="text-sm text-elbro-400 line-through">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
