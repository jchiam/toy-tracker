// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { completeCatalog } from './pipeline.ts';
import type { ImageStore } from './images.ts';
import type { Part, Product, ProductParts } from '../../src/lib/br/types.ts';

const products: Product[] = [
  {
    code: 'BR-07',
    nameEn: 'Falcon Kit',
    nameJa: 'ファルコンキット',
    type: 'booster-set',
    style: 'spin',
    price: { amount: 1540, currency: 'JPY', taxIncluded: true },
    releaseDate: '2026-09-19',
    contents: { cowl: 1 },
    images: [
      '/assets/baraba-ride/products/BR-07/1.jpg',
      '/assets/baraba-ride/products/BR-07/2.jpg',
    ],
    sourceId: '01_21004',
    sourceUrl: 'https://toy.bandai.co.jp/ja/item/01_21004/',
  },
];
const parts: Part[] = [
  { id: 'cowl:storm-falcon', slot: 'cowl', nameEn: 'Storm Falcon', nameJa: 'ストームファルコン' },
];
const productParts: ProductParts[] = [
  { productCode: 'BR-07', parts: [{ partId: 'cowl:storm-falcon', quantity: 1 }], source: 'test' },
];
const shots = new Map([['BR-07', ['https://example.com/1.jpg', 'https://example.com/2.jpg']]]);

function setup(present = false) {
  const calls: string[] = [];
  const store = {
    exists: vi.fn<ImageStore['exists']>(async () => present),
    upload: vi.fn<ImageStore['upload']>(async (path) => {
      calls.push(`upload ${path}`);
    }),
  };
  const write = vi.fn(async () => {
    calls.push('write');
  });
  const options = {
    products,
    shots,
    parts,
    productParts,
    store,
    fetchImage: async () => Buffer.from('shot'),
    write,
    log: vi.fn(),
  };
  return { calls, store, write, options };
}

describe('completeCatalog', () => {
  it('writes the catalog only after every shot is published', async () => {
    const { calls, options } = setup();
    await completeCatalog(options);
    expect(calls).toEqual([
      'upload /assets/baraba-ride/products/BR-07/1.jpg',
      'upload /assets/baraba-ride/products/BR-07/2.jpg',
      'write',
    ]);
  });

  it('leaves the catalog unwritten when an upload fails', async () => {
    const { store, write, options } = setup();
    store.upload.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(completeCatalog(options)).rejects.toThrow('BR-07 shot 1: quota exceeded');
    expect(write).not.toHaveBeenCalled();
  });

  it('neither uploads nor writes when the curated data is invalid', async () => {
    const { store, write, options } = setup();
    const bad = [{ ...productParts[0], parts: [{ partId: 'cowl:ghost', quantity: 1 }] }];
    await expect(completeCatalog({ ...options, productParts: bad })).rejects.toThrow(
      /Curated parts data is invalid:\n {2}BR-07 references unknown part "cowl:ghost"/,
    );
    expect(store.upload).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it('still writes the catalog when image credentials are not configured', async () => {
    const { write, options } = setup();
    await completeCatalog({ ...options, store: null });
    expect(write).toHaveBeenCalledWith(products);
    expect(options.log).toHaveBeenCalledWith(
      'Image uploads skipped (IMAGEKIT_PRIVATE_KEY not set)',
    );
  });

  it('reports products that have no part mapping', async () => {
    const { options } = setup(true);
    const unmapped = { ...products[0], code: 'BR-08' };
    await completeCatalog({ ...options, products: [...products, unmapped] });
    expect(options.log).toHaveBeenCalledWith('Products with no part mapping: BR-08');
  });

  it('reports mapping entries that have no variant image', async () => {
    const { options } = setup(true);
    await completeCatalog(options);
    expect(options.log).toHaveBeenLastCalledWith(
      'Part variants with no image: BR-07 cowl:storm-falcon',
    );
  });
});
