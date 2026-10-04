import { toImageKitPath } from './imagekit-path';
import type { CropBox } from './br/types';

// Read per call rather than at module load, so tests can stub the variable.
function endpoint(): string {
  return (import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT ?? '').trim().replace(/\/+$/, '');
}

// No local copy of any catalog image exists, so there is nothing to fall back
// to: an unconfigured endpoint resolves to null and callers show a placeholder.
function resolve(assetPath: string, transform: string): string | null {
  const base = endpoint();
  return base ? `${base}/tr:${transform}${toImageKitPath(assetPath)}` : null;
}

/** Product list card: capped at 480px wide, never upscaled. */
export function getProductThumbnailUrl(assetPath: string): string | null {
  return resolve(assetPath, 'w-480,c-at_max');
}

/** Full product shot, as opened from the detail gallery. */
export function getProductShotUrl(assetPath: string): string | null {
  return resolve(assetPath, 'w-1200,c-at_max');
}

/**
 * A part variant: the crop box extracted from a product shot, cut out of the
 * breakdown panel behind it, then capped at 256px on white to match the product
 * shots. Background removal is a metered ImageKit extension; each distinct URL
 * is generated once and cached, and takes several seconds the first time.
 */
export function getVariantImageUrl(assetPath: string, crop: CropBox): string | null {
  const extract = `x-${crop.x},y-${crop.y},w-${crop.w},h-${crop.h},cm-extract`;
  return resolve(assetPath, `${extract}:e-bgremove:w-256,c-at_max,bg-FFFFFF`);
}
