import { Link } from 'react-router';
import type { Part, Product, ProductParts } from '@/lib/br/types';
import { SLOTS } from '@/lib/br/types';
import { findPartSources } from '@/lib/br/catalog';
import { SLOT_HEADINGS, SLOT_LABELS } from '@/lib/br/labels';

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
              return (
                <li key={part.id} className="br-part-card">
                  <span className="br-slot">{SLOT_LABELS[part.slot]}</span>
                  <h3 className="br-part-name">{part.nameEn}</h3>
                  {part.nameJa !== part.nameEn && (
                    <p className="br-name-ja" lang="ja">
                      {part.nameJa}
                    </p>
                  )}
                  {sources.length === 0 ? (
                    <p className="br-unknown">Source product unknown</p>
                  ) : (
                    <ul className="br-list br-source-list" aria-label={`${part.nameEn} found in`}>
                      {sources.map(({ product, quantity }) => (
                        <li key={product.code}>
                          <Link to={{ search: `?product=${product.code}` }}>
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
