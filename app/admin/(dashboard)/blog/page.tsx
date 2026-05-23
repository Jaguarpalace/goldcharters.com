import { getServerSupabase } from '@/lib/supabase/server';
import type { BlogPost } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const supabase = getServerSupabase();
  let posts: BlogPost[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    posts = (data ?? []) as BlogPost[];
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">SEO</span>
          <h1 className="font-display text-4xl text-white mt-2">Blog & Articles</h1>
          <p className="mt-2 max-w-2xl text-sm text-warmgrey">
            Long-form content for organic search. Backed by the{' '}
            <code className="text-gold-tint">blog_posts</code> table.
          </p>
        </div>
        <button type="button" className="gc-btn-primary">
          New Article
        </button>
      </header>

      {posts.length === 0 ? (
        <div className="gc-card p-10 text-center text-sm text-warmgrey">
          No articles yet — create your first article to start ranking for long-tail queries like &ldquo;sell
          22ct gold UK&rdquo; or &ldquo;antique engagement ring valuation&rdquo;.
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="gc-card flex items-center justify-between p-5">
              <div>
                <p className="font-medium text-white">{p.title}</p>
                <p className="text-xs text-warmgrey">/blog/{p.slug}</p>
              </div>
              <span className="gc-pill">{p.published ? 'Published' : 'Draft'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
