'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@/types/database';
import { deleteBlogPost, upsertBlogPost } from '@/lib/actions/blog';
import { AdminImageUpload } from '@/components/admin/AdminImageUpload';

type Mode = 'create' | 'edit';

const CATEGORY_SUGGESTIONS = [
  'Selling Gold',
  'Selling Jewellery',
  'Selling Watches',
  'Selling Handbags',
  'Market Insights',
  'How It Works',
  'Guides',
];

export function BlogEditor({ mode, initial }: { mode: Mode; initial?: BlogPost }) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    featured_image_url: initial?.featured_image_url ?? null,
    category: initial?.category ?? '',
    published: initial?.published ?? false,
    seo_title: initial?.seo_title ?? '',
    seo_description: initial?.seo_description ?? '',
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const save = (overrides: Partial<typeof draft> = {}) => {
    setFeedback(null);
    const payload = { ...draft, ...overrides };
    startTransition(async () => {
      const result = await upsertBlogPost({
        id: initial?.id,
        ...payload,
      });
      if (!result.ok) {
        setFeedback({ kind: 'err', text: result.error });
        return;
      }
      setFeedback({ kind: 'ok', text: mode === 'create' ? 'Article created' : 'Article saved' });
      if (mode === 'create' && result.data) {
        router.push(`/admin/blog/${result.data.id}`);
      }
    });
  };

  const remove = () => {
    if (!initial || !confirm('Delete this article?')) return;
    startTransition(async () => {
      const result = await deleteBlogPost(initial.id);
      if (result.ok) router.push('/admin/blog');
      else setFeedback({ kind: 'err', text: result.error });
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="grid gap-6 lg:grid-cols-[1.6fr,1fr]"
    >
      <div className="space-y-6">
        <section className="gc-card p-6">
          <label className="gc-label">Title</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="gc-input text-lg"
            placeholder="How much is 22ct gold worth in the UK today?"
            required
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="gc-label">URL slug</label>
              <input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                className="gc-input"
                placeholder="leave blank to auto-generate"
              />
              <p className="mt-1 text-[10px] text-warmgrey">
                Becomes <span className="text-gold-tint">/blog/your-slug</span>. Auto-derived from
                title if left blank.
              </p>
            </div>
            <div>
              <label className="gc-label">Category</label>
              <input
                list="blog-categories"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="gc-input"
                placeholder="e.g. Selling Gold"
              />
              <datalist id="blog-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
        </section>

        <section className="gc-card p-6">
          <label className="gc-label">Excerpt</label>
          <textarea
            value={draft.excerpt}
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
            rows={2}
            className="gc-input"
            placeholder="One or two sentences shown on the blog listing and as the meta description fallback."
          />
        </section>

        <section className="gc-card p-6">
          <div className="flex items-center justify-between gap-2">
            <label className="gc-label mb-0">Content (Markdown)</label>
            <span className="text-[10px] text-warmgrey">
              Supports <code className="text-gold-tint">## H2</code>{' '}
              <code className="text-gold-tint">**bold**</code>{' '}
              <code className="text-gold-tint">*italic*</code>{' '}
              <code className="text-gold-tint">[link](url)</code>{' '}
              <code className="text-gold-tint">- list</code>
            </span>
          </div>
          <textarea
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            rows={22}
            required
            className="gc-input font-mono text-sm leading-relaxed"
            placeholder={`## What 22ct gold actually is\n\n22ct gold means 22 parts pure gold out of 24...\n\n**Bold for emphasis.** *Italic for nuance.*\n\n- Bullet one\n- Bullet two\n\n[Open the calculator](/gold-calculator)`}
          />
        </section>

        <section className="gc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">SEO</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="gc-label">SEO title (optional)</label>
              <input
                value={draft.seo_title}
                onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })}
                className="gc-input"
                placeholder="Defaults to the article title"
              />
            </div>
            <div>
              <label className="gc-label">SEO description (optional)</label>
              <textarea
                value={draft.seo_description}
                onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })}
                rows={2}
                className="gc-input"
                placeholder="Defaults to the excerpt. ~155 chars is ideal."
              />
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="gc-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">Publishing</h2>
          <label className="mt-4 flex items-start gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              className="mt-1 h-4 w-4 accent-gold-metallic"
            />
            <span>
              <span className="font-medium">Published</span>
              <span className="block text-xs text-warmgrey">
                When ticked, the article goes live at <span className="text-gold-tint">/blog/{draft.slug || 'your-slug'}</span> and is included in the sitemap.
              </span>
            </span>
          </label>

          <div className="mt-5 space-y-2">
            <button
              type="submit"
              disabled={pending || !draft.title.trim() || !draft.content.trim()}
              className="gc-btn-primary w-full disabled:opacity-50"
            >
              {pending ? 'Saving…' : mode === 'create' ? 'Create article' : 'Save changes'}
            </button>
            {!draft.published && mode === 'edit' && (
              <button
                type="button"
                onClick={() => save({ published: true })}
                disabled={pending}
                className="gc-btn-secondary w-full"
              >
                Save & publish
              </button>
            )}
          </div>

          {feedback && (
            <p
              className={
                'mt-3 text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')
              }
            >
              {feedback.text}
            </p>
          )}
        </section>

        <section className="gc-card p-6">
          <AdminImageUpload
            label="Featured image"
            value={draft.featured_image_url}
            onChange={(url) => setDraft({ ...draft, featured_image_url: url })}
          />
          <p className="mt-2 text-[10px] text-warmgrey">
            Used as the social-share image (Open Graph) and at the top of the article.
          </p>
        </section>

        {mode === 'edit' && initial && (
          <section className="gc-card p-6">
            <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">Danger</h2>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="mt-3 text-xs uppercase tracking-luxe text-amber-400 hover:text-amber-200"
            >
              Delete this article
            </button>
          </section>
        )}
      </aside>
    </form>
  );
}
