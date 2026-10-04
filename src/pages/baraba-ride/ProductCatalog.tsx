import { useState } from 'react';
import { Link } from 'react-router';
import type { Product, ProductType, Style } from '@/lib/br/types';
import { STYLE_LABELS, TYPE_LABELS, formatDate, formatPrice } from '@/lib/br/labels';
import { getProductThumbnailUrl } from '@/lib/imagekit';
import { CatalogImage } from './CatalogImage';

interface ProductCatalogProps {
  products: Product[];
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="br-filter-group" role="group" aria-label={label}>
      <span className="br-filter-label">{label}</span>
      <button
        className="br-filter-chip"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {(Object.keys(options) as T[]).map((option) => (
        <button
          key={option}
          className="br-filter-chip"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {options[option]}
        </button>
      ))}
    </div>
  );
}

export function ProductCatalog({ products }: ProductCatalogProps) {
  const [type, setType] = useState<ProductType | null>(null);
  const [style, setStyle] = useState<Style | null>(null);

  const visible = products.filter(
    (p) => (type === null || p.type === type) && (style === null || p.style === style),
  );

  return (
    <section aria-label="Products">
      <div className="br-filters">
        <FilterGroup label="Type" options={TYPE_LABELS} value={type} onChange={setType} />
        <FilterGroup label="Style" options={STYLE_LABELS} value={style} onChange={setStyle} />
      </div>

      {visible.length === 0 ? (
        <p className="br-empty">No products match these filters.</p>
      ) : (
        <ul className="br-product-grid">
          {visible.map((product) => (
            <li key={product.code}>
              <Link to={{ search: `?product=${product.code}` }} className="br-product-card">
                <CatalogImage
                  className="br-product-image"
                  src={product.images[0] ? getProductThumbnailUrl(product.images[0]) : null}
                  alt={`${product.code} ${product.nameEn}`}
                />
                <span className="br-code">{product.code}</span>
                <h2 className="br-product-name">{product.nameEn}</h2>
                <div className="br-badges">
                  <span className="br-badge">{TYPE_LABELS[product.type]}</span>
                  {product.style && (
                    <span className="br-badge br-badge-style">{STYLE_LABELS[product.style]}</span>
                  )}
                </div>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
