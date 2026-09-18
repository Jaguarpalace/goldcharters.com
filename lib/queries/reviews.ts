import { getServerSupabase } from '@/lib/supabase/server';
import { mockReviews } from '@/lib/mock-data';
import type { Review, SiteSettings } from '@/types/database';

/**
 * Customer reviews (migration 037). Managed at /admin/reviews and shown as
 * cards on the homepage, the sell pages, the matching location page and the
 * /reviews page.
 *
 * Samples: on a developer machine only, an empty or missing table falls back
 * to clearly labelled sample reviews so the layout can be previewed before
 * real ones are entered. They never render in production: publishing an
 * invented review is a banned practice under the DMCC Act 2024.
 */
const IS_DEV = process.env.NODE_ENV === 'development';

/** PostgREST / Postgres codes for "this table does not exist yet". */
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01']);

export type ReviewSummary = {
  rating: number;
  count: number;
  profileUrl: string | null;
  writeUrl: string | null;
  /** True for the dev-only placeholder summary. */
  isSample?: boolean;
};

/**
 * The overall Google rating entered at /admin/reviews. Null until both the
 * rating and the count are set, so a half-filled form never shows "0 reviews".
 */
export function getReviewSummary(settings: SiteSettings, opts: { allowSample?: boolean } = {}): ReviewSummary | null {
  const rating = Number(settings.google_rating);
  const count = Number(settings.google_review_count);
  if (Number.isFinite(rating) && rating > 0 && Number.isFinite(count) && count > 0) {
    return {
      rating,
      count,
      profileUrl: settings.google_reviews_url || null,
      writeUrl: settings.google_write_review_url || null,
    };
  }
  if (IS_DEV && opts.allowSample) {
    return { rating: 4.9, count: 15, profileUrl: null, writeUrl: null, isSample: true };
  }
  return null;
}

/** Every published review, featured first, then by display order, newest first. */
export async function getPublishedReviews(): Promise<Review[]> {
  const supabase = getServerSupabase();
  if (!supabase) return IS_DEV ? mockReviews() : [];

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('published', true)
    .order('featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('review_date', { ascending: false });

  if (error || !data || data.length === 0) return IS_DEV ? mockReviews() : [];
  return data as Review[];
}

/** Admin list: everything, no samples, plus whether migration 037 is still to run. */
export async function getReviewsAdmin(): Promise<{ reviews: Review[]; tableMissing: boolean }> {
  const supabase = getServerSupabase();
  if (!supabase) return { reviews: [], tableMissing: false };

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('review_date', { ascending: false });

  if (error) return { reviews: [], tableMissing: MISSING_TABLE_CODES.has(error.code ?? '') };
  return { reviews: (data ?? []) as Review[], tableMissing: false };
}

/** The handful shown on the homepage and sell pages: featured first. */
export function pickFeatured(reviews: Review[], limit = 3): Review[] {
  return reviews.slice(0, limit);
}

/**
 * For a location page: reviews from that town first, topped up with the
 * featured ones so the section never looks half empty.
 */
export function pickForTown(reviews: Review[], townSlug: string, limit = 3): Review[] {
  const local = reviews.filter((r) => r.town_slug === townSlug);
  const rest = reviews.filter((r) => r.town_slug !== townSlug);
  return [...local, ...rest].slice(0, limit);
}
