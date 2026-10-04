import type { CropBox, Part, Product, ProductParts, Slot } from './types';

/** Side length in pixels of every official product shot. */
export const SHOT_SIZE = 1500;

const PART_SLOTS: Slot[] = ['cowl', 'bumper', 'tire', 'chassis'];

export interface CatalogValidation {
  /** Problems that make the curated data unusable. Empty when valid. */
  errors: string[];
  /** Codes of part-bearing products that have no part mapping yet. */
  unmapped: string[];
  /** Mapping entries with no variant image, as `<product code> <part id>`. */
  missingImages: string[];
}

function isValidCrop({ x, y, w, h }: CropBox): boolean {
  return (
    [x, y, w, h].every((n) => Number.isInteger(n) && n >= 0) &&
    w > 0 &&
    h > 0 &&
    x + w <= SHOT_SIZE &&
    y + h <= SHOT_SIZE
  );
}

/**
 * Checks the hand-curated parts data against the generated product catalog.
 * Unknown references and unusable variant images are errors; products without
 * a mapping and entries without a variant image are only reported.
 */
export function validateCatalog(
  products: Product[],
  parts: Part[],
  productParts: ProductParts[],
): CatalogValidation {
  const errors: string[] = [];
  const productsByCode = new Map(products.map((p) => [p.code, p]));
  const partsById = new Map<string, Part>();

  for (const part of parts) {
    if (partsById.has(part.id)) errors.push(`Duplicate part id "${part.id}"`);
    if (!part.id.startsWith(`${part.slot}:`)) {
      errors.push(`Part id "${part.id}" does not match its slot "${part.slot}"`);
    }
    partsById.set(part.id, part);
  }

  const mapped = new Set<string>();
  const missingImages: string[] = [];
  for (const entry of productParts) {
    const product = productsByCode.get(entry.productCode);
    if (!product) {
      errors.push(`Mapping references unknown product "${entry.productCode}"`);
      continue;
    }
    if (mapped.has(entry.productCode)) {
      errors.push(`Product "${entry.productCode}" is mapped more than once`);
    }
    mapped.add(entry.productCode);

    const perSlot = new Map<Slot, number>();
    for (const { partId, quantity, variant } of entry.parts) {
      const part = partsById.get(partId);
      if (!part) {
        errors.push(`${entry.productCode} references unknown part "${partId}"`);
        continue;
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        errors.push(`${entry.productCode} has invalid quantity ${quantity} for "${partId}"`);
        continue;
      }
      perSlot.set(part.slot, (perSlot.get(part.slot) ?? 0) + quantity);

      const image = variant?.image;
      const shots = product.images.length;
      if (!image) {
        missingImages.push(`${entry.productCode} ${partId}`);
      } else if (!Number.isInteger(image.shot) || image.shot < 1 || image.shot > shots) {
        errors.push(
          `${entry.productCode} "${partId}" variant uses shot ${image.shot} but the product has ${shots}`,
        );
      } else if (!isValidCrop(image.crop)) {
        errors.push(
          `${entry.productCode} "${partId}" variant crop is not inside the ${SHOT_SIZE}px shot`,
        );
      }
    }

    for (const slot of PART_SLOTS) {
      const expected = product.contents[slot] ?? 0;
      const actual = perSlot.get(slot) ?? 0;
      if (actual !== expected) {
        errors.push(
          `${entry.productCode} maps ${actual} ${slot} part(s) but the box contains ${expected}`,
        );
      }
    }
  }

  const unmapped = products
    .filter((p) => PART_SLOTS.some((slot) => (p.contents[slot] ?? 0) > 0) && !mapped.has(p.code))
    .map((p) => p.code);

  return { errors, unmapped, missingImages };
}
