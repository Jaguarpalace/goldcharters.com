'use client';

import { useState, useTransition } from 'react';
import { uploadPublicImage } from '@/lib/actions/media';

/**
 * Drop-in image upload — handles file selection, server upload to the
 * public-media bucket, and reports the resulting public URL back via onChange.
 *
 * Used inline inside admin forms — the parent stores the URL string and
 * submits it as part of its own form.
 */
export function AdminImageUpload({
  label = 'Image',
  value,
  onChange,
}: {
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setError(null);
    startTransition(async () => {
      const result = await uploadPublicImage(formData);
      if (result.ok && result.data) {
        onChange(result.data.url);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <label className="gc-label">{label}</label>
      <div className="flex items-start gap-4">
        <div
          className="relative h-28 w-28 flex-none overflow-hidden rounded-lg border border-gold-metallic/25 bg-ink-900"
          aria-live="polite"
        >
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-luxe text-warmgrey">
              no image
            </div>
          )}
          {pending && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70 text-xs text-gold-tint">
              Uploading…
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
            disabled={pending}
            className="block w-full cursor-pointer rounded-lg border border-gold-metallic/25 bg-ink-900 px-3 py-2 text-sm text-warmgrey file:mr-3 file:rounded file:border-0 file:bg-gold-gradient file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-950"
          />
          <input
            type="url"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="…or paste an image URL"
            className="gc-input text-xs"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-amber-300"
            >
              Remove image
            </button>
          )}
          {error && <p className="text-xs text-amber-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
