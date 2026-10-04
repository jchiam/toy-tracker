/**
 * Regenerates src/data/br/products.json from the official Baraba Ride pages.
 * Run manually with `npm run data:br` — never from CI or the app build.
 *
 * Nothing is written unless every product parses and the curated parts data
 * still validates against the new catalog.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import {
  SOURCE_ORIGIN,
  buildProduct,
  itemUrl,
  parseItemEn,
  parseItemJa,
  parseLineup,
  serializeProducts,
} from './catalog.ts';
import { validateCatalog } from '../../src/lib/br/validate.ts';
import type { Part, Product, ProductParts } from '../../src/lib/br/types.ts';

const LINEUP_URL = `${SOURCE_ORIGIN}/ja/series/barabaride/lineup/`;
const USER_AGENT = 'toy-tracker-catalog/0.1 (+https://github.com/jchiam/toy-tracker)';
const REQUEST_GAP_MS = 1000;

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'br');
const PRODUCTS_PATH = join(DATA_DIR, 'products.json');

let lastRequestAt = 0;

/** Sequential, spaced fetch — one request at a time, at least REQUEST_GAP_MS apart. */
async function fetchHtml(url: string): Promise<string> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.text();
}

function readCurated<T>(file: string): T[] {
  const path = join(DATA_DIR, file);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T[]) : [];
}

async function main() {
  const lineup = parseLineup(await fetchHtml(LINEUP_URL));
  console.log(`Lineup lists ${lineup.length} products`);

  const products: Product[] = [];
  for (const entry of lineup) {
    const ja = parseItemJa(await fetchHtml(itemUrl(entry.sourceId, 'ja')), entry.code);
    const en = parseItemEn(await fetchHtml(itemUrl(entry.sourceId, 'en')), entry.code);
    products.push(buildProduct(entry, ja, en));
    console.log(`  ${entry.code} ${en.nameEn}`);
  }

  const { errors, unmapped } = validateCatalog(
    products,
    readCurated<Part>('parts.json'),
    readCurated<ProductParts>('product-parts.json'),
  );
  if (errors.length > 0) {
    throw new Error(`Curated parts data is invalid:\n  ${errors.join('\n  ')}`);
  }

  const config = await prettier.resolveConfig(PRODUCTS_PATH);
  const output = await prettier.format(serializeProducts(products), {
    ...config,
    filepath: PRODUCTS_PATH,
  });
  writeFileSync(PRODUCTS_PATH, output);
  console.log(`Wrote ${products.length} products to ${PRODUCTS_PATH}`);

  if (unmapped.length > 0) {
    console.log(`Products with no part mapping: ${unmapped.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(`data:br failed — ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
