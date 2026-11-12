import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import {
  validateCoupon as validateCouponApi,
  getAvailableCoupons as getAvailableCouponsApi,
  getCoupons as getCouponsApi,
  createCoupon as createCouponApi,
  updateCoupon as updateCouponApi,
  deleteCoupon as deleteCouponApi,
  getCouponUsages as getCouponUsagesApi,
  type CouponValidationResult,
  type AvailableCoupon,
  type AdminCouponInput,
  type Coupon,
  type CouponUsage,
} from '../services/coupons';
import { useToast } from '../components/ui/Toast';

export function useCoupons() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [validating, setValidating] = useState(false);

  // Load available coupons for current user
  useEffect(() => {
    loadAvailableCoupons();
  }, [user?.id]);

  const loadAvailableCoupons = useCallback(async () => {
    try {
      const coupons = await getAvailableCouponsApi(user?.id);
      setAvailableCoupons(coupons);
    } catch (error) {
      console.error('Failed to load available coupons:', error);
    }
  }, [user?.id]);

  const validateCoupon = useCallback(
    async (
      code: string,
      orderSubtotalCents: number,
      options?: {
        categoryIds?: string[];
        productIds?: string[];
      }
    ): Promise<CouponValidationResult> => {
      setValidating(true);
      try {
        const result = await validateCouponApi(code, orderSubtotalCents, {
          userId: user?.id,
          categoryIds: options?.categoryIds,
          productIds: options?.productIds,
        });
        return result;
      } catch (error) {
        console.error('Coupon validation error:', error);
        return {
          valid: false,
          coupon: null,
          discount_cents: 0,
          error_message: 'Erreur lors de la validation du coupon',
        };
      } finally {
        setValidating(false);
      }
    },
    [user?.id]
  );

  const applyCoupon = useCallback(
    async (
      code: string,
      orderSubtotalCents: number,
      options?: {
        categoryIds?: string[];
        productIds?: string[];
      }
    ): Promise<CouponValidationResult> => {
      const result = await validateCoupon(code, orderSubtotalCents, options);
      if (result.valid) {
        addToast({
          type: 'success',
          title: 'Coupon appliqué',
          message: `Réduction de ${formatPriceMAD(result.discount_cents)} appliquée`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Coupon invalide',
          message: result.error_message || 'Ce coupon ne peut pas être appliqué',
        });
      }
      return result;
    },
    [validateCoupon, addToast]
  );

  return {
    availableCoupons,
    validating,
    validateCoupon,
    applyCoupon,
    refreshCoupons: loadAvailableCoupons,
  };
}

export function useAdminCoupons() {
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [couponUsages, setCouponUsages] = useState<CouponUsage[]>([]);

  const loadCoupons = useCallback(async (filters?: { is_active?: boolean; is_public?: boolean; limit?: number; offset?: number }) => {
    setLoading(true);
    try {
      const { coupons: data, total: count } = await getCouponsApi(filters);
      setCoupons(data);
      setTotal(count);
    } catch (error) {
      console.error('Failed to load coupons:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les coupons' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const createCoupon = useCallback(
    async (input: AdminCouponInput): Promise<string | null> => {
      setSaving(true);
      try {
        const couponId = await createCouponApi(input);
        addToast({ type: 'success', title: 'Succès', message: 'Coupon créé avec succès' });
        await loadCoupons();
        return couponId;
      } catch (error) {
        console.error('Failed to create coupon:', error);
        addToast({ type: 'error', title: 'Erreur', message: 'Impossible de créer le coupon' });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [addToast, loadCoupons]
  );

  const updateCoupon = useCallback(
    async (couponId: string, updates: Partial<AdminCouponInput>): Promise<boolean> => {
      setSaving(true);
      try {
        await updateCouponApi(couponId, updates);
        addToast({ type: 'success', title: 'Succès', message: 'Coupon mis à jour' });
        await loadCoupons();
        return true;
      } catch (error) {
        console.error('Failed to update coupon:', error);
        addToast({ type: 'error', title: 'Erreur', message: 'Impossible de mettre à jour le coupon' });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [addToast, loadCoupons]
  );

  const deleteCoupon = useCallback(
    async (couponId: string): Promise<boolean> => {
      setSaving(true);
      try {
        await deleteCouponApi(couponId);
        addToast({ type: 'success', title: 'Succès', message: 'Coupon désactivé' });
        await loadCoupons();
        return true;
      } catch (error) {
        console.error('Failed to delete coupon:', error);
        addToast({ type: 'error', title: 'Erreur', message: 'Impossible de désactiver le coupon' });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [addToast, loadCoupons]
  );

  const loadCouponUsages = useCallback(async (couponId: string) => {
    try {
      const usages = await getCouponUsagesApi(couponId);
      setCouponUsages(usages);
    } catch (error) {
      console.error('Failed to load coupon usages:', error);
    }
  }, []);

  return {
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
  };
}

function formatPriceMAD(cents: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}