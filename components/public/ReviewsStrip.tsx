import Link from 'next/link';
import type { Review } from '@/types/database';
import type { ReviewSummary } from '@/lib/queries/reviews';
import { ReviewCard, ReviewStars } from '@/components/public/ReviewCard';

/**
 * The overall Google rating. Always shown with the true count and a link to
 * the full list, so a hand-picked row of cards is never presented as the
 * whole picture.
 */
export function ReviewSummaryBadge({ summary }: { summary: ReviewSummary }) {
  const label = `${summary.rating.toFixed(1)} out of 5 from ${summary.count} Google reviews`;
  const inner = (
    <>
      <span className="font-display text-2xl text-gold-bright">{summary.rating.toFixed(1)}</span>
      <span className="flex flex-col items-start gap-0.5">
        <ReviewStars rating={summary.rating} size={15} />
        <span className="text-[11px] uppercase tracking-luxe text-warmgrey">
          {summary.count} Google reviews{summary.isSample ? ' (sample)' : ''}
        </span>
      </span>
    </>
  );
  const className =
    'inline-flex items-center gap-3 rounded-full border border-gold-metallic/30 bg-ink-950/70 px-5 py-2.5';

  return summary.profileUrl ? (
    <a
      href={summary.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}. Read them on Google`}
      className={className + ' transition hover:border-gold-metallic'}
    >
      {inner}
    </a>
  ) : (
    <div className={className} aria-label={label}>
      {inner}
    </div>
  );
}

/**
 * A short row of review cards, placed just above the valuation form on the
 * homepage, the sell pages and the location pages. Renders nothing until
 * there is at least one review, so an empty table never leaves a gap.
 *
 * No auto-scrolling: on a phone the row swipes sideways, on larger screens
 * it is a plain grid. Moving text is hard to read and needs a pause control
 * to be accessible.
 */
export function ReviewsStrip({
  reviews,
  summary,
  eyebrow = 'In Their Words',
  title = 'What our clients say',
}: {
  reviews: Review[];
  summary: ReviewSummary | null;
  eyebrow?: string;
  title?: string;
}) {
  if (reviews.length === 0) return null;

  return (
    <section className="py-6 lg:py-10" aria-labelledby="reviews-strip-title">
      <div className="gc-container">
        <div className="flex flex-col items-center gap-5 text-center">
          <div>
            <span className="gc-eyebrow">{eyebrow}</span>
            <h2 id="reviews-strip-title" className="gc-heading mt-3">
              {title}
            </h2>
          </div>
          {summary && <ReviewSummaryBadge summary={summary} />}
        </div>

        <ul
          className={
            'mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 ' +
            'md:grid md:snap-none md:grid-cols-3 md:overflow-visible md:pb-0'
          }
        >
          {reviews.map((r) => (
            <li key={r.id} className="w-[85%] flex-none snap-center sm:w-[60%] md:w-auto">
              <ReviewCard review={r} />
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center">
          <Link
            href="/reviews"
            className="text-xs font-semibold uppercase tracking-luxe text-gold-tint transition hover:text-gold-bright"
          >
            Read all our reviews
          </Link>
        </p>
      </div>
    </section>
  );
}
