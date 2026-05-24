export default function AdminMediaPage() {
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Media</span>
        <h1 className="font-display text-4xl text-white mt-2">Media Library</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Upload, organise and copy URLs for images used across the public site.
        </p>
      </header>
      <div className="gc-card flex flex-col items-center gap-3 p-16 text-center">
        <p className="text-sm text-warmgrey">
          The media library is being prepared. Uploads will be available shortly.
        </p>
        <button type="button" className="gc-btn-primary">
          Upload Images
        </button>
      </div>
    </div>
  );
}
