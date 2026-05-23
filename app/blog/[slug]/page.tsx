import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, getBlogPosts } from '@/lib/queries/blog';
import { renderMarkdown } from '@/lib/renderMarkdown';
import { JsonLd } from '@/lib/seo/JsonLd';
import { articleSchema, breadcrumbSchema, SITE_URL } from '@/lib/seo/structuredData';

export const revalidate = 300;

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) return { title: 'Article not found', robots: { index: false, follow: false } };

  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.seo_title ?? post.title,
      description: post.seo_description ?? post.excerpt ?? undefined,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      images: post.featured_image_url
        ? [{ url: post.featured_image_url, alt: post.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seo_title ?? post.title,
      description: post.seo_description ?? post.excerpt ?? undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) notFound();

  // Related posts: same category if available, otherwise just the latest others.
  const allOthers = (await getBlogPosts()).filter((p) => p.id !== post.id);
  const related = (post.category
    ? allOthers.filter((p) => p.category === post.category)
    : allOthers
  ).slice(0, 3);

  const html = renderMarkdown(post.content);
  const publishedDate = new Date(post.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <JsonLd
        data={[
          articleSchema(post),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Blog', url: `${SITE_URL}/blog` },
            { name: post.title, url: `${SITE_URL}/blog/${post.slug}` },
          ]),
        ]}
      />

      <section className="border-b border-gold-metallic/15">
        <div className="gc-container py-4 text-xs text-warmgrey">
          <Link href="/blog" className="hover:text-gold-tint">
            ← Blog
          </Link>
        </div>
      </section>

      <article className="py-8 lg:py-12">
        <div className="gc-container">
          <header className="mx-auto max-w-3xl text-center">
            {post.category && (
              <span className="gc-eyebrow">{post.category}</span>
            )}
            <h1 className="gc-heading-xl mt-3">{post.title}</h1>
            <p className="mt-4 text-[11px] uppercase tracking-luxe text-gold-tint">
              {publishedDate}
            </p>
            {post.excerpt && (
              <p className="gc-subhead mx-auto mt-5 max-w-2xl">{post.excerpt}</p>
            )}
          </header>

          {post.featured_image_url && (
            <div className="mx-auto mt-8 max-w-4xl">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
                <Image
                  src={post.featured_image_url}
                  alt={post.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 900px"
                  className="object-cover"
                />
              </div>
            </div>
          )}

          <div
            className="prose-blog mx-auto mt-10 max-w-3xl"
            // Content is rendered from markdown server-side; only admin authors,
            // RLS-protected, never user-input.
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="mx-auto mt-10 max-w-3xl border-t border-gold-metallic/20 pt-8 text-center">
            <p className="text-sm text-warmgrey">
              Ready for a valuation? Our specialists are one click away.
            </p>
            <Link href="/sell-gold" className="gc-btn-primary mt-4 inline-flex">
              Get a Valuation
            </Link>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-gold-metallic/15 py-8 lg:py-12">
          <div className="gc-container">
            <h2 className="font-display text-2xl font-semibold text-white">More from the blog</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="gc-card gc-card-gold-edge group block h-full overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1"
                  >
                    {p.category && (
                      <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
                        {p.category}
                      </span>
                    )}
                    <h3 className="mt-2 font-display text-base font-semibold text-white">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="mt-2 line-clamp-3 text-sm text-warmgrey">{p.excerpt}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <style>{`
        .prose-blog {
          color: #b8b8b8;
          font-size: 16px;
          line-height: 1.75;
        }
        .prose-blog > * + * {
          margin-top: 1rem;
        }
        .prose-blog h2 {
          font-family: var(--font-manrope);
          font-size: 1.75rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.01em;
          margin-top: 2.25rem;
          margin-bottom: 0.5rem;
        }
        .prose-blog h3 {
          font-family: var(--font-manrope);
          font-size: 1.25rem;
          font-weight: 600;
          color: #f3d675;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .prose-blog p {
          color: #cfcfcf;
        }
        .prose-blog strong {
          color: #ffffff;
          font-weight: 600;
        }
        .prose-blog em {
          color: #f3d675;
          font-style: italic;
        }
        .prose-blog ul, .prose-blog ol {
          padding-left: 1.5rem;
        }
        .prose-blog li {
          margin: 0.3rem 0;
        }
        .prose-blog ul li { list-style-type: disc; }
        .prose-blog ol li { list-style-type: decimal; }
        .prose-blog .prose-link,
        .prose-blog a {
          color: #d4af37;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .prose-blog a:hover {
          color: #ffd700;
        }
      `}</style>
    </>
  );
}
