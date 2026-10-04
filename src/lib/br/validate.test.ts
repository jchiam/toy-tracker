import { describe, it, expect } from 'vitest';
import { validateCatalog } from './validate';
import { PARTS, PRODUCTS, PRODUCT_PARTS } from './catalog';
import type { Part, Product, ProductParts } from './types';

const product = (code: string, contents: Product['contents']): Product => ({
  code,
  nameEn: code,
  nameJa: code,
  type: 'starter-set',
  style: 'upper',
  price: { amount: 3300, currency: 'JPY', taxIncluded: true },
  releaseDate: '2026-09-19',
  contents,
  sourceId: '01_00000',
  sourceUrl: 'https://example.com/',
});

const products = [
  product('BR-01', { cowl: 1, tire: 4, sticker: 1 }),
  product('BR-10', { body: 1 }),
];
const parts: Part[] = [
  { id: 'cowl:storm-falcon', slot: 'cowl', nameEn: 'Storm Falcon', nameJa: 'ストームファルコン' },
  { id: 'tire:h36', slot: 'tire', nameEn: 'H36', nameJa: 'H36' },
];
const mapping: ProductParts[] = [
  {
    productCode: 'BR-01',
    parts: [
      { partId: 'cowl:storm-falcon', quantity: 1 },
      { partId: 'tire:h36', quantity: 4 },
    ],
    source: 'test',
  },
];

describe('validateCatalog', () => {
  it('accepts a consistent catalog', () => {
    expect(validateCatalog(products, parts, mapping)).toEqual({ errors: [], unmapped: [] });
  });

  it('rejects a mapping for an unknown product code, naming it', () => {
    const { errors } = validateCatalog(products, parts, [{ ...mapping[0], productCode: 'BR-99' }]);
    expect(errors).toEqual(['Mapping references unknown product "BR-99"']);
  });

  it('rejects an unknown part id, naming it', () => {
    const bad = [{ ...mapping[0], parts: [{ partId: 'cowl:ghost', quantity: 1 }] }];
    const { errors } = validateCatalog(products, parts, bad);
    expect(errors).toContain('BR-01 references unknown part "cowl:ghost"');
  });

  it('rejects quantities that disagree with the box contents', () => {
    const bad = [
      {
        ...mapping[0],
        parts: [
          { partId: 'cowl:storm-falcon', quantity: 1 },
          { partId: 'tire:h36', quantity: 2 },
        ],
      },
    ];
    const { errors } = validateCatalog(products, parts, bad);
    expect(errors).toEqual(['BR-01 maps 2 tire part(s) but the box contains 4']);
  });

  it('rejects duplicate part ids and ids that do not match their slot', () => {
    const { errors } = validateCatalog(
      products,
      [...parts, parts[0], { ...parts[1], id: 'bumper:h36' }],
      mapping,
    );
    expect(errors).toContain('Duplicate part id "cowl:storm-falcon"');
    expect(errors).toContain('Part id "bumper:h36" does not match its slot "tire"');
  });

  it('reports part-bearing products with no mapping without failing', () => {
    expect(validateCatalog(products, parts, [])).toEqual({ errors: [], unmapped: ['BR-01'] });
  });

  it('does not report products that contain no parts', () => {
    expect(validateCatalog(products, parts, mapping).unmapped).not.toContain('BR-10');
  });
});

describe('committed catalog data', () => {
  it('is valid', () => {
    expect(validateCatalog(PRODUCTS, PARTS, PRODUCT_PARTS).errors).toEqual([]);
  });

  it('contains one record per product code, including the launch lineup', () => {
    const codes = PRODUCTS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (let n = 1; n <= 10; n++) {
      expect(codes).toContain(`BR-${String(n).padStart(2, '0')}`);
    }
  });
});
