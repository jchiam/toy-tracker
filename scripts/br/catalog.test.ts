// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CatalogParseError,
  buildProduct,
  parseItemEn,
  parseItemJa,
  parseLineup,
  serializeProducts,
} from './catalog.ts';

// Fixtures are trimmed copies of the official pages: markup structure and
// factual fields only, with description prose and image URLs removed.
const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, '__fixtures__', name), 'utf8');

describe('parseLineup', () => {
  const lineup = parseLineup(fixture('lineup.html'));

  it('dedupes the desktop and mobile blocks into one entry per code', () => {
    expect(lineup.map((e) => e.code)).toEqual([
      'BR-01',
      'BR-02',
      'BR-03',
      'BR-04',
      'BR-05',
      'BR-06',
      'BR-07',
      'BR-08',
      'BR-09',
      'BR-10',
    ]);
  });

  it('reads the style and source id of each product', () => {
    expect(lineup.find((e) => e.code === 'BR-01')).toEqual({
      code: 'BR-01',
      style: 'upper',
      sourceId: '01_21000',
    });
    expect(lineup.find((e) => e.code === 'BR-07')?.style).toBe('spin');
    expect(lineup.find((e) => e.code === 'BR-08')?.style).toBe('dash');
  });

  it('gives tools no style', () => {
    expect(lineup.find((e) => e.code === 'BR-10')?.style).toBeNull();
  });

  it('fails when the lineup yields zero products', () => {
    expect(() => parseLineup('<html><body></body></html>')).toThrow(CatalogParseError);
  });

  it('fails on an unknown style', () => {
    const html = fixture('lineup.html').replaceAll('-upper', '-mystery');
    expect(() => parseLineup(html)).toThrow(/BR-01: cannot parse style/);
  });
});

describe('parseItemJa', () => {
  it('parses a starter set', () => {
    expect(parseItemJa(fixture('item-br-01.ja.html'), 'BR-01')).toEqual({
      code: 'BR-01',
      type: 'starter-set',
      nameJa: 'ストームファルコン',
      price: { amount: 3300, currency: 'JPY', taxIncluded: true },
      releaseDate: '2026-09-19',
      contents: { cowl: 1, bumper: 1, tire: 4, chassis: 1, charger: 1, sticker: 1 },
      manualUrl: 'https://toy.bandai.co.jp/manuals/pdf.php?id=2852278',
    });
  });

  it('parses a booster set, which has no chassis or charger', () => {
    const item = parseItemJa(fixture('item-br-07.ja.html'), 'BR-07');
    expect(item.type).toBe('booster-set');
    expect(item.price.amount).toBe(1540);
    expect(item.contents).toEqual({ cowl: 1, bumper: 1, tire: 4, sticker: 1 });
  });

  it('parses a tool', () => {
    const item = parseItemJa(fixture('item-br-10.ja.html'), 'BR-10');
    expect(item.type).toBe('tool');
    expect(item.nameJa).toBe('フォールドコロシアム');
    expect(item.contents).toEqual({ body: 1 });
  });

  it('fails naming the product and field when the price is unparseable', () => {
    const html = fixture('item-br-01.ja.html').replace('3,300円（税込）', '未定');
    expect(() => parseItemJa(html, 'BR-01')).toThrow(/BR-01: cannot parse price/);
  });

  it('fails naming the product and field when the release date is unparseable', () => {
    const html = fixture('item-br-01.ja.html').replace('2026年09月19日', '2026年秋');
    expect(() => parseItemJa(html, 'BR-01')).toThrow(/BR-01: cannot parse releaseDate/);
  });

  it('fails on an unknown contents item rather than dropping it', () => {
    const html = fixture('item-br-01.ja.html').replace('・シール…1', '・ウイング…2');
    expect(() => parseItemJa(html, 'BR-01')).toThrow(/BR-01: cannot parse contents/);
  });

  it('fails when the page is for a different product', () => {
    expect(() => parseItemJa(fixture('item-br-07.ja.html'), 'BR-01')).toThrow(
      /BR-01: cannot parse code/,
    );
  });

  it('leaves the manual link off an item page that has none', () => {
    expect(parseItemJa(fixture('item-br-10.ja.html'), 'BR-10')).not.toHaveProperty('manualUrl');
  });

  it('fails on a manual link that is not the official manual location', () => {
    const html = fixture('item-br-01.ja.html').replace(
      'https://toy.bandai.co.jp/manuals/pdf.php?id=2852278',
      'https://example.com/manual.pdf',
    );
    expect(() => parseItemJa(html, 'BR-01')).toThrow(/BR-01: cannot parse manualUrl/);
  });
});

describe('parseItemEn', () => {
  it('title-cases the English name', () => {
    expect(parseItemEn(fixture('item-br-01.en.html'), 'BR-01').nameEn).toBe('Storm Falcon');
    expect(parseItemEn(fixture('item-br-07.en.html'), 'BR-07').nameEn).toBe('Falcon Kit');
    expect(parseItemEn(fixture('item-br-10.en.html'), 'BR-10').nameEn).toBe('Fold Colosseum');
  });

  it('fails when the page is for a different product', () => {
    expect(() => parseItemEn(fixture('item-br-07.en.html'), 'BR-01')).toThrow(CatalogParseError);
  });
});

describe('buildProduct and serializeProducts', () => {
  const lineup = parseLineup(fixture('lineup.html'));
  const build = (code: string) => {
    const file = `item-${code.toLowerCase()}`;
    return buildProduct(
      lineup.find((e) => e.code === code)!,
      parseItemJa(fixture(`${file}.ja.html`), code),
      parseItemEn(fixture(`${file}.en.html`), code),
    );
  };

  it('assembles a full product record', () => {
    expect(build('BR-07')).toEqual({
      code: 'BR-07',
      nameEn: 'Falcon Kit',
      nameJa: 'ファルコンキット',
      type: 'booster-set',
      style: 'spin',
      price: { amount: 1540, currency: 'JPY', taxIncluded: true },
      releaseDate: '2026-09-19',
      contents: { cowl: 1, bumper: 1, tire: 4, sticker: 1 },
      sourceId: '01_21004',
      sourceUrl: 'https://toy.bandai.co.jp/ja/item/01_21004/',
    });
  });

  it('puts the manual link last, and only on products that have one', () => {
    const withManual = build('BR-01');
    expect(withManual.manualUrl).toBe('https://toy.bandai.co.jp/manuals/pdf.php?id=2852278');
    expect(Object.keys(withManual).at(-1)).toBe('manualUrl');

    expect(build('BR-10')).not.toHaveProperty('manualUrl');
    expect(serializeProducts([build('BR-10')])).not.toContain('manualUrl');
  });

  it('serializes sorted by product code regardless of input order', () => {
    const a = serializeProducts([build('BR-10'), build('BR-01'), build('BR-07')]);
    const b = serializeProducts([build('BR-07'), build('BR-10'), build('BR-01')]);
    expect(a).toBe(b);
    expect(JSON.parse(a).map((p: { code: string }) => p.code)).toEqual(['BR-01', 'BR-07', 'BR-10']);
    expect(a.endsWith('\n')).toBe(true);
  });
});
