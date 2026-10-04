import { Link } from 'react-router';
import type { ContentsKey, Product } from '@/lib/br/types';
import { variantShot } from '@/lib/br/catalog';
import type { ResolvedPart } from '@/lib/br/catalog';
import {
  CONTENTS_LABELS,
  SLOT_LABELS,
  STYLE_LABELS,
  TYPE_LABELS,
  formatDate,
  formatPrice,
} from '@/lib/br/labels';
import { getProductShotUrl, getProductThumbnailUrl, getVariantImageUrl } from '@/lib/imagekit';
import { CatalogImage } from './CatalogImage';

interface ProductDetailProps {
  product: Product;
  /** Named parts in the box, or null when the mapping has not been confirmed. */
  parts: ResolvedPart[] | null;
}

export function ProductDetail({ product, parts }: ProductDetailProps) {
  const contents = Object.entries(product.contents) as [ContentsKey, number][];

  return (
    <article className="br-detail" aria-labelledby="br-detail-title">
      <Link to={{ search: '' }} className="br-back-link">
        ← All products
      </Link>

      <header className="br-detail-header">
        <span className="br-code">{product.code}</span>
        <h2 id="br-detail-title" className="br-detail-title">
          {product.nameEn}
        </h2>
        <p className="br-name-ja" lang="ja">
          {product.nameJa}
        </p>
        <div className="br-badges">
          <span className="br-badge">{TYPE_LABELS[product.type]}</span>
          {product.style && (
            <span className="br-badge br-badge-style">{STYLE_LABELS[product.style]}</span>
          )}
        </div>
      </header>

      {product.images.length > 0 && (
        <ul className="br-gallery" aria-label="Product shots">
          {product.images.map((path, i) => {
            const alt = `${product.nameEn}, shot ${i + 1} of ${product.images.length}`;
            const image = (
              <CatalogImage className="br-shot" src={getProductThumbnailUrl(path)} alt={alt} />
            );
            const full = getProductShotUrl(path);
            return (
              <li key={path}>
                {full ? (
                  <a href={full} target="_blank" rel="noopener noreferrer">
                    {image}
                  </a>
                ) : (
                  image
                )}
              </li>
            );
          })}
        </ul>
      )}

      <dl className="br-facts">
        <div>
          <dt>Price</dt>
          <dd>{formatPrice(product.price)}</dd>
        </div>
        <div>
          <dt>Released</dt>
          <dd>{formatDate(product.releaseDate)}</dd>
        </div>
      </dl>

      <section aria-labelledby="br-contents-title">
        <h3 id="br-contents-title" className="br-section-title">
          In the box
        </h3>
        <ul className="br-list">
          {contents.map(([key, count]) => (
            <li key={key}>
              {CONTENTS_LABELS[key]} × {count}
            </li>
          ))}
        </ul>
      </section>

      {parts && parts.length > 0 && (
        <section aria-labelledby="br-parts-title">
          <h3 id="br-parts-title" className="br-section-title">
            Named parts
          </h3>
          <ul className="br-list">
            {parts.map(({ part, quantity, variant }) => {
              const shot = variantShot(product, variant);
              return (
                <li key={part.id} className={variant ? 'br-named-part' : undefined}>
                  {variant && (
                    <CatalogImage
                      className="br-variant-image"
                      src={shot && getVariantImageUrl(shot.path, shot.crop)}
                      alt={`${part.nameEn}, ${variant.color}`}
                    />
                  )}
                  <span>
                    <span className="br-slot">{SLOT_LABELS[part.slot]}</span> {part.nameEn} ×{' '}
                    {quantity}
                    {variant && <span className="br-variant-color"> · {variant.color}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="br-source">
        Official product page ↗
      </a>
      {product.manualUrl && (
        <a href={product.manualUrl} target="_blank" rel="noopener noreferrer" className="br-source">
          Instruction manual ↗
        </a>
      )}
    </article>
  );
}
