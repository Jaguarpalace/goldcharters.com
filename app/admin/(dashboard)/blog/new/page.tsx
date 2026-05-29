import { BlogEditor } from '../BlogEditor';

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">New article</span>
        <h1 className="font-display text-2xl text-white mt-1">Write a new article</h1>
        <p className="mt-2 text-sm text-warmgrey">
          Save as draft first, then preview and publish when ready.
        </p>
      </header>
      <BlogEditor mode="create" />
    </div>
  );
}
