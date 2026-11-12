import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Package, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';
import { Badge } from '../components/ui';
import { useWishlist } from '../hooks/useWishlist';
import { formatPrice } from '../lib/utils';
import { useCart } from '../hooks/useCart';

export function Wishlist() {
  const { wishlist, loading, wishlistCount, remove } = useWishlist();
  const { addItem } = useCart();
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  const handleRemove = async (wishlistId: string, productName: string) => {
    const newRemoving = new Set(removing);
    newRemoving.add(wishlistId);
    setRemoving(newRemoving);

    try {
      await remove(wishlistId, productName);
    } finally {
      const newRemoving2 = new Set(removing);
      newRemoving2.delete(wishlistId);
      setRemoving(newRemoving2);
    }
  };

  const handleAddToCart = async (item: any) => {
    // Find the variant if specified
    const variantId = item.variant_id;

    // We need to get the full product with variants to add to cart
    // For now, we'll use the product info from wishlist
    try {
      addItem({
        productId: item.product_id,
        variantId: variantId || undefined,
        productName: item.product_name,
        pieceName: item.product_name,
        size: item.variant_size || 'Taille unique',
        color: item.variant_color || 'Couleur unique',
        quantity: 1,
        unitPriceCents: item.product_sale_price_cents && item.product_sale_price_cents < item.product_price_cents
          ? item.product_sale_price_cents
          : item.product_price_cents,
        imageUrl: item.product_image || null,
        stock: item.variant_stock || 999,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-elbro-900 rounded-lg w-1/3" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 bg-elbro-900 rounded-2xl p-4 border border-elbro-400/10">
              <div className="w-24 h-24 bg-elbro-950 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-elbro-950 rounded w-3/4" />
                <div className="h-4 bg-elbro-950 rounded w-1/2" />
                <div className="h-8 bg-elbro-950 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-elbro-400 hover:text-elbro-100 mb-4">
            <ArrowLeft className="w-5 h-5" />
            Retour à la boutique
          </Link>
          <h1 className="text-3xl font-bold text-elbro-100">Ma liste de souhaits</h1>
          <p className="text-elbro-400 mt-1">{wishlistCount} article{wishlistCount > 1 ? 's' : ''} dans vos favoris</p>
        </div>
        {wishlistCount > 0 && (
          <Button variant="outline" onClick={() => {
            // Could add clear all functionality
          }}>
            <Trash2 className="w-5 h-5 mr-2 text-red-400" />
            Tout supprimer
          </Button>
        )}
      </div>

      {/* Wishlist Items */}
      <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl overflow-hidden">
        {wishlistCount === 0 ? (
          <div className="p-16 text-center">
            <Heart className="w-16 h-16 mx-auto mb-6 text-elbro-400/50" />
            <h2 className="text-2xl font-semibold text-elbro-100 mb-2">Votre liste est vide</h2>
            <p className="text-elbro-400 mb-6">Ajoutez vos produits préférés pour les retrouver facilement</p>
            <Link to="/produits">
              <Button size="lg">
                <Package className="w-5 h-5 mr-2" />
                Découvrir nos produits
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-elbro-400/10">
            {wishlist.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row p-6 gap-6 items-start sm:items-center">
                {/* Product Image */}
                <Link to={`/produits/${item.product_slug}`} className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-elbro-950 border border-elbro-400/10 relative">
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-elbro-400" />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemove(item.id, item.product_name);
                      }}
                      disabled={removing.has(item.id)}
                    >
                      {removing.has(item.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </Link>

                {/* Product Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <Link to={`/produits/${item.product_slug}`} className="block">
                    <h3 className="font-semibold text-elbro-100 truncate">{item.product_name}</h3>
                  </Link>
                  {item.variant_size && (
                    <p className="text-sm text-elbro-400 mt-1">
                      {item.variant_size} • {item.variant_color}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-bold text-lg text-elbro-100">
                      {formatPrice(item.product_sale_price_cents && item.product_sale_price_cents < item.product_price_cents
                        ? item.product_sale_price_cents
                        : item.product_price_cents)}
                    </span>
                    {item.product_sale_price_cents && item.product_sale_price_cents < item.product_price_cents && (
                      <span className="text-sm text-elbro-400 line-through">
                        {formatPrice(item.product_price_cents)}
                      </span>
                    )}
                    {item.variant_stock !== null && item.variant_stock !== undefined && (
                      <Badge
                        variant={item.variant_stock > 0 ? 'success' : 'error'}
                        className="text-xs"
                      >
                        {item.variant_stock > 0 ? `Stock: ${item.variant_stock}` : 'Rupture'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-elbro-400/50 mt-1">
                    Ajouté le {new Date(item.created_at).toLocaleDateString('fr-MA', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    className="w-full sm:w-auto"
                    onClick={() => handleAddToCart(item)}
                    disabled={item.variant_stock === 0}
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Ajouter au panier
                  </Button>
                  <Link to={`/produits/${item.product_slug}`}>
                    <Button variant="outline" className="w-full sm:w-auto">
                      Voir le produit
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Note */}
      {wishlistCount > 0 && (
        <div className="bg-elbro-900 border border-elbro-400/10 rounded-2xl p-6">
          <p className="text-elbro-400 text-sm text-center">
            Les prix et la disponibilité peuvent changer. Les articles restent dans votre liste
            jusqu'à ce que vous les supprimiez manuellement.
          </p>
        </div>
      )}
    </div>
  );
}