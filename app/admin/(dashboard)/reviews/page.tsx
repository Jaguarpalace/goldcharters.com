import { getReviewsAdmin } from '@/lib/queries/reviews';
import { getSiteSettings } from '@/lib/queries/homepage';
import { LOCATIONS } from '@/lib/content/locations';
import { requireFullAdminPage } from '@/lib/auth/adminRole';
import { ReviewsEditor } from './ReviewsEditor';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  await requireFullAdminPage();
  const [{ reviews, tableMissing }, settings] = await Promise.all([getReviewsAdmin(), getSiteSettings()]);
  // Only slug + name cross to the browser; the full location content stays on the server.
  const towns = LOCATIONS.map((l) => ({ slug: l.slug, name: l.name })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-2xl text-white mt-2">Reviews</h1>
        <p className="mt-2 max-w-3xl text-sm text-warmgrey">
          Genuine customer reviews, copied word for word. Featured reviews show on the homepage and the sell pages, a
          review tagged with a town also shows on that town&apos;s page, and every published review shows on /reviews.
          Changes appear on the public site within a couple of minutes.
        </p>
      </header>

      {tableMissing ? (
        <div className="gc-card border border-amber-400/40 p-6 text-sm text-amber-200">
          <p className="font-semibold text-amber-300">One step before this screen works</p>
          <p className="mt-2">
            Run <code className="rounded bg-ink-800 px-1.5 py-0.5">supabase/migrations/037_reviews.sql</code> in the
            Supabase SQL Editor, then reload this page. Until then the public site simply shows no reviews.
          </p>
        </div>
      ) : (
        <ReviewsEditor
          initial={reviews}
          towns={towns}
          settingsId={settings.id}
          summary={{
            google_rating: settings.google_rating != null ? String(settings.google_rating) : '',
            google_review_count: settings.google_review_count != null ? String(settings.google_review_count) : '',
            google_reviews_url: settings.google_reviews_url ?? '',
            google_write_review_url: settings.google_write_review_url ?? '',
          }}
        />
      )}
    </div>
  );
}
