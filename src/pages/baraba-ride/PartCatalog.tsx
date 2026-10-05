import { Link } from 'react-router';
import type { Part, Product, ProductParts } from '@/lib/br/types';
import { SLOTS } from '@/lib/br/types';
import { findPartSources, findPartVariants, variantShot } from '@/lib/br/catalog';
import { SLOT_HEADINGS, SLOT_LABELS } from '@/lib/br/labels';
import { brRoutes } from '@/lib/br/routes';
import { getVariantImageUrl } from '@/lib/imagekit';
import { CatalogImage } from './CatalogImage';

interface PartCatalogProps {
  parts: Part[];
  products: Product[];
  productParts: ProductParts[];
}

export function PartCatalog({ parts, products, productParts }: PartCatalogProps) {
  const groups = SLOTS.map((slot) => ({
    slot,
    parts: parts.filter((p) => p.slot === slot),
  })).filter((group) => group.parts.length > 0);

  return (
    <section aria-label="Parts">
      {groups.map(({ slot, parts: slotParts }) => (
        <section key={slot} className="br-slot-group" aria-labelledby={`br-slot-${slot}`}>
          <h2 id={`br-slot-${slot}`} className="br-slot-heading">
            {SLOT_HEADINGS[slot]}
          </h2>
          <ul className="br-part-grid">
            {slotParts.map((part) => {
              const sources = findPartSources(part.id, products, productParts);
              const variants = findPartVariants(part.id, products, productParts).map(
                ({ product, variant }) => {
                  const shot = variantShot(product, variant);
                  return {
                    product,
                    variant,
                    src: shot && getVariantImageUrl(shot.path, shot.crop),
                  };
                },
              );
              return (
                <li key={part.id} className="br-part-card">
                  <CatalogImage
                    className="br-part-image"
                    src={variants[0]?.src ?? null}
                    alt={part.nameEn}
                  />
                  <span className="br-slot">{SLOT_LABELS[part.slot]}</span>
                  <h3 className="br-part-name">{part.nameEn}</h3>
                  {part.nameJa !== part.nameEn && (
                    <p className="br-name-ja" lang="ja">
                      {part.nameJa}
                    </p>
                  )}
                  {variants.length > 0 && (
                    <ul className="br-variant-strip" aria-label={`${part.nameEn} variants`}>
                      {variants.map(({ product, variant, src }) => (
                        <li key={product.code}>
                          <Link to={brRoutes.product(product.code)} className="br-variant">
                            <CatalogImage
                              className="br-variant-image"
                              src={src}
                              alt={`${part.nameEn}, ${variant.color}`}
                            />
                            <span className="br-variant-color">{variant.color}</span>
                            <span className="br-code">{product.code}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sources.length === 0 ? (
                    <p className="br-unknown">Source product unknown</p>
                  ) : (
                    <ul className="br-list br-source-list" aria-label={`${part.nameEn} found in`}>
                      {sources.map(({ product, quantity }) => (
                        <li key={product.code}>
                          <Link to={brRoutes.product(product.code)}>
                            {product.code} {product.nameEn}
                          </Link>{' '}
                          × {quantity}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
