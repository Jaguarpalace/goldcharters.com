'use server';

import { requireAdminContext, type SaveResult } from './_helpers';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

export async function uploadPublicImage(formData: FormData): Promise<SaveResult<{ url: string }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No file received.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'File must be under 8MB.' };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: `Unsupported type: ${file.type}` };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const safeBase = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  const path = `${Date.now()}-${safeBase}.${ext}`;

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
    return { ok: false, error: uploadError.message };
  }

  const { data } = ctx.admin.storage.from('public-media').getPublicUrl(path);
  const url = data.publicUrl;

  // Track it so the media library can list/delete later.
  await ctx.admin.from('uploaded_images').insert({
    image_url: url,
    bucket: 'public-media',
    created_by: ctx.userId,
  });

  return { ok: true, data: { url } };
}
