'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_FILES = 12;
const MAX_BYTES_PER_FILE = 12 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export type SelectedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

export function MultiImageUploader({
  files,
  onChange,
}: {
  files: SelectedFile[];
  onChange: (next: SelectedFile[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Revoke object URLs when files are removed, to keep memory clean.
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
    // We deliberately only run cleanup on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const errors: string[] = [];
      const accepted: SelectedFile[] = [];

      for (const file of list) {
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: not an image`);
          continue;
        }
        if (file.size > MAX_BYTES_PER_FILE) {
          errors.push(`${file.name}: over 12MB`);
          continue;
        }
        accepted.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      const merged = [...files, ...accepted];
      if (merged.length > MAX_FILES) {
        errors.push(`You can upload up to ${MAX_FILES} photos. Some files were skipped.`);
      }
      onChange(merged.slice(0, MAX_FILES));
      setError(errors.join(' · ') || null);
    },
    [files, onChange],
  );

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    const next = files.filter((f) => {
      if (f.id === id) {
        URL.revokeObjectURL(f.previewUrl);
        return false;
      }
      return true;
    });
    onChange(next);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <label className="gc-label">Upload Photos</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={
          'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ' +
          (isDragging
            ? 'border-gold-bright bg-ink-900/80'
            : 'border-gold-metallic/40 bg-ink-900/40 hover:border-gold-metallic')
        }
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className="text-gold-metallic"
        >
          <path d="M12 16V4M6 10l6-6 6 6M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
        </svg>
        <p className="mt-3 text-sm text-white">Drag photos here or click to browse</p>
        <p className="mt-1 text-xs text-warmgrey">
          Upload clear photos from multiple angles, including hallmarks, stones, clasps, boxes and
          certificates where available. JPG · PNG · WEBP · HEIC.
        </p>
        <p className="mt-2 text-xs text-gold-tint">Up to {MAX_FILES} photos · 12MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          name="photos"
          onChange={onSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Upload photos"
        />
      </div>

      {error && (
        <p className="mt-2 text-xs text-amber-400" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {files.map((f) => (
            <li key={f.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gold-metallic/25 bg-ink-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previewUrl} alt={f.file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  removeFile(f.id);
                }}
                aria-label={`Remove ${f.file.name}`}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-950/80 text-warmgrey opacity-0 ring-1 ring-gold-metallic/40 transition group-hover:opacity-100 hover:text-gold-bright"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 1l8 8M9 1l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
