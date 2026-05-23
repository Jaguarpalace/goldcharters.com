import Link from 'next/link';
import { getBlogPosts } from '@/lib/queries/blog';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const posts = await getBlogPosts({ includeUnpublished: true });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">SEO</span>
          <h1 className="font-display text-4xl text-white mt-2">Blog & Articles</h1>
          <p className="mt-2 max-w-2xl text-sm text-warmgrey">
            Long-form content for organic search. Every published article is included in your
            sitemap and indexed by Google.
          </p>
        </div>
        <Link href="/admin/blog/new" className="gc-btn-primary">
          New article
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="gc-card p-10 text-center text-sm text-warmgrey">
          No articles yet — write the first one to start ranking for long-tail queries like
          &ldquo;sell 22ct gold UK&rdquo; or &ldquo;sell Rolex Submariner UK&rdquo;.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/blog/${p.id}`}
                className="gc-card group block h-full overflow-hidden p-5 transition hover:bg-ink-800/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
                    {p.category ?? 'Uncategorised'}
                  </span>
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-luxe ' +
                      (p.published
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-ink-800 text-warmgrey')
                    }
                  >
                    {p.published ? 'Live' : 'Draft'}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-base font-semibold text-white">{p.title}</h2>
                {p.excerpt && (
                  <p className="mt-2 line-clamp-3 text-xs text-warmgrey">{p.excerpt}</p>
                )}
                <p className="mt-3 text-[10px] uppercase tracking-luxe text-warmgrey/70">
                  Updated {new Date(p.updated_at).toLocaleDateString('en-GB')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
