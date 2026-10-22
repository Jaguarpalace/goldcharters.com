/**
 * Shrinks a photo in the browser before it is sent to the server.
 *
 * Why: the site runs on Vercel, where one request to a server action can
 * carry at most about 4.5 MB in total. A modern phone photo is 2 to 6 MB,
 * so two or three originals already fail with "FUNCTION_PAYLOAD_TOO_LARGE",
 * which the browser showed customers as a bare "client-side error".
 *
 * A photo resized to 1600 px on its long edge and saved as JPEG at 82% is
 * typically 200 to 500 KB and still shows hallmarks and stones clearly, so
 * a normal enquiry with several photos fits in one request.
 *
 * Returns the original file untouched when the browser cannot decode it
 * (HEIC on Windows and Android), when the photo is already small, or when
 * anything goes wrong; the caller then applies the size guard.
 */

export const DOWNSCALE_MAX_EDGE = 1600;
export const DOWNSCALE_QUALITY = 0.82;
/** Below this size there is nothing worth shrinking. */
const SKIP_UNDER_BYTES = 350 * 1024;

export async function downscaleImage(
  file: File,
  maxEdge: number = DOWNSCALE_MAX_EDGE,
  quality: number = DOWNSCALE_QUALITY,
): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  if (file.size <= SKIP_UNDER_BYTES && maxEdge >= DOWNSCALE_MAX_EDGE) return file;
  try {
    // 'from-image' applies the EXIF rotation, so a portrait phone photo
    // stays upright after it is redrawn.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() =>
      createImageBitmap(file),
    );
    const longEdge = Math.max(bitmap.width, bitmap.height);
    const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    // JPEG has no transparency: paint white behind PNG cut-outs first.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob || blob.size === 0) return file;
    // Keep the original if shrinking did not help (tiny or already-compressed image).
    if (blob.size >= file.size && scale === 1) return file;

    const name = file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}

/** Sum of the sizes that will travel in one request. */
export function totalBytes(files: ReadonlyArray<{ size: number }>): number {
  return files.reduce((sum, f) => sum + f.size, 0);
}

/**
 * What one server-action request may carry. Vercel's hard limit is 4.5 MB
 * including the form fields, so stop a little short of it.
 */
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

export function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
