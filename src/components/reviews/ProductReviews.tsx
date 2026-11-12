import { Star } from 'lucide-react';
import { ReviewSummary } from './ReviewSummary';
import { ReviewList } from './ReviewList';
import { ReviewForm } from './ReviewForm';
import { useProductReviews } from '../../hooks/useReviews';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { Button } from '../ui';

interface ProductReviewsProps {
  productId: string;
  showSummary?: boolean;
}

export function ProductReviews({ productId, showSummary = true }: ProductReviewsProps) {
  const { user } = useAuth();
  const {
    reviews,
    stats,
    loading,
    submitting,
    userReview,
    canReview,
    submitReview,
    updateReview,
    deleteReview,
  } = useProductReviews(productId);

  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<typeof userReview | null>(null);
  const [canReviewResult, setCanReviewResult] = useState<{ can_review: boolean; has_delivered_order: boolean } | null>(null);

  useEffect(() => {
    if (user && !userReview) {
      canReview().then(result => {
        if (result) {
          setCanReviewResult({
            can_review: result.can_review,
            has_delivered_order: result.has_delivered_order,
          });
        }
      });
    }
  }, [user, userReview, canReview]);

  const handleShowForm = () => {
    if (!user) {
      // Could redirect to login
      return;
    }
    setEditingReview(userReview || null);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingReview(null);
  };

  const handleFormSubmit = async (params: {
    rating: number;
    title?: string;
    content?: string;
    order_id?: string;
    verified_purchase?: boolean;
  }) => {
    if (editingReview) {
      return updateReview(editingReview.id, params);
    } else {
      return submitReview(params);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) {
      await deleteReview(reviewId);
    }
  };

  const handleEdit = (review: typeof userReview) => {
    setEditingReview(review);
    setShowForm(true);
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-elbro-900 rounded-2xl border border-elbro-400/10" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-elbro-900 rounded-xl border border-elbro-400/10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      {showSummary && stats && (
        <ReviewSummary stats={stats} />
      )}

      {/* Write Review Button / Form */}
      {!userReview && user && canReviewResult && (
        <Button
          onClick={handleShowForm}
          variant="outline"
          className="w-full sm:w-auto"
          disabled={submitting}
        >
          <Star className="w-4 h-4 mr-2 fill-current text-yellow-400" />
          {canReviewResult.has_delivered_order ? 'Laisser un avis (Achat vérifié)' : 'Laisser un avis'}
        </Button>
      )}

      {userReview && !showForm && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-current text-yellow-400" />
              <span className="font-medium text-green-400">
                Votre avis : {userReview.rating}/5
              </span>
              {userReview.verified_purchase && (
                <span className="text-xs text-green-400 px-2 py-0.5 bg-green-500/10 rounded-full">
                  Achat vérifié
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(userReview)}>
                Modifier
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(userReview.id)} className="text-red-400 hover:text-red-300">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Form Modal/Inline */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleCancelForm}>
          <div
            className="bg-elbro-950 border border-elbro-400/10 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ReviewForm
              productId={productId}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              initialData={editingReview ? {
                rating: editingReview.rating,
                title: editingReview.title || undefined,
                content: editingReview.content || undefined,
              } : null}
              submitting={submitting}
              canReview={canReviewResult?.can_review ?? true}
              hasDeliveredOrder={canReviewResult?.has_delivered_order ?? false}
            />
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="border-t border-elbro-400/10 pt-8">
        <h3 className="text-xl font-semibold text-elbro-100 mb-6">
          Avis clients ({stats?.total_reviews || 0})
        </h3>
        <ReviewList
          reviews={reviews}
          currentUserId={user?.id || null}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showActions={true}
        />
      </div>
    </div>
  );
}