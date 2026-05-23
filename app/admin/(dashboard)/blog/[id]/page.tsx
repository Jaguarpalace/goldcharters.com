import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPostById } from '@/lib/queries/blog';
import { BlogEditor } from '../BlogEditor';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({ params }: { params: { id: string } }) {
  const post = await getBlogPostById(params.id);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">Edit article</span>
          <h1 className="font-display text-3xl text-white mt-1 sm:text-4xl">{post.title}</h1>
          <p className="mt-1 text-xs text-warmgrey">
            /blog/{post.slug} · {post.published ? 'Live' : 'Draft'}
          </p>
        </div>
        {post.published && (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noreferrer"
            className="gc-btn-secondary text-xs"
          >
            View live →
          </Link>
        )}
      </header>
      <BlogEditor mode="edit" initial={post} />
    </div>
  );
}
