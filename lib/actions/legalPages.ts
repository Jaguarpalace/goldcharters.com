'use server';

import { revalidatePath } from 'next/cache';
import { errResult, requireAdminContext, type SaveResult } from './_helpers';
import { logAdminAction } from './auditLog';
import type { LegalPage } from '@/types/database';

const VALID_SLUGS = new Set(['terms', 'privacy', 'cookies']);

export type LegalPagePatch = {
  eyebrow?: string | null;
  title?: string | null;
  intro?: string | null;
};

function clean(v: string | null | undefined, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function refresh(slug: string) {
  revalidatePath(`/${slug}`);
  revalidatePath('/admin/legal');
}

/** Save cosmetic copy overrides (eyebrow/title/intro). */
export async function updateLegalPage(
  slug: string,
  patch: LegalPagePatch,
): Promise<SaveResult<LegalPage>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx as SaveResult<LegalPage>;

  if (!VALID_SLUGS.has(slug)) {
    return errResult('VALIDATION', 'Unknown legal page.');
  }

  const update: Record<string, string | null> = {
    eyebrow: clean(patch.eyebrow, 80),
    title: clean(patch.title, 120),
    intro: clean(patch.intro, 1200),
  };

  const { data, error } = await ctx.admin
    .from('legal_pages')
    .update(update)
    .eq('slug', slug)
    .select('*')
    .single<LegalPage>();

  if (error || !data) {
    console.error('[legal:update]', error);
    return errResult('UPSTREAM', error?.message ?? 'Could not save.');
  }
  refresh(slug);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'legal_page',
    entity_id: slug,
    action: 'update',
    after: update,
    note: `Updated ${slug} cosmetic overrides`,
  });
  return { ok: true, data };
}

/**
 * Stamp last_reviewed_at to now. Surfaces on the legal page as the
 * "Last updated" line — used when a legal review has been performed
 * but no copy changes are needed.
 */
export async function markLegalReviewed(slug: string): Promise<SaveResult<LegalPage>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx as SaveResult<LegalPage>;

  if (!VALID_SLUGS.has(slug)) {
    return errResult('VALIDATION', 'Unknown legal page.');
  }

  const { data, error } = await ctx.admin
    .from('legal_pages')
    .update({ last_reviewed_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('*')
    .single<LegalPage>();

  if (error || !data) {
    console.error('[legal:mark-reviewed]', error);
    return errResult('UPSTREAM', error?.message ?? 'Could not mark reviewed.');
  }
  refresh(slug);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'legal_page',
    entity_id: slug,
    action: 'mark_reviewed',
    note: `Stamped ${slug} as reviewed today`,
  });
  return { ok: true, data };
}
