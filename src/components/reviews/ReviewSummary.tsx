import { Star, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ReviewStats } from '../../services/reviews';

interface ReviewSummaryProps {
  stats: ReviewStats | null;
  showDetails?: boolean;
}

export function ReviewSummary({ stats, showDetails = true }: ReviewSummaryProps) {
  if (!stats || stats.total_reviews === 0) {
    return (
      <div className="text-center py-8">
        <Star className="w-12 h-12 mx-auto mb-4 text-elbro-400/30" />
        <p className="text-elbro-400">Aucun avis pour le moment</p>
        <p className="text-sm text-elbro-400/50 mt-1">Soyez le premier à donner votre avis</p>
      </div>
    );
  }

  const { average_rating, total_reviews, rating_1, rating_2, rating_3, rating_4, rating_5, verified_count } = stats;
  const ratings = [rating_5, rating_4, rating_3, rating_2, rating_1];
  const maxCount = Math.max(...ratings, 1);

  return (
    <div className="space-y-4">
      {/* Overall Rating */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="text-center sm:text-left">
          <div className="text-5xl font-bold text-elbro-100">{average_rating.toFixed(1)}</div>
          <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn('w-5 h-5', i < Math.round(average_rating) ? 'fill-current text-yellow-400' : 'text-elbro-400/30')}
              />
            ))}
          </div>
          <p className="text-sm text-elbro-400 mt-1">{total_reviews} avis</p>
        </div>

        {showDetails && (
          <div className="flex-1 w-full sm:w-auto space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats[`rating_${star}` as keyof typeof stats] as number;
              const percentage = (count / maxCount) * 100;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-elbro-400 w-6 text-right">{star}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <div className="flex-1 h-2 bg-elbro-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-elbro-400 w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDetails && verified_count > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>{verified_count} avis vérifié{verified_count > 1 ? 's' : ''} (achat confirmé)</span>
        </div>
      )}
    </div>
  );
}