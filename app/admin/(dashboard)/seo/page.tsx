import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listPageSeo } from '@/lib/queries/pageSeo';
import { SeoBoard } from './SeoBoard';

export const dynamic = 'force-dynamic';

export default async function AdminSeoPage() {
  const rows = isSupabaseConfigured() ? await listPageSeo() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Search</span>
        <h1 className="mt-1 font-display text-2xl text-white">Page SEO</h1>
        <p className="mt-1 max-w-3xl text-xs text-warmgrey">
          Every public page on the site. Edit the title and description that appears in Google,
          plus the keywords and social-share metadata. URLs are locked - renaming a page is a
          deliberate code change with a 301 redirect so we never lose ranking.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view and edit live SEO data.
        </div>
      )}

      <SeoBoard initialRows={rows} />
    </div>
  );
}
