/**
 * Publishes catalog images to the ImageKit CDN. Ported from game-tracker's
 * `scripts/lib/pipeline.mjs`, with one difference: failures throw, because this
 * pipeline writes nothing unless every step succeeds.
 */
import ImageKit, { toFile } from '@imagekit/nodejs';
import { toImageKitPath } from '../../src/lib/imagekit-path.ts';
import { productImagePath } from './catalog.ts';

/** Where catalog images are stored. Addressed by asset path (`/assets/...`). */
export interface ImageStore {
  exists(assetPath: string): Promise<boolean>;
  upload(assetPath: string, data: Buffer): Promise<void>;
}

/** Splits an asset path into the ImageKit folder and file name it maps to. */
export function toImageKitLocation(assetPath: string): { folder: string; fileName: string } {
  const mapped = toImageKitPath(assetPath);
  const cut = mapped.lastIndexOf('/');
  return { folder: mapped.slice(0, cut), fileName: mapped.slice(cut + 1) };
}

/**
 * Builds the ImageKit store, or returns null when no private key is configured.
 * Only `IMAGEKIT_PRIVATE_KEY` is read: a `VITE_`-prefixed key would be exposed
 * to client code by Vite, so that spelling is deliberately not accepted.
 */
export function createImageStore(
  env: Record<string, string | undefined> = process.env,
): ImageStore | null {
  const privateKey = env.IMAGEKIT_PRIVATE_KEY?.trim();
  if (!privateKey) return null;

  const client = new ImageKit({ privateKey });
  // One listing per folder: every shot of a product shares a folder.
  const listings = new Map<string, Promise<Set<string>>>();

  const listFolder = (folder: string) => {
    let listing = listings.get(folder);
    if (!listing) {
      listing = client.assets
        .list({ path: folder, type: 'file', limit: 100 })
        .then((assets) => new Set(assets.flatMap((a) => ('name' in a && a.name ? [a.name] : []))));
      listings.set(folder, listing);
    }
    return listing;
  };

  return {
    async exists(assetPath) {
      const { folder, fileName } = toImageKitLocation(assetPath);
      return (await listFolder(folder)).has(fileName);
    },
    async upload(assetPath, data) {
      const { folder, fileName } = toImageKitLocation(assetPath);
      await client.files.upload({
        file: await toFile(data, fileName, { type: 'image/jpeg' }),
        fileName,
        folder,
        useUniqueFileName: false,
      });
    },
  };
}

/**
 * Skips an asset already in the store (unless `reupload` is set); otherwise
 * fetches it and uploads it. The fetch is only made when an upload will follow.
 */
export async function ensureAsset(
  store: ImageStore,
  assetPath: string,
  fetchBuffer: () => Promise<Buffer>,
  { reupload = false }: { reupload?: boolean } = {},
): Promise<'skipped' | 'uploaded'> {
  if (!reupload && (await store.exists(assetPath))) return 'skipped';
  await store.upload(assetPath, await fetchBuffer());
  return 'uploaded';
}

/**
 * Ensures every shot of every product is in the store. `shots` maps a product
 * code to its source URLs in page order. Without a store, uploads are skipped
 * with a notice. A failed download or upload throws naming the product and
 * shot, so the caller can stop before writing any output.
 */
export async function publishShots(
  store: ImageStore | null,
  shots: Map<string, string[]>,
  fetchImage: (url: string) => Promise<Buffer>,
  {
    reupload = false,
    log = console.log,
  }: { reupload?: boolean; log?: (line: string) => void } = {},
): Promise<void> {
  if (!store) {
    log('Image uploads skipped (IMAGEKIT_PRIVATE_KEY not set)');
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  for (const [code, urls] of shots) {
    for (const [i, url] of urls.entries()) {
      const shot = i + 1;
      try {
        const result = await ensureAsset(
          store,
          productImagePath(code, shot),
          () => fetchImage(url),
          { reupload },
        );
        if (result === 'uploaded') {
          uploaded++;
          log(`  ${code} shot ${shot} uploaded`);
        } else {
          skipped++;
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${code} shot ${shot}: ${detail}`, { cause: error });
      }
    }
  }
  log(`Shots: ${uploaded} uploaded, ${skipped} already on the image CDN`);
}
