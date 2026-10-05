/**
 * Regenerates src/data/br/products.json from the official Baraba Ride pages.
 * Run manually with `npm run data:br` — never from CI or the app build.
 *
 * Also publishes each product's official shots to the image CDN when
 * IMAGEKIT_PRIVATE_KEY is set (read from the environment or .env.local). Shots
 * already on the CDN are skipped; pass `--reupload` to replace them.
 *
 * Nothing is written unless every product parses, the curated parts data still
 * validates against the new catalog, and every shot is on the CDN.
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
import { createImageStore } from './images.ts';
import { completeCatalog } from './pipeline.ts';
import type { Accessory, Part, Product, ProductParts } from '../../src/lib/br/types.ts';

const LINEUP_URL = `${SOURCE_ORIGIN}/ja/series/barabaride/lineup/`;
const USER_AGENT = 'toy-tracker-catalog/0.1 (+https://github.com/jchiam/toy-tracker)';
const REQUEST_GAP_MS = 1000;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = join(ROOT, 'src', 'data', 'br');
const PRODUCTS_PATH = join(DATA_DIR, 'products.json');

let lastRequestAt = 0;

/** Sequential, spaced fetch — one request at a time, at least REQUEST_GAP_MS apart. */
async function fetchSource(url: string): Promise<Response> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response;
}

async function fetchHtml(url: string): Promise<string> {
  return (await fetchSource(url)).text();
}

async function fetchImage(url: string): Promise<Buffer> {
  return Buffer.from(await (await fetchSource(url)).arrayBuffer());
}

function readCurated<T>(file: string): T[] {
  const path = join(DATA_DIR, file);
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T[]) : [];
}

async function writeProducts(products: Product[]) {
  const config = await prettier.resolveConfig(PRODUCTS_PATH);
  const output = await prettier.format(serializeProducts(products), {
    ...config,
    filepath: PRODUCTS_PATH,
  });
  writeFileSync(PRODUCTS_PATH, output);
  console.log(`Wrote ${products.length} products to ${PRODUCTS_PATH}`);
}

async function main() {
  const envFile = join(ROOT, '.env.local');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const reupload = process.argv.includes('--reupload');

  const lineup = parseLineup(await fetchHtml(LINEUP_URL));
  console.log(`Lineup lists ${lineup.length} products`);

  const products: Product[] = [];
  const shots = new Map<string, string[]>();
  for (const entry of lineup) {
    const ja = parseItemJa(await fetchHtml(itemUrl(entry.sourceId, 'ja')), entry.code);
    const en = parseItemEn(await fetchHtml(itemUrl(entry.sourceId, 'en')), entry.code);
    products.push(buildProduct(entry, ja, en));
    shots.set(entry.code, ja.shotUrls);
    console.log(`  ${entry.code} ${en.nameEn}`);
  }

  await completeCatalog({
    products,
    shots,
    parts: readCurated<Part>('parts.json'),
    productParts: readCurated<ProductParts>('product-parts.json'),
    accessories: readCurated<Accessory>('accessories.json'),
    store: createImageStore(),
    fetchImage,
    reupload,
    write: writeProducts,
  });
}

main().catch((error) => {
  console.error(`data:br failed — ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
