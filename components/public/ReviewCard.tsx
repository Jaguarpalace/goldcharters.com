import type { Review } from '@/types/database';
import { getLocationBySlug } from '@/lib/content/locations';

const SOURCE_LABEL: Record<Review['source'], string> = {
  google: 'Google review',
  direct: 'Client review',
  other: 'Review',
};

/** "September 2026". Month and year is as precise as a review date needs to be. */
function monthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function ReviewStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${full} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden
          fill={n <= full ? '#D4AF37' : 'none'}
          stroke={n <= full ? '#D4AF37' : 'rgba(212,175,55,0.35)'}
          strokeWidth="1.6"
        >
          <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/**
 * One customer review. Cards trim long reviews to keep a row even; the
 * /reviews page passes `full` to show every word.
 */
export function ReviewCard({ review, full = false }: { review: Review; full?: boolean }) {
  const town = review.town_slug ? getLocationBySlug(review.town_slug)?.name : null;
  const date = monthYear(review.review_date);

  return (
    <figure className="gc-card relative flex h-full flex-col p-5 sm:p-6">
      {review.is_sample && (
        <span className="absolute right-3 top-3 rounded-full bg-amber-400/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-amber-300">
          Sample - dev only
        </span>
      )}
      <ReviewStars rating={review.rating} />
      <blockquote
        className={
          'mt-3 flex-1 text-sm leading-relaxed text-white/90 ' + (full ? '' : 'line-clamp-6')
        }
      >
        {review.body}
      </blockquote>
      <figcaption className="mt-4 border-t border-gold-metallic/15 pt-3">
        <p className="text-sm font-semibold text-white">{review.author_name}</p>
        <p className="mt-0.5 text-[11px] uppercase tracking-luxe text-warmgrey">
          {[town, date, SOURCE_LABEL[review.source]].filter(Boolean).join(' · ')}
        </p>
      </figcaption>
    </figure>
  );
}
