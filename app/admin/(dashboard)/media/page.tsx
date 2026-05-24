import { listMediaFiles } from '@/lib/actions/media';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { MediaBoard } from './MediaBoard';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const files = isSupabaseConfigured() ? await listMediaFiles() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Media</span>
        <h1 className="font-display text-3xl text-white mt-1">Media Library</h1>
        <p className="mt-1 text-xs text-warmgrey">
          Upload, organise and copy URLs for images used across the public site. JPG, PNG, WEBP or
          SVG, up to 8MB each.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Sign in is required to manage uploads.
        </div>
      )}

      <MediaBoard initialFiles={files} />
    </div>
  );
}
