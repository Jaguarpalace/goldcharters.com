'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import { getServerSupabase } from '@/lib/supabase/server';
import type { UploadedImage } from '@/types/database';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

/* ---------- Read ---------- */

/**
 * Load every image catalogued in the public-media library, newest first.
 * Uses the session client (RLS-bound) — read access is open to everyone.
 */
export async function listMediaFiles(): Promise<UploadedImage[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('uploaded_images')
    .select('*')
    .eq('bucket', 'public-media')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as UploadedImage[];
}

/* ---------- Upload ---------- */

/**
 * Upload an image into the public-media bucket and catalogue it in the
 * uploaded_images table.
 *
 * Accepts the file under either the `file` (single) or `files` (multi) form
 * key. Server-side validation is non-negotiable — never trust the client to
 * have stayed within the size / mime constraints.
 */
export async function uploadPublicImage(
  formData: FormData,
): Promise<SaveResult<{ uploaded: UploadedImage[]; errors: string[] }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const incoming: File[] = [];
  for (const value of formData.getAll('file')) {
    if (value instanceof File && value.size > 0) incoming.push(value);
  }
  for (const value of formData.getAll('files')) {
    if (value instanceof File && value.size > 0) incoming.push(value);
  }
  if (incoming.length === 0) return { ok: false, error: 'No file received.' };

  const uploaded: UploadedImage[] = [];
  const errors: string[] = [];

  for (const file of incoming) {
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: over 8MB`);
      continue;
    }
    if (!ALLOWED.has(file.type)) {
      errors.push(`${file.name}: unsupported type (${file.type || 'unknown'})`);
      continue;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeBase = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await ctx.admin.storage
      .from('public-media')
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: '86400',
        upsert: false,
      });
    if (uploadError) {
      console.error('[media:upload]', uploadError);
      errors.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    const { data: publicData } = ctx.admin.storage
      .from('public-media')
      .getPublicUrl(path);
    const url = publicData.publicUrl;

    const { data: row, error: insertError } = await ctx.admin
      .from('uploaded_images')
      .insert({
        image_url: url,
        bucket: 'public-media',
        alt_text: null,
        created_by: ctx.userId,
      })
      .select('*')
      .single<UploadedImage>();

    if (insertError || !row) {
      // Roll back the storage upload so we don't leave an orphan file.
      await ctx.admin.storage.from('public-media').remove([path]).catch(() => {});
      console.error('[media:catalogue]', insertError);
      errors.push(`${file.name}: ${insertError?.message ?? 'catalogue failed'}`);
      continue;
    }

    uploaded.push(row);
  }

  revalidatePath('/admin/media');
  if (uploaded.length === 0) {
    return { ok: false, error: errors.join(' · ') || 'No files uploaded.' };
  }
  return { ok: true, data: { uploaded, errors } };
}

/* ---------- Update alt text ---------- */

export async function updateMediaAltText(
  id: string,
  altText: string,
): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const trimmed = altText.trim().slice(0, 200);
  const { error } = await ctx.admin
    .from('uploaded_images')
    .update({ alt_text: trimmed || null })
    .eq('id', id);

  if (error) {
    console.error('[media:alt]', error);
    return { ok: false, error: error.message };
  }
  revalidatePath('/admin/media');
  return { ok: true };
}

/* ---------- Delete ---------- */

/** Remove an image from storage and the catalogue. */
export async function deleteMediaFile(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // Look up the row first so we know the storage path to remove.
  const { data: row, error: readError } = await ctx.admin
    .from('uploaded_images')
    .select('image_url, bucket')
    .eq('id', id)
    .maybeSingle();
  if (readError || !row) {
    return { ok: false, error: readError?.message ?? 'Not found.' };
  }

  // The image_url ends in the storage path after the bucket name.
  const path = extractPath(row.image_url as string, row.bucket as string);
  if (path) {
    const { error: storageError } = await ctx.admin.storage
      .from(row.bucket as string)
      .remove([path]);
    if (storageError) {
      console.error('[media:storage-delete]', storageError);
      // Surface it but still try to remove the catalogue row so we don't
      // leave a broken pointer behind.
    }
  }

  const { error: deleteError } = await ctx.admin
    .from('uploaded_images')
    .delete()
    .eq('id', id);
  if (deleteError) {
    console.error('[media:catalogue-delete]', deleteError);
    return { ok: false, error: deleteError.message };
  }

  revalidatePath('/admin/media');
  return { ok: true };
}

/** Pull the storage object path out of a Supabase public URL. */
function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
