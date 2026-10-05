import { PARTS, PRODUCTS, findPartVariants, variantShot } from '@/lib/br/catalog';
import { getVariantImageUrl } from '@/lib/imagekit';
import type { Instance } from '@/lib/br/inventory-types';

export interface PartDisplay {
  /** Part name, or the raw id when the catalog no longer knows it. */
  name: string;
  /** `Red · BR-01` for a named variant, else `Any variant`. */
  variantLabel: string;
  /** Variant image, or the part's first variant image when none is named. */
  imageUrl: string | null;
}

/** How a part and optional variant read on screen. */
export function describePart(itemId: string, variantProductCode: string | null): PartDisplay {
  const part = PARTS.find((p) => p.id === itemId);
  const variants = findPartVariants(itemId);
  const named = variants.find((v) => v.product.code === variantProductCode);
  const pictured = named ?? variants[0];
  const shot = pictured && variantShot(pictured.product, pictured.variant);
  return {
    name: part?.nameEn ?? itemId,
    variantLabel: variantProductCode
      ? named
        ? `${named.variant.color} · ${variantProductCode}`
        : variantProductCode
      : 'Any variant',
    imageUrl: shot ? getVariantImageUrl(shot.path, shot.crop) : null,
  };
}

/** The product an instance came from, as `BR-01 Storm Falcon`, or `Unknown source`. */
export function instanceSourceLabel(instance: Instance): string {
  if (!instance.variantProductCode) return 'Unknown source';
  const product = PRODUCTS.find((p) => p.code === instance.variantProductCode);
  return product ? `${product.code} ${product.nameEn}` : instance.variantProductCode;
}

/** One instance as a choice: its part, source and note. */
export function instanceChoiceLabel(instance: Instance): string {
  const { name } = describePart(instance.itemId, instance.variantProductCode);
  const note = instance.note ? ` (${instance.note})` : '';
  return `${name}, ${instanceSourceLabel(instance)}${note}`;
}
