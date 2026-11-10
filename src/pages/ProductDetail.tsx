import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Truck, Shield, RefreshCw, Share2 } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { Button } from '../components/ui';
import { Modal } from '../components/ui';
import { useProduct } from '../hooks/useProducts';
import { useCart, createCartItem } from '../hooks/useCart';
import { formatPrice } from '../lib/utils';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { product, loading, error } = useProduct(slug || '');
  const { addItem, toggleCart } = useCart();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Get available sizes and colors from variants
  const availableSizes = useMemo(() => {
    if (!product?.variants) return [];
    const sizes = [...new Set(product.variants.map(v => v.size))];
    return sizes.filter(s => product.variants?.some(v => v.size === s && v.stock > 0));
  }, [product]);

  const availableColors = useMemo(() => {
    if (!product?.variants) return [];
    const colors = [...new Set(product.variants.map(v => v.color))];
    return colors.filter(c => product.variants?.some(v => v.color === c && v.stock > 0));
  }, [product]);

  // Auto-select first available size/color
  useEffect(() => {
    if (availableSizes.length > 0 && !selectedSize) {
      setSelectedSize(availableSizes[0]);
    }
    if (availableColors.length > 0 && !selectedColor) {
      setSelectedColor(availableColors[0]);
    }
  }, [availableSizes, availableColors, selectedSize, selectedColor]);

  // Find selected variant
  const selectedVariant = useMemo(() => {
    if (!product?.variants || !selectedSize || !selectedColor) return null;
    return product.variants.find(v => v.size === selectedSize && v.color === selectedColor) || null;
  }, [product, selectedSize, selectedColor]);

  const isInStock = selectedVariant ? selectedVariant.stock > 0 : false;
  const maxQuantity = selectedVariant?.stock || 10;
  const currentPrice = product?.sale_price_cents && product.sale_price_cents < product.price_cents
    ? product.sale_price_cents
    : product?.price_cents || 0;
  const oldPrice = product?.sale_price_cents && product.sale_price_cents < product.price_cents
    ? product.price_cents
    : null;

  const images = product?.images?.length ? product.images : [{ id: 'placeholder', url: null, alt_text: product?.name || '' }];

  const handleAddToCart = () => {
    if (!product || !selectedSize || !selectedColor || !isInStock) return;

    const pieceName = product.name;
    const item = createCartItem(
      product,
      selectedVariant || null,
      pieceName,
      quantity,
      selectedSize,
      selectedColor
    );

    addItem(item);
    setAddedToCart(true);
    toggleCart(true);

    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product || !selectedSize || !selectedColor || !isInStock) return;
    handleAddToCart();
    // Navigate to checkout
    window.location.href = '/checkout';
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-elbro-400">Produit non trouvé</p>
          <Link to="/produits" className="mt-4 inline-block text-elbro-100 hover:underline">
            Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elbro-950">
      {/* Breadcrumb */}
      <nav className="bg-elbro-900 border-b border-elbro-400/10 py-4" aria-label="Fil d'Ariane">
        <Container>
          <ol className="flex items-center gap-2 text-sm text-elbro-400">
            <li><Link to="/" className="hover:text-elbro-100">Accueil</Link></li>
            <li>/</li>
            <li><Link to="/produits" className="hover:text-elbro-100">Produits</Link></li>
            <li>/</li>
            <li className="text-elbro-100 truncate max-w-[200px]">{product.name}</li>
          </ol>
        </Container>
      </nav>

      {/* Product Content */}
      <main className="py-8 lg:py-12">
        <Container>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-elbro-900 border border-elbro-400/10">
                {images[selectedImageIndex]?.url ? (
                  <img
                    src={images[selectedImageIndex].url}
                    alt={images[selectedImageIndex].alt_text || product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-24 h-24 text-elbro-400" />
                  </div>
                )}
                {oldPrice && (
                  <span className="absolute top-4 right-4 px-3 py-1 text-sm font-medium bg-red-500/90 text-white rounded-full">
                    -{Math.round((1 - currentPrice / oldPrice!) * 100)}%
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={image.id || index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === selectedImageIndex
                          ? 'border-elbro-100'
                          : 'border-transparent hover:border-elbro-400/30'
                      }`}
                      aria-label={`Voir l'image ${index + 1}`}
                      aria-current={index === selectedImageIndex ? 'true' : 'false'}
                    >
                      {image.url ? (
                        <img src={image.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-elbro-900">
                          <ShoppingBag className="w-8 h-8 text-elbro-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Category & Badge */}
              <div className="flex flex-wrap items-center gap-3">
                {product.category && (
                  <Link
                    to={`/produits?category=${product.category.slug}`}
                    className="text-sm text-elbro-400 hover:text-elbro-100 transition-colors"
                  >
                    {product.category.name}
                  </Link>
                )}
                {product.featured && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    Coup de cœur
                  </span>
                )}
                {product.best_seller && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                    Best-seller
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-elbro-100">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-elbro-100">{formatPrice(currentPrice)}</span>
                {oldPrice && (
                  <span className="text-xl text-elbro-400 line-through">{formatPrice(oldPrice)}</span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-elbro-400 text-lg leading-relaxed">{product.description}</p>

              {/* Full Description */}
              {product.full_description && (
                <div className="border-t border-elbro-400/10 pt-6">
                  <h3 className="font-semibold text-elbro-100 mb-3">Description complète</h3>
                  <p className="text-elbro-400 leading-relaxed">{product.full_description}</p>
                </div>
              )}

              {/* Material */}
              {product.material && (
                <div className="flex items-center gap-2 text-elbro-400">
                  <span className="font-medium text-elbro-100">Matière :</span>
                  <span>{product.material}</span>
                </div>
              )}

              {/* Variant Selection */}
              <div className="border-t border-elbro-400/10 pt-6 space-y-6">
                {/* Color Selection */}
                {availableColors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-elbro-100 mb-3">Couleur</label>
                    <div className="flex flex-wrap gap-3">
                      {availableColors.map((color) => {
                        const hasStock = product.variants?.some(v => v.color === color && v.stock > 0);
                        return (
                          <button
                            key={color}
                            onClick={() => {
                              setSelectedColor(color);
                              // Reset size if not available in this color
                              const sizesInColor = product.variants?.filter(v => v.color === color && v.stock > 0).map(v => v.size) || [];
                              if (!sizesInColor.includes(selectedSize)) {
                                setSelectedSize(sizesInColor[0] || '');
                              }
                            }}
                            className={`flex items-center justify-center min-w-[60px] px-4 py-3 rounded-lg border-2 transition-all ${
                              selectedColor === color
                                ? 'border-elbro-100 bg-elbro-900'
                                : hasStock
                                ? 'border-elbro-400/20 hover:border-elbro-400/40'
                                : 'border-elbro-400/10 opacity-50 cursor-not-allowed'
                            }`}
                            disabled={!hasStock}
                            aria-pressed={selectedColor === color}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size Selection */}
                {availableSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-elbro-100 mb-3">Taille</label>
                    <div className="flex flex-wrap gap-3">
                      {availableSizes.map((size) => {
                        const hasStock = product.variants?.some(v => v.size === size && v.color === selectedColor && v.stock > 0);
                        const stock = product.variants?.find(v => v.size === size && v.color === selectedColor)?.stock || 0;
                        return (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`flex items-center justify-center min-w-[60px] px-4 py-3 rounded-lg border-2 transition-all ${
                              selectedSize === size
                                ? 'border-elbro-100 bg-elbro-900'
                                : hasStock
                                ? 'border-elbro-400/20 hover:border-elbro-400/40'
                                : 'border-elbro-400/10 opacity-50 cursor-not-allowed'
                            }`}
                            disabled={!hasStock}
                            aria-pressed={selectedSize === size}
                          >
                            {size}
                            {stock > 0 && stock <= 5 && (
                              <span className="ml-1 text-xs text-yellow-400">({stock})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedSize && selectedVariant && (
                      <p className="mt-2 text-sm text-elbro-400">
                        Stock restant : <span className={selectedVariant.stock <= 5 ? 'text-yellow-400' : 'text-elbro-100'}>{selectedVariant.stock}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Quantity Selection */}
                <div>
                  <label className="block text-sm font-medium text-elbro-100 mb-3">Quantité</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-elbro-400/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-4 py-3 text-elbro-400 hover:text-elbro-100 hover:bg-elbro-900 transition-colors"
                        aria-label="Diminuer la quantité"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1));
                          setQuantity(val);
                        }}
                        min={1}
                        max={maxQuantity}
                        className="w-16 text-center text-elbro-100 bg-transparent focus:outline-none"
                        aria-label="Quantité"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        className="px-4 py-3 text-elbro-400 hover:text-elbro-100 hover:bg-elbro-900 transition-colors"
                        aria-label="Augmenter la quantité"
                        disabled={quantity >= maxQuantity}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <span className="text-sm text-elbro-400">Max : {maxQuantity}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-elbro-400/10">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={!isInStock}
                >
                  <ShoppingBag className="w-5 h-5" />
                  {addedToCart ? 'Ajouté au panier' : 'Ajouter au panier'}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleBuyNow}
                  disabled={!isInStock}
                >
                  Acheter maintenant
                </Button>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-elbro-400/10">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-elbro-400" />
                  <div>
                    <p className="font-medium text-sm text-elbro-100">Livraison gratuite</p>
                    <p className="text-xs text-elbro-400">Dès 500 MAD d'achat</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-elbro-400" />
                  <div>
                    <p className="font-medium text-sm text-elbro-100">Retours 30 jours</p>
                    <p className="text-xs text-elbro-400">Satisfait ou remboursé</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-elbro-400" />
                  <div>
                    <p className="font-medium text-sm text-elbro-100">Paiement sécurisé</p>
                    <p className="text-xs text-elbro-400">100% protégé</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-elbro-400" />
                  <div>
                    <p className="font-medium text-sm text-elbro-100">Partager</p>
                    <p className="text-xs text-elbro-400">Avec vos amis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>

      {/* Size Guide Modal */}
      <Modal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        title="Guide des tailles"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-elbro-400">Guide des tailles à venir. Contactez-nous pour des conseils personnalisés.</p>
          <Button onClick={() => setShowSizeGuide(false)}>Fermer</Button>
        </div>
      </Modal>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <main className="py-12">
      <Container>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-elbro-900 rounded-2xl border border-elbro-400/10 animate-pulse" />
            <div className="flex gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-20 h-20 bg-elbro-900 rounded-lg border border-elbro-400/10 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-4 bg-elbro-900 rounded w-1/4 animate-pulse" />
            <div className="h-8 bg-elbro-900 rounded w-3/4 animate-pulse" />
            <div className="h-6 bg-elbro-900 rounded w-1/2 animate-pulse" />
            <div className="h-10 bg-elbro-900 rounded w-full animate-pulse" />
            <div className="h-10 bg-elbro-900 rounded w-3/4 animate-pulse" />
            <div className="h-10 bg-elbro-900 rounded w-1/2 animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-elbro-900 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}