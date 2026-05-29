'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MAX_FILES = 12;
const MAX_BYTES_PER_FILE = 12 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export type PhotoStatus = 'processing' | 'ready' | 'error';

export type SelectedFile = {
  id: string;
  file: File;
  previewUrl: string;
  /**
   * 'processing' until the file's bytes have been read into memory, then
   * 'ready'. Selecting a photo from a phone or a cloud-synced library (iCloud /
   * Google Photos) can hand us a placeholder whose bytes aren't on the device
   * yet; reading them up front forces that download now, so the booking submit
   * never races a half-available file. 'error' if the read fails.
   */
  status: PhotoStatus;
};

export function MultiImageUploader({
  files,
  onChange,
  max = DEFAULT_MAX_FILES,
}: {
  files: SelectedFile[];
  onChange: React.Dispatch<React.SetStateAction<SelectedFile[]>>;
  /** Maximum number of photos allowed. Defaults to 12. */
  max?: number;
}) {
  const MAX_FILES = max;
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

  // Pull the file's bytes into memory and swap in a fully in-memory File once
  // they're available. Status updates go through a functional setState so
  // several reads finishing out of order can't clobber each other.
  const materialize = useCallback(
    (id: string, source: File) => {
      source
        .arrayBuffer()
        .then((buffer) => {
          const inMemory = new File([buffer], source.name, {
            type: source.type,
            lastModified: source.lastModified,
          });
          onChange((prev) =>
            prev.map((f) => (f.id === id ? { ...f, file: inMemory, status: 'ready' } : f)),
          );
        })
        .catch((err) => {
          console.error('[photo:materialize]', err);
          onChange((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'error' } : f)));
        });
    },
    [onChange],
  );

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
          status: 'processing',
        });
      }

      const merged = [...files, ...accepted];
      if (merged.length > MAX_FILES) {
        errors.push(`You can upload up to ${MAX_FILES} photos. Some files were skipped.`);
      }
      const kept = merged.slice(0, MAX_FILES);
      onChange(kept);
      setError(errors.join(' · ') || null);

      // Only materialise the files that actually made it past the cap.
      const keptIds = new Set(kept.map((f) => f.id));
      for (const f of accepted) {
        if (keptIds.has(f.id)) materialize(f.id, f.file);
      }
    },
    [files, onChange, MAX_FILES, materialize],
  );

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    onChange((prev) =>
      prev.filter((f) => {
        if (f.id === id) {
          URL.revokeObjectURL(f.previewUrl);
          return false;
        }
        return true;
      }),
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <label className="gc-label">Upload Photos</label>
      {/*
        The transparent <input type="file" /> below is positioned absolutely over
        the whole dropzone - clicking anywhere on the zone clicks the input
        natively. Previously we ALSO had onClick={() => inputRef.current?.click()}
        on this wrapper, which fired a second programmatic click and reopened
        the picker after every selection. Removed.
      */}
      <div
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

              {f.status === 'processing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-ink-950/70 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
                  <svg className="h-5 w-5 animate-spin text-gold-metallic" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Loading
                </div>
              )}
              {f.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/80 px-1 text-center text-[10px] font-semibold uppercase tracking-luxe text-amber-400">
                  Couldn’t read
                </div>
              )}

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
