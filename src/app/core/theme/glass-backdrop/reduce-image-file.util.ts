/**
 * The background image is only ever shown as a ~192 px blurred backdrop, so it
 * is stored small: at most 256 px on the long edge, re-encoded to at most
 * 24 KB, as a data URL in the existing (synced) misc image fields. A full-size
 * photo would bloat every sync op, snapshot and backup for no visible gain.
 */
export const MAX_STORED_IMAGE_EDGE = 256;
export const MAX_STORED_IMAGE_LENGTH = 24 * 1024;
/** Decoding is skipped above this, to protect memory on phones. */
export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
/** Raster formats only: SVG is scriptable. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
] as const;

const ATTEMPTS: readonly { edge: number; quality: number }[] = [
  { edge: MAX_STORED_IMAGE_EDGE, quality: 0.8 },
  { edge: MAX_STORED_IMAGE_EDGE, quality: 0.6 },
  { edge: 192, quality: 0.6 },
  { edge: 128, quality: 0.5 },
];

export type ReduceImageErrorReason = 'type' | 'size' | 'decode';

export class ReduceImageError extends Error {
  constructor(readonly reason: ReduceImageErrorReason) {
    super(`Image could not be reduced: ${reason}`);
    this.name = 'ReduceImageError';
  }
}

const encode = (
  source: CanvasImageSource & { width: number; height: number },
  edge: number,
  quality: number,
): string => {
  const scale = Math.min(1, edge / Math.max(source.width, source.height, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ReduceImageError('decode');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  // No WebP encoder (Safari): JPEG has no alpha, so flatten onto white.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

export const reduceImageFile = async (file: File): Promise<string> => {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ReduceImageError('type');
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ReduceImageError('size');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ReduceImageError('decode');
  }
  try {
    for (const { edge, quality } of ATTEMPTS) {
      const dataUrl = encode(bitmap, edge, quality);
      if (dataUrl.length <= MAX_STORED_IMAGE_LENGTH) {
        return dataUrl;
      }
    }
  } finally {
    bitmap.close();
  }
  throw new ReduceImageError('size');
};
