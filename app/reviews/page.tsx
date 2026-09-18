import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/queries/homepage';
import { getPublishedReviews, getReviewSummary } from '@/lib/queries/reviews';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { JsonLd } from '@/lib/seo/JsonLd';
import { breadcrumbSchema, SITE_URL } from '@/lib/seo/structuredData';
import { ReviewCard } from '@/components/public/ReviewCard';
import { ReviewSummaryBadge } from '@/components/public/ReviewsStrip';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/reviews');
}

/**
 * Every published review in full. Deliberately carries no Review or
 * AggregateRating markup: Google ignores star markup for a business's own
 * reviews on its own site, and treats it as a guidelines breach.
 */
export default async function ReviewsPage() {
  const [settings, reviews] = await Promise.all([getSiteSettings(), getPublishedReviews()]);
  const summary = getReviewSummary(settings, { allowSample: reviews.some((r) => r.is_sample) });

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', url: SITE_URL },
          { name: 'Reviews', url: `${SITE_URL}/reviews` },
        ])}
      />

      <section className="border-b border-gold-metallic/15 py-10 lg:py-14">
        <div className="gc-container">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <span className="gc-eyebrow">Client Reviews</span>
            <h1 className="gc-heading">What Our Clients Say</h1>
            <p className="gc-subhead">
              Every review on this page was written by a client and is shown word for word. The complete list,
              including any we have not copied across yet, is on our Google profile.
            </p>
            {summary && <ReviewSummaryBadge summary={summary} />}
            {(summary?.profileUrl || summary?.writeUrl) && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {summary.profileUrl && (
                  <a href={summary.profileUrl} target="_blank" rel="noopener noreferrer" className="gc-btn-secondary">
                    Read them on Google
                  </a>
                )}
                {summary.writeUrl && (
                  <a href={summary.writeUrl} target="_blank" rel="noopener noreferrer" className="gc-btn-primary">
                    Leave a review
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="gc-container">
          {reviews.length === 0 ? (
            <p className="mx-auto max-w-xl text-center text-sm text-warmgrey">
              Our reviews are being added to this page. In the meantime they can all be read on our Google profile.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reviews.map((r) => (
                <li key={r.id}>
                  <ReviewCard review={r} full />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-t border-gold-metallic/15 py-10 lg:py-14">
        <div className="gc-container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="gc-heading">Ready for your own valuation?</h2>
            <p className="gc-subhead mt-4">
              Weighed and priced in front of you, with a written figure valid for 24 hours. Paid the same day,
              usually within seconds.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/sell-gold#valuation-form" className="gc-btn-primary">
                Start your valuation
              </Link>
              <Link href="/gold-calculator" className="gc-btn-secondary">
                See what we pay per gram
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
