/**
 * The tail of the catalog run, after every page has parsed: validate the
 * curated parts data, publish the shots, and only then write the catalog.
 * Kept apart from the network and file system so the ordering can be tested.
 */
import { publishShots } from './images.ts';
import type { ImageStore } from './images.ts';
import { validateCatalog } from '../../src/lib/br/validate.ts';
import type { Accessory, Part, Product, ProductParts } from '../../src/lib/br/types.ts';

export interface CompleteCatalogOptions {
  products: Product[];
  /** Product code to the source URLs of its shots, in page order. */
  shots: Map<string, string[]>;
  parts: Part[];
  productParts: ProductParts[];
  accessories: Accessory[];
  /** Null when image CDN credentials are not configured. */
  store: ImageStore | null;
  fetchImage: (url: string) => Promise<Buffer>;
  reupload?: boolean;
  /** Persists the catalog. Called last, and only when every earlier step succeeded. */
  write: (products: Product[]) => Promise<void>;
  log?: (line: string) => void;
}

export async function completeCatalog({
  products,
  shots,
  parts,
  productParts,
  accessories,
  store,
  fetchImage,
  reupload = false,
  write,
  log = console.log,
}: CompleteCatalogOptions): Promise<void> {
  const { errors, unmapped, missingImages } = validateCatalog(
    products,
    parts,
    productParts,
    accessories,
  );
  if (errors.length > 0) {
    throw new Error(`Curated parts data is invalid:\n  ${errors.join('\n  ')}`);
  }

  await publishShots(store, shots, fetchImage, { reupload, log });
  await write(products);

  if (unmapped.length > 0) {
    log(`Products with no part mapping: ${unmapped.join(', ')}`);
  }
  if (missingImages.length > 0) {
    log(`Part variants with no image: ${missingImages.join(', ')}`);
  }
}
