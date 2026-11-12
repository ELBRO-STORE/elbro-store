import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';
import * as reviewsService from '../services/reviews';
import type { ReviewWithUser, ReviewStats, CanReviewResult } from '../services/reviews';

export function useProductReviews(productId: string) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        reviewsService.getProductReviews(productId),
        reviewsService.getProductReviewStats(productId),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const canReview = useCallback(async (): Promise<CanReviewResult | null> => {
    if (!user || !productId) return null;
    try {
      return await reviewsService.canUserReviewProduct(user.id, productId);
    } catch (error) {
      console.error('Failed to check review eligibility:', error);
      return null;
    }
  }, [user, productId]);

  const submitReview = useCallback(async (params: {
    rating: number;
    title?: string;
    content?: string;
    order_id?: string;
    verified_purchase?: boolean;
  }) => {
    if (!user || !productId) return false;

    setSubmitting(true);
    try {
      await reviewsService.createProductReview({
        product_id: productId,
        user_id: user.id,
        rating: params.rating,
        title: params.title,
        content: params.content,
        order_id: params.order_id,
        verified_purchase: params.verified_purchase,
      });

      addToast({
        type: 'success',
        title: 'Avis publié',
        message: 'Merci pour votre avis !',
      });

      loadReviews();
      return true;
    } catch (error) {
      console.error('Failed to submit review:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de publier l\'avis',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, productId, loadReviews, addToast]);

  const updateReview = useCallback(async (reviewId: string, params: {
    rating?: number;
    title?: string;
    content?: string;
  }) => {
    if (!user) return false;

    setSubmitting(true);
    try {
      const success = await reviewsService.updateProductReview({
        review_id: reviewId,
        user_id: user.id,
        rating: params.rating,
        title: params.title,
        content: params.content,
      });

      if (success) {
        addToast({
          type: 'success',
          title: 'Avis modifié',
          message: 'Votre avis a été mis à jour',
        });
        loadReviews();
      }
      return success;
    } catch (error) {
      console.error('Failed to update review:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de modifier l\'avis',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, loadReviews, addToast]);

  const deleteReview = useCallback(async (reviewId: string) => {
    if (!user) return false;

    setSubmitting(true);
    try {
      const success = await reviewsService.deleteProductReview(reviewId, user.id);
      if (success) {
        addToast({
          type: 'success',
          title: 'Avis supprimé',
          message: 'Votre avis a été supprimé',
        });
        loadReviews();
      }
      return success;
    } catch (error) {
      console.error('Failed to delete review:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de supprimer l\'avis',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [user, loadReviews, addToast]);

  const userReview = reviews.find(r => r.user_id === user?.id);

  return {
    reviews,
    stats,
    loading,
    submitting,
    userReview,
    canReview,
    submitReview,
    updateReview,
    deleteReview,
    refresh: loadReviews,
  };
}