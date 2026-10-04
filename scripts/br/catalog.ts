/**
 * Parsers for the official Baraba Ride pages on toy.bandai.co.jp. Only factual
 * fields are extracted — never images or description prose.
 */
import * as cheerio from 'cheerio';
import type { ContentsKey, Price, Product, ProductType, Style } from '../../src/lib/br/types.ts';

export const SOURCE_ORIGIN = 'https://toy.bandai.co.jp';

/** Thrown when a page no longer exposes a field the catalog requires. */
export class CatalogParseError extends Error {
  product: string;
  field: string;

  constructor(product: string, field: string, detail: string) {
    super(`${product}: cannot parse ${field} — ${detail}`);
    this.name = 'CatalogParseError';
    this.product = product;
    this.field = field;
  }
}

export interface LineupEntry {
  code: string;
  style: Style | null;
  sourceId: string;
}

export interface ItemJa {
  code: string;
  type: ProductType;
  nameJa: string;
  price: Price;
  releaseDate: string;
  contents: Product['contents'];
}

export interface ItemEn {
  code: string;
  nameEn: string;
}

const STYLE_CLASSES: Record<string, Style | null> = {
  '-upper': 'upper',
  '-spin': 'spin',
  '-dash': 'dash',
  '-tool': null,
};

const TYPES_JA: Record<string, ProductType> = {
  スターターセット: 'starter-set',
  ブースターセット: 'booster-set',
  ツール: 'tool',
};

/** Contents labels in output order. */
const CONTENTS_JA: [string, ContentsKey][] = [
  ['カウル', 'cowl'],
  ['バンパー', 'bumper'],
  ['タイヤ', 'tire'],
  ['シャーシ', 'chassis'],
  ['ライドチャージャー', 'charger'],
  ['シール', 'sticker'],
  ['本体', 'body'],
];

export function itemUrl(sourceId: string, lang: 'ja' | 'en' = 'ja'): string {
  return `${SOURCE_ORIGIN}/${lang}/item/${sourceId}/`;
}

/**
 * Reads the lineup page. The page renders the product list twice (desktop and
 * mobile blocks), so entries are deduped by code.
 */
export function parseLineup(html: string): LineupEntry[] {
  const $ = cheerio.load(html);
  const byCode = new Map<string, LineupEntry>();

  $('a.p-productsListLink').each((_, el) => {
    const link = $(el);
    const alt = link.find('img.p-productsListTit__img').attr('alt') ?? '';
    const code = alt.match(/^BR-\d+/)?.[0];
    if (!code) {
      throw new CatalogParseError('lineup', 'code', `no BR code in "${alt}"`);
    }

    const sourceId = (link.attr('href') ?? '').match(/item\/([0-9_]+)\/?$/)?.[1];
    if (!sourceId) {
      throw new CatalogParseError(code, 'sourceId', `unexpected link "${link.attr('href')}"`);
    }

    const styleClasses = (link.find('.p-productsListVisual__style').attr('class') ?? '').split(
      /\s+/,
    );
    const styleClass = styleClasses.find((c) => c in STYLE_CLASSES);
    if (!styleClass) {
      throw new CatalogParseError(code, 'style', `unknown style "${styleClasses.join(' ')}"`);
    }

    const entry: LineupEntry = { code, style: STYLE_CLASSES[styleClass], sourceId };
    const seen = byCode.get(code);
    if (seen && (seen.sourceId !== entry.sourceId || seen.style !== entry.style)) {
      throw new CatalogParseError(code, 'lineup', 'duplicate entries disagree');
    }
    byCode.set(code, entry);
  });

  if (byCode.size === 0) {
    throw new CatalogParseError('lineup', 'products', 'no products found');
  }
  return [...byCode.values()];
}

function pageTitle($: cheerio.CheerioAPI): string {
  return $('title').text().split('|')[0].trim();
}

export function parseItemJa(html: string, code: string): ItemJa {
  const $ = cheerio.load(html);

  const title = pageTitle($);
  const titleMatch = title.match(/^バラバライド\s+(\S+)\s+(BR-\d+)\s+(.+)$/);
  if (!titleMatch) {
    throw new CatalogParseError(code, 'name', `unexpected title "${title}"`);
  }
  const [, typeJa, titleCode, nameJa] = titleMatch;
  if (titleCode !== code) {
    throw new CatalogParseError(code, 'code', `item page is for ${titleCode}`);
  }
  const type = TYPES_JA[typeJa];
  if (!type) {
    throw new CatalogParseError(code, 'type', `unknown product type "${typeJa}"`);
  }

  const priceText = $('.price_stand').text();
  const priceMatch = priceText.match(/([\d,]+)円/);
  if (!priceMatch) {
    throw new CatalogParseError(code, 'price', `unexpected text "${priceText.trim()}"`);
  }
  const price: Price = {
    amount: Number(priceMatch[1].replaceAll(',', '')),
    currency: 'JPY',
    taxIncluded: priceText.includes('税込'),
  };

  const dateText = $('.price_date').text();
  const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!dateMatch) {
    throw new CatalogParseError(code, 'releaseDate', `unexpected text "${dateText.trim()}"`);
  }
  const releaseDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;

  return { code, type, nameJa, price, releaseDate, contents: parseContents($, code) };
}

/** Reads the `［セット内容］` list — the lines of `・<label>…<count>` that follow it. */
function parseContents($: cheerio.CheerioAPI, code: string): Product['contents'] {
  const lines = ($('.description').html() ?? '')
    .split(/<br\s*\/?>/i)
    .map((line) => cheerio.load(line).text().trim());

  const start = lines.findIndex((line) => line.includes('セット内容'));
  const counts = new Map<ContentsKey, number>();
  for (const line of start === -1 ? [] : lines.slice(start + 1)) {
    const match = line.match(/^・(.+?)…(\d+)$/);
    if (!match) break;
    const key = CONTENTS_JA.find(([label]) => label === match[1])?.[1];
    if (!key) {
      throw new CatalogParseError(code, 'contents', `unknown item "${match[1]}"`);
    }
    counts.set(key, Number(match[2]));
  }
  if (counts.size === 0) {
    throw new CatalogParseError(code, 'contents', 'no contents list found');
  }

  const contents: Product['contents'] = {};
  for (const [, key] of CONTENTS_JA) {
    const count = counts.get(key);
    if (count !== undefined) contents[key] = count;
  }
  return contents;
}

export function parseItemEn(html: string, code: string): ItemEn {
  const title = pageTitle(cheerio.load(html));
  const match = title.match(/^BARABARIDE\s+.+?\s+(BR-\d+)\s+(.+)$/);
  if (!match) {
    throw new CatalogParseError(code, 'nameEn', `unexpected title "${title}"`);
  }
  if (match[1] !== code) {
    throw new CatalogParseError(code, 'code', `English item page is for ${match[1]}`);
  }
  return { code, nameEn: titleCase(match[2]) };
}

/** The English site prints names in capitals: `STORM FALCON` → `Storm Falcon`. */
function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function buildProduct(entry: LineupEntry, ja: ItemJa, en: ItemEn): Product {
  return {
    code: entry.code,
    nameEn: en.nameEn,
    nameJa: ja.nameJa,
    type: ja.type,
    style: entry.style,
    price: ja.price,
    releaseDate: ja.releaseDate,
    contents: ja.contents,
    sourceId: entry.sourceId,
    sourceUrl: itemUrl(entry.sourceId),
  };
}

function codeNumber(code: string): number {
  return Number(code.replace('BR-', ''));
}

/** Deterministic output: sorted by product code, fixed key order, trailing newline. */
export function serializeProducts(products: Product[]): string {
  const sorted = [...products].sort((a, b) => codeNumber(a.code) - codeNumber(b.code));
  return `${JSON.stringify(sorted, null, 2)}\n`;
}
