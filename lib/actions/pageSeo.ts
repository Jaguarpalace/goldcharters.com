'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, errResult, type SaveResult } from './_helpers';
import type { PageSeo } from '@/types/database';

/**
 * Bounds enforced at every layer (UI hint → server action → DB CHECK).
 * Google truncates titles around ~60 chars in SERPs and descriptions
 * around ~155. The soft minimums prevent empty / nearly-empty fields
 * without forbidding short brand-style titles.
 */
const TITLE_MIN = 5;
const TITLE_MAX = 80;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 300;

export type PageSeoPatch = {
  title: string;
  description: string;
  keywords?: string[] | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
};

/**
 * Update an existing /admin/seo row. The slug is part of the URL, not the
 * payload — it's never editable from the CMS. New rows must be added via
 * a code-level migration so this action only handles UPDATE.
 */
export async function updatePageSeo(
  slug: string,
  patch: PageSeoPatch,
): Promise<SaveResult<PageSeo>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx as SaveResult<PageSeo>;

  const title = patch.title?.trim() ?? '';
  const description = patch.description?.trim() ?? '';

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return errResult(
      'VALIDATION',
      `Title must be ${TITLE_MIN}–${TITLE_MAX} characters (currently ${title.length}).`,
    );
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    return errResult(
      'VALIDATION',
      `Description must be ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters (currently ${description.length}).`,
    );
  }

  const keywords =
    (patch.keywords ?? null) === null
      ? null
      : (patch.keywords as string[])
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
          .slice(0, 40);

  const { data, error } = await ctx.admin
    .from('page_seo')
    .update({
      title,
      description,
      keywords,
      og_title: clean(patch.og_title),
      og_description: clean(patch.og_description),
      og_image_url: clean(patch.og_image_url),
    })
    .eq('slug', slug)
    .select('*')
    .single<PageSeo>();

  if (error || !data) {
    console.error('[seo:update]', error);
    return errResult('UPSTREAM', error?.message ?? 'Could not save.');
  }

  // Invalidate the public page so the next crawler / visitor sees the new
  // title immediately. Sitemap lastmod also picks up updated_at on next
  // request.
  revalidatePath('/admin/seo');
  revalidatePath(slug);

  return { ok: true, data };
}

function clean(v: string | null | undefined): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, 300) : null;
}
