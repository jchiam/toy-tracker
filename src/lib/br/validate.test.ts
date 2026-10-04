import { describe, it, expect } from 'vitest';
import { validateCatalog } from './validate';
import {
  PARTS,
  PRODUCTS,
  PRODUCT_PARTS,
  findPartVariants,
  resolveProductParts,
  variantShot,
} from './catalog';
import type { CropBox, Part, Product, ProductParts } from './types';

const product = (code: string, contents: Product['contents']): Product => ({
  code,
  nameEn: code,
  nameJa: code,
  type: 'starter-set',
  style: 'upper',
  price: { amount: 3300, currency: 'JPY', taxIncluded: true },
  releaseDate: '2026-09-19',
  contents,
  images: [1, 2, 3, 4, 5].map((n) => `/assets/baraba-ride/products/${code}/${n}.jpg`),
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
    expect(validateCatalog(products, parts, mapping)).toEqual({
      errors: [],
      unmapped: [],
      missingImages: ['BR-01 cowl:storm-falcon', 'BR-01 tire:h36'],
    });
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
    expect(validateCatalog(products, parts, [])).toEqual({
      errors: [],
      unmapped: ['BR-01'],
      missingImages: [],
    });
  });

  it('does not report products that contain no parts', () => {
    expect(validateCatalog(products, parts, mapping).unmapped).not.toContain('BR-10');
  });
});

describe('validateCatalog variants', () => {
  const withImage = (image: { shot: number; crop: CropBox }): ProductParts[] => [
    {
      ...mapping[0],
      parts: [
        { partId: 'cowl:storm-falcon', quantity: 1, variant: { color: 'White', image } },
        { partId: 'tire:h36', quantity: 4, variant: { color: 'Red' } },
      ],
    },
  ];
  const crop = { x: 0, y: 0, w: 300, h: 300 };

  it('accepts a variant image inside one of the product shots', () => {
    const result = validateCatalog(products, parts, withImage({ shot: 3, crop }));
    expect(result.errors).toEqual([]);
  });

  it('reports entries that have no variant image without failing', () => {
    const result = validateCatalog(products, parts, withImage({ shot: 3, crop }));
    expect(result.missingImages).toEqual(['BR-01 tire:h36']);
  });

  it('rejects a shot the product does not have, naming product, part and shot', () => {
    const { errors } = validateCatalog(products, parts, withImage({ shot: 6, crop }));
    expect(errors).toEqual(['BR-01 "cowl:storm-falcon" variant uses shot 6 but the product has 5']);
    expect(validateCatalog(products, parts, withImage({ shot: 0, crop })).errors).toHaveLength(1);
  });

  it.each([
    ['extends past the right edge', { x: 1300, y: 0, w: 300, h: 300 }],
    ['extends past the bottom edge', { x: 0, y: 1300, w: 300, h: 300 }],
    ['has a negative origin', { x: -1, y: 0, w: 300, h: 300 }],
    ['has no area', { x: 0, y: 0, w: 0, h: 300 }],
    ['is not whole pixels', { x: 0.5, y: 0, w: 300, h: 300 }],
  ])('rejects a crop box that %s', (_, bad) => {
    const { errors } = validateCatalog(products, parts, withImage({ shot: 3, crop: bad }));
    expect(errors).toEqual([
      'BR-01 "cowl:storm-falcon" variant crop is not inside the 1500px shot',
    ]);
  });
});

describe('committed catalog data', () => {
  it('is valid', () => {
    expect(validateCatalog(PRODUCTS, PARTS, PRODUCT_PARTS).errors).toEqual([]);
  });

  it('pictures every mapped part', () => {
    expect(validateCatalog(PRODUCTS, PARTS, PRODUCT_PARTS).missingImages).toEqual([]);
  });

  it('records every variant of a part in product-code order', () => {
    expect(
      findPartVariants('cowl:storm-falcon').map((v) => [v.product.code, v.variant.color]),
    ).toEqual([
      ['BR-01', 'White'],
      ['BR-04', 'Red'],
      ['BR-07', 'Black'],
    ]);
  });

  it('resolves a product part with its variant and the shot picturing it', () => {
    const cowl = resolveProductParts('BR-07')!.find((p) => p.part.slot === 'cowl')!;
    expect(cowl.variant?.color).toBe('Black');
    expect(
      variantShot(
        PRODUCTS.find((p) => p.code === 'BR-07')!,
        cowl.variant,
      ),
    ).toEqual({
      path: '/assets/baraba-ride/products/BR-07/3.jpg',
      crop: cowl.variant!.image!.crop,
    });
  });

  it('gives a variant without an image no shot', () => {
    expect(variantShot(PRODUCTS[0], { color: 'Red' })).toBeNull();
    expect(variantShot(PRODUCTS[0], undefined)).toBeNull();
  });

  it('references images by asset path only, never a CDN or source URL', () => {
    const images = PRODUCTS.flatMap((p) => p.images);
    expect(images.length).toBeGreaterThan(0);
    for (const path of images) {
      expect(path).toMatch(/^\/assets\/baraba-ride\/products\/BR-\d+\/\d+\.jpg$/);
    }
    expect(JSON.stringify([PRODUCTS, PRODUCT_PARTS])).not.toMatch(
      /https?:\/\/[^"]*\.(jpg|png|webp)/,
    );
  });

  it('contains one record per product code, including the launch lineup', () => {
    const codes = PRODUCTS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (let n = 1; n <= 10; n++) {
      expect(codes).toContain(`BR-${String(n).padStart(2, '0')}`);
    }
  });
});
