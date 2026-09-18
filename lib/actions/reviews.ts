'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole, type SaveResult } from './_helpers';
import { getAllLocationSlugs } from '@/lib/content/locations';
import type { Review, ReviewSource } from '@/types/database';

const VALID_SOURCES = new Set<ReviewSource>(['google', 'direct', 'other']);

type UpsertReview = {
  id?: string;
  author_name: string;
  rating: number;
  body: string;
  review_date: string;
  source: ReviewSource;
  source_url?: string | null;
  town_slug?: string | null;
  featured?: boolean;
  published?: boolean;
  display_order?: number;
};

/** Reviews appear on most public pages, so refresh them all. */
function refresh() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/reviews');
}

/** Blank becomes null; anything else must be a plain http(s) link. */
function cleanUrl(raw: string | null | undefined): string | null | { error: string } {
  const text = (raw ?? '').trim();
  if (!text) return null;
  try {
    const u = new URL(text);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return { error: 'Links must start with https://' };
    return u.toString().slice(0, 500);
  } catch {
    return { error: 'That link is not a valid web address.' };
  }
}

export async function upsertReview(input: UpsertReview): Promise<SaveResult<Review>> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const author = input.author_name.trim();
  const body = input.body.trim();
  if (!author || !body) return { ok: false, error: 'Customer name and review text are required.' };

  const rating = Math.round(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Stars must be between 1 and 5.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.review_date) || Number.isNaN(Date.parse(input.review_date))) {
    return { ok: false, error: 'Please pick the date the review was left.' };
  }
  if (!VALID_SOURCES.has(input.source)) return { ok: false, error: 'Invalid source.' };

  const town = (input.town_slug ?? '').trim() || null;
  if (town && !getAllLocationSlugs().includes(town)) return { ok: false, error: 'Unknown town.' };

  const sourceUrl = cleanUrl(input.source_url);
  if (sourceUrl && typeof sourceUrl === 'object') return { ok: false, error: sourceUrl.error };

  const row = {
    author_name: author.slice(0, 80),
    rating,
    body: body.slice(0, 3000),
    review_date: input.review_date,
    source: input.source,
    source_url: sourceUrl,
    town_slug: town,
    featured: input.featured ?? false,
    published: input.published ?? true,
    display_order: Math.round(Number(input.display_order) || 0),
  };

  const query = input.id
    ? ctx.admin.from('reviews').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('reviews').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) {
    console.error('[reviews:upsert]', error);
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, data: data as Review };
}

export async function deleteReview(id: string): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const { error } = await ctx.admin.from('reviews').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

type ReviewSummaryInput = {
  settingsId: string;
  google_rating: string;
  google_review_count: string;
  google_reviews_url: string;
  google_write_review_url: string;
};

/** The overall Google rating shown beside the cards. Blank fields clear it. */
export async function saveReviewSummary(input: ReviewSummaryInput): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const ratingText = input.google_rating.trim();
  const countText = input.google_review_count.trim();

  let rating: number | null = null;
  if (ratingText) {
    rating = Math.round(Number(ratingText) * 10) / 10;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return { ok: false, error: 'The rating must be between 1.0 and 5.0, exactly as Google shows it.' };
    }
  }

  let count: number | null = null;
  if (countText) {
    count = Math.round(Number(countText));
    if (!Number.isFinite(count) || count < 0) return { ok: false, error: 'The number of reviews must be a whole number.' };
  }

  const profileUrl = cleanUrl(input.google_reviews_url);
  if (profileUrl && typeof profileUrl === 'object') return { ok: false, error: profileUrl.error };
  const writeUrl = cleanUrl(input.google_write_review_url);
  if (writeUrl && typeof writeUrl === 'object') return { ok: false, error: writeUrl.error };

  const { error } = await ctx.admin
    .from('site_settings')
    .update({
      google_rating: rating,
      google_review_count: count,
      google_reviews_url: profileUrl,
      google_write_review_url: writeUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.settingsId);

  if (error) {
    console.error('[reviews:summary]', error);
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}
