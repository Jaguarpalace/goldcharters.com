import { getSiteSettings } from '@/lib/queries/homepage';
import { getPublishedReviews, getReviewSummary, pickFeatured, pickForTown } from '@/lib/queries/reviews';
import { ReviewsStrip } from '@/components/public/ReviewsStrip';

/**
 * Drop-in review row for any public page: fetches its own data so a page
 * only needs `<ReviewsBlock />` above its valuation form. Pass `townSlug`
 * on a location page and reviews from that town lead the row.
 */
export async function ReviewsBlock({ townSlug }: { townSlug?: string }) {
  const [settings, reviews] = await Promise.all([getSiteSettings(), getPublishedReviews()]);
  const picked = townSlug ? pickForTown(reviews, townSlug) : pickFeatured(reviews);
  if (picked.length === 0) return null;

  const summary = getReviewSummary(settings, { allowSample: picked.some((r) => r.is_sample) });
  return <ReviewsStrip reviews={picked} summary={summary} />;
}
