import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getBlogPosts } from '@/lib/queries/blog';
import { SITE_URL } from '@/lib/seo/structuredData';

export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title: 'Insights & Guides · Charters Gold',
  description:
    'Practical guides on selling gold, fine jewellery, luxury watches and designer handbags in the UK — written by Charters Gold specialists.',
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: { url: `${SITE_URL}/blog`, type: 'website' },
};

export default async function BlogIndex() {
  const posts = await getBlogPosts();

  return (
    <>
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-7 lg:py-14">
          <div className="max-w-3xl">
            <span className="gc-eyebrow">Insights & Guides</span>
            <h1 className="gc-heading-xl mt-3">Notes from the valuation house</h1>
            <p className="gc-subhead mt-4 max-w-2xl">
              Practical guides written by our specialists. How prices are set, what makes a piece
              valuable, what to expect when you sell.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="gc-container">
          {posts.length === 0 ? (
            <div className="gc-card p-10 text-center text-warmgrey">
              <p>No articles yet. Check back soon.</p>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="gc-card gc-card-gold-edge group flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-800">
                      {post.featured_image_url ? (
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="h-full w-full"
                          style={{
                            background:
                              'radial-gradient(50% 40% at 50% 30%, rgba(212,175,55,0.25), transparent 60%), linear-gradient(160deg, #0b0b0b, #050505 60%, #141414)',
                          }}
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      {post.category && (
                        <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
                          {post.category}
                        </span>
                      )}
                      <h2 className="mt-2 font-display text-lg font-semibold text-white">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm text-warmgrey">{post.excerpt}</p>
                      )}
                      <div className="mt-auto pt-4 text-[10px] uppercase tracking-luxe text-gold-metallic group-hover:text-gold-bright">
                        Read article →
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
