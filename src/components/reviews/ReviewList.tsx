import { useState } from 'react';
import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ReviewWithUser } from '../../services/reviews';

interface ReviewListProps {
  reviews: ReviewWithUser[];
  currentUserId?: string | null;
  onEdit?: (review: ReviewWithUser) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
}

export function ReviewList({ reviews, currentUserId, onEdit, onDelete, showActions = false }: ReviewListProps) {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-elbro-400/30" />
        <p className="text-elbro-400">Aucun avis pour le moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => {
        const isOwnReview = review.user_id === currentUserId;
        const isExpanded = expandedReviews.has(review.id);
        const hasLongContent = review.content && review.content.length > 200;

        return (
          <div
            key={review.id}
            className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-elbro-400/20 flex items-center justify-center">
                  <span className="text-elbro-400 font-medium">
                    {review.user_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-elbro-100">{review.user_name}</p>
                  <p className="text-sm text-elbro-400">
                    {new Date(review.created_at).toLocaleDateString('fr-MA', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    })}
                    {review.verified_purchase && (
                      <>
                        {' • '}
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          Achat vérifié
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {showActions && isOwnReview && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit?.(review)}
                    className="p-2 text-elbro-400 hover:text-elbro-100 hover:bg-elbro-800 rounded-lg transition-colors"
                    aria-label="Modifier l'avis"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete?.(review.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    aria-label="Supprimer l'avis"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn('w-5 h-5', star <= review.rating ? 'fill-current text-yellow-400' : 'text-elbro-400/30')}
                />
              ))}
            </div>

            {/* Title */}
            {review.title && (
              <h4 className="font-semibold text-elbro-100 mb-2">{review.title}</h4>
            )}

            {/* Content */}
            <div className="text-elbro-400 leading-relaxed">
              {hasLongContent && !isExpanded ? (
                <>
                  <p>{review.content?.substring(0, 200)}...</p>
                  <button
                    onClick={() => setExpandedReviews(prev => new Set(prev).add(review.id))}
                    className="mt-2 text-sm text-elbro-100 hover:underline"
                  >
                    Lire la suite
                  </button>
                </>
              ) : (
                <>
                  <p>{review.content}</p>
                  {hasLongContent && isExpanded && (
                    <button
                      onClick={() => setExpandedReviews(prev => {
                        const next = new Set(prev);
                        next.delete(review.id);
                        return next;
                      })}
                      className="mt-2 text-sm text-elbro-400 hover:underline"
                    >
                      Réduire
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}