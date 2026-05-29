'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import type { UploadedImage } from '@/types/database';
import {
  deleteMediaFile,
  updateMediaAltText,
  uploadPublicImage,
} from '@/lib/actions/media';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/svg+xml';
const MAX_BYTES = 8 * 1024 * 1024;

export function MediaBoard({ initialFiles }: { initialFiles: UploadedImage[] }) {
  const [files, setFiles] = useState<UploadedImage[]>(initialFiles);
  const [search, setSearch] = useState('');
  const [uploading, startUpload] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => {
      const haystack = `${f.image_url} ${f.alt_text ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [files, search]);

  const upload = (incoming: FileList | File[]) => {
    setFeedback(null);
    const list = Array.from(incoming);
    if (list.length === 0) return;

    // Pre-flight client validation — saves a round-trip on obvious mistakes.
    const tooBig = list.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length > 0) {
      setFeedback({
        ok: false,
        text: `${tooBig.length} file${tooBig.length === 1 ? '' : 's'} skipped - over 8MB.`,
      });
    }
    const okFiles = list.filter((f) => f.size <= MAX_BYTES);
    if (okFiles.length === 0) return;

    const fd = new FormData();
    for (const f of okFiles) fd.append('files', f);

    startUpload(async () => {
      const result = await uploadPublicImage(fd);
      if (result.ok && result.data) {
        setFiles((prev) => [...result.data!.uploaded, ...prev]);
        const note =
          result.data.errors.length > 0
            ? `Uploaded ${result.data.uploaded.length}, ${result.data.errors.length} skipped.`
            : `Uploaded ${result.data.uploaded.length}.`;
        setFeedback({ ok: true, text: note });
        setTimeout(() => setFeedback(null), 2500);
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    upload(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const patchFile = (id: string, patch: Partial<UploadedImage>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold-metallic/20 bg-ink-900/60 px-3 py-2">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by filename or alt text…"
            className="w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-warmgrey/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <span className="text-[11px] uppercase tracking-luxe text-warmgrey">
          {filtered.length} of {files.length}
        </span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold-metallic bg-gold-metallic/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-wait disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Drop zone - compact strip, doubles as click target */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={
          'relative flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-[12px] transition ' +
          (isDragging
            ? 'border-gold-bright bg-gold-metallic/10 text-gold-bright'
            : 'border-gold-metallic/30 bg-ink-900/40 text-warmgrey hover:border-gold-metallic/60 hover:text-gold-tint')
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 16V4M6 10l6-6 6 6M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
        </svg>
        <span>
          <strong className="text-gold-tint">Drag images here</strong> or click to browse - JPG · PNG · WEBP · SVG · 8MB max
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onPick}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Upload images"
        />
      </div>

      {feedback && (
        <p
          className={
            'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')
          }
          role={feedback.ok ? undefined : 'alert'}
        >
          {feedback.text}
        </p>
      )}

      {/* Grid */}
      {files.length === 0 ? (
        <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
          No media yet. Upload your first image above.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
          Nothing matches that search.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((f) => (
            <MediaTile
              key={f.id}
              file={f}
              onDeleted={() => removeFile(f.id)}
              onPatched={(patch) => patchFile(f.id, patch)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------- Tile ----------------------------------- */

function MediaTile({
  file,
  onDeleted,
  onPatched,
}: {
  file: UploadedImage;
  onDeleted: () => void;
  onPatched: (patch: Partial<UploadedImage>) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [editingAlt, setEditingAlt] = useState(false);
  const [altDraft, setAltDraft] = useState(file.alt_text ?? '');
  const [copied, setCopied] = useState(false);

  const filename = useMemo(() => {
    try {
      return decodeURIComponent(file.image_url.split('/').pop() ?? '').replace(/^\d+-[a-z0-9]+-/i, '');
    } catch {
      return file.image_url.split('/').pop() ?? '';
    }
  }, [file.image_url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(file.image_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select-and-copy fails silently if the browser denies it.
    }
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteMediaFile(file.id);
      if (result.ok) onDeleted();
      else {
        // eslint-disable-next-line no-alert
        alert(result.error);
        setConfirming(false);
      }
    });
  };

  const saveAlt = () => {
    startTransition(async () => {
      const result = await updateMediaAltText(file.id, altDraft);
      if (result.ok) {
        onPatched({ alt_text: altDraft.trim() || null });
        setEditingAlt(false);
      } else {
        // eslint-disable-next-line no-alert
        alert(result.error);
      }
    });
  };

  return (
    <li className="group relative overflow-hidden rounded-lg border border-gold-metallic/15 bg-ink-900/60">
      <div className="relative aspect-square bg-ink-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.image_url}
          alt={file.alt_text ?? filename}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Hover overlay with actions */}
        <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={copy}
            disabled={pending}
            title="Copy public URL"
            className="rounded border border-gold-metallic/40 bg-ink-900/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint backdrop-blur transition hover:bg-ink-800 hover:text-gold-bright"
          >
            {copied ? 'Copied ✓' : 'Copy URL'}
          </button>
          {confirming ? (
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="rounded border border-red-500/50 bg-red-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 backdrop-blur hover:bg-red-500/25"
              >
                {pending ? '…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded border border-gold-metallic/30 bg-ink-900/85 px-2 py-1 text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
              >
                ✕
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={pending}
              title="Delete"
              className="rounded border border-gold-metallic/30 bg-ink-900/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-luxe text-warmgrey backdrop-blur hover:text-red-300"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="p-2">
        <p className="truncate text-[11px] text-white" title={filename}>
          {filename}
        </p>
        {editingAlt ? (
          <div className="mt-1 flex items-center gap-1">
            <input
              type="text"
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              placeholder="Alt text…"
              className="w-full rounded border border-gold-metallic/20 bg-ink-950 px-1.5 py-1 text-[10px] text-white focus:border-gold-metallic focus:outline-none"
              autoFocus
              onBlur={saveAlt}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveAlt();
                if (e.key === 'Escape') {
                  setAltDraft(file.alt_text ?? '');
                  setEditingAlt(false);
                }
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingAlt(true)}
            className="mt-0.5 block w-full truncate text-left text-[10px] text-warmgrey hover:text-gold-tint"
            title="Click to edit alt text"
          >
            {file.alt_text || <span className="italic text-warmgrey/60">No alt text</span>}
          </button>
        )}
      </div>
    </li>
  );
}
