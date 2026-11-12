import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '../ui';
import { Textarea } from '../ui';
import { Input } from '../ui';
import { cn } from '../../lib/utils';

interface ReviewFormProps {
  productId: string;
  onSubmit: (params: {
    rating: number;
    title?: string;
    content?: string;
    order_id?: string;
    verified_purchase?: boolean;
  }) => Promise<boolean>;
  onCancel: () => void;
  initialData?: {
    rating: number;
    title?: string;
    content?: string;
  } | null;
  submitting?: boolean;
  canReview?: boolean;
  hasDeliveredOrder?: boolean;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  initialData,
  submitting = false,
  canReview = true,
  hasDeliveredOrder = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (initialData) {
      setRating(initialData.rating);
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    const success = await onSubmit({
      rating,
      title: title.trim() || undefined,
      content: content.trim() || undefined,
      verified_purchase: hasDeliveredOrder,
    });

    if (success) {
      onCancel();
    }
  };

  if (!canReview) {
    return (
      <div className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 text-center">
        <Star className="w-12 h-12 mx-auto mb-4 text-elbro-400/30" />
        <h3 className="text-lg font-medium text-elbro-100 mb-2">Avis réservé aux clients</h3>
        <p className="text-elbro-400 mb-4">
          Vous devez avoir acheté ce produit pour laisser un avis.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-elbro-900 border border-elbro-400/10 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-elbro-100">
          {initialData ? 'Modifier votre avis' : 'Laisser un avis'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-elbro-400 hover:text-elbro-100 hover:bg-elbro-800 rounded-lg transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-elbro-100 mb-3">Votre note</label>
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Note sur 5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={cn(
                'p-1 rounded transition-all',
                'focus:outline-none focus:ring-2 focus:ring-elbro-100',
                star <= (hoverRating || rating)
                  ? 'text-yellow-400'
                  : 'text-elbro-400/30 hover:text-yellow-400'
              )}
              aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
              aria-pressed={star === rating}
            >
              <Star
                className={cn('w-8 h-8', star <= (hoverRating || rating) ? 'fill-current' : '')}
              />
            </button>
          ))}
        </div>
        {rating === 0 && (
          <p className="text-sm text-red-400 mt-2">Veuillez sélectionner une note</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label htmlFor="review-title" className="block text-sm font-medium text-elbro-100 mb-2">
          Titre (optionnel)
        </label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Résumez votre expérience..."
          className="w-full"
          maxLength={100}
        />
      </div>

      {/* Content */}
      <div>
        <label htmlFor="review-content" className="block text-sm font-medium text-elbro-100 mb-2">
          Votre avis
        </label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Partagez votre expérience avec ce produit..."
          rows={4}
          className="w-full"
          maxLength={2000}
        />
        <p className="text-xs text-elbro-400/50 mt-1 text-right">
          {content.length}/2000
        </p>
      </div>

      {/* Verified purchase badge */}
      {hasDeliveredOrder && (
        <div className="flex items-center gap-2 text-sm text-green-400 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Star className="w-4 h-4 fill-current" />
          <span>Achat vérifié — Cet avis sera marqué comme « Achat vérifié »</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-elbro-400/10">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={submitting || rating === 0}
          className="flex-1"
        >
          {submitting ? 'Publication...' : initialData ? 'Mettre à jour' : 'Publier'}
        </Button>
      </div>
    </form>
  );
}