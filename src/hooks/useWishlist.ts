import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';
import * as wishlistService from '../services/wishlist';
import type { WishlistItem } from '../services/wishlist';

export function useWishlist() {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const loadWishlist = useCallback(async () => {
    if (!user) {
      setWishlist([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await wishlistService.getWishlist(user.id);
      setWishlist(data);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadWishlist();
    }
  }, [authLoading, loadWishlist]);

  const isInWishlist = useCallback((productId: string, variantId?: string) => {
    return wishlist.some(item =>
      item.product_id === productId &&
      (variantId === undefined || item.variant_id === variantId)
    );
  }, [wishlist]);

  const getWishlistVariantId = useCallback((productId: string) => {
    const item = wishlist.find(item => item.product_id === productId);
    return item?.variant_id ?? null;
  }, [wishlist]);

  const toggle = useCallback(async (productId: string, variantId?: string, productName?: string) => {
    if (!user) {
      addToast({
        type: 'error',
        title: 'Connexion requise',
        message: 'Veuillez vous connecter pour ajouter aux favoris'
      });
      return false;
    }

    const key = `${productId}-${variantId || 'default'}`;
    if (toggling.has(key)) return false;

    const newToggling = new Set(toggling);
    newToggling.add(key);
    setToggling(newToggling);

    try {
      const added = await wishlistService.toggleWishlist(user.id, productId, variantId);
      await loadWishlist();

      if (added) {
        addToast({
          type: 'success',
          title: 'Ajouté aux favoris',
          message: productName || 'Produit ajouté à votre liste de souhaits'
        });
      } else {
        addToast({
          type: 'info',
          title: 'Retiré des favoris',
          message: productName || 'Produit retiré de votre liste de souhaits'
        });
      }

      return added;
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de modifier les favoris'
      });
      return false;
    } finally {
      const newToggling2 = new Set(toggling);
      newToggling2.delete(key);
      setToggling(newToggling2);
    }
  }, [user, toggling, loadWishlist, addToast]);

  const remove = useCallback(async (wishlistId: string, productName?: string) => {
    if (!user) return false;

    try {
      await wishlistService.removeFromWishlist(wishlistId);
      await loadWishlist();

      addToast({
        type: 'info',
        title: 'Retiré des favoris',
        message: productName || 'Produit retiré de votre liste de souhaits'
      });
      return true;
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de retirer des favoris'
      });
      return false;
    }
  }, [user, loadWishlist, addToast]);

  const wishlistCount = useMemo(() => wishlist.length, [wishlist]);

  const wishlistProductIds = useMemo(() =>
    new Set(wishlist.map(item => item.product_id)),
    [wishlist]
  );

  return {
    wishlist,
    loading: loading || authLoading,
    toggling,
    wishlistCount,
    wishlistProductIds,
    isInWishlist,
    getWishlistVariantId,
    toggle,
    remove,
    refresh: loadWishlist,
  };
}

export function useWishlistStatus(productId: string, variantId?: string) {
  const { isInWishlist, loading } = useWishlist();
  const inWishlist = useMemo(() => isInWishlist(productId, variantId), [isInWishlist, productId, variantId]);

  return { inWishlist, loading };
}