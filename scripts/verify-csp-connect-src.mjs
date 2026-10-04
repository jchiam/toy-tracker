/**
 * Ensures vercel.json Content-Security-Policy connect-src includes the origin of
 * VITE_SUPABASE_URL (when set). Skips when VITE_SUPABASE_URL is unset (local dev).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERCEL_JSON = join(__dirname, '..', 'vercel.json');

const REQUIRED_CONNECT = [];

function loadCsp() {
  const raw = readFileSync(VERCEL_JSON, 'utf8');
  const config = JSON.parse(raw);
  const block = config.headers?.find((h) => h.source === '/(.*)');
  const entry = block?.headers?.find((h) => h.key === 'Content-Security-Policy');
  return entry?.value ?? null;
}

/** @param {string} csp */
function parseConnectSrcTokens(csp) {
  const parts = csp
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  const connectPart = parts.find((p) => /^connect-src\s/i.test(p));
  if (!connectPart) {
    throw new Error('CSP has no connect-src directive');
  }
  const rest = connectPart.replace(/^connect-src\s+/i, '').trim();
  return tokenizeCspSourceList(rest);
}

/**
 * Space-separated source list; quoted 'self' etc. stay as single tokens.
 * @param {string} list
 */
function tokenizeCspSourceList(list) {
  const tokens = [];
  let i = 0;
  while (i < list.length) {
    while (i < list.length && /\s/.test(list[i])) i++;
    if (i >= list.length) break;
    if (list[i] === "'" || list[i] === '"') {
      const q = list[i];
      let j = i + 1;
      while (j < list.length && list[j] !== q) j++;
      tokens.push(list.slice(i, j + 1));
      i = j + 1;
    } else {
      let j = i;
      while (j < list.length && !/\s/.test(list[j])) j++;
      tokens.push(list.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function main() {
  const raw = process.env.VITE_SUPABASE_URL?.trim();
  if (!raw) {
    console.log('verify-csp-connect-src: skip (VITE_SUPABASE_URL unset)');
    process.exit(0);
  }

  let expectedOrigin;
  try {
    expectedOrigin = new URL(raw).origin;
  } catch (e) {
    console.error(
      'verify-csp-connect-src: invalid VITE_SUPABASE_URL:',
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
  }

  let csp;
  try {
    csp = loadCsp();
  } catch (e) {
    console.error(
      'verify-csp-connect-src: failed to read vercel.json:',
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
  }

  if (!csp) {
    console.error('verify-csp-connect-src: no Content-Security-Policy in vercel.json');
    process.exit(1);
  }

  let tokens;
  try {
    tokens = parseConnectSrcTokens(csp);
  } catch (e) {
    console.error('verify-csp-connect-src:', e instanceof Error ? e.message : e);
    process.exit(1);
  }

  if (!tokens.includes(expectedOrigin)) {
    console.error(
      `verify-csp-connect-src: connect-src must include Supabase origin ${expectedOrigin}. Current connect-src tokens: ${tokens.join(' ')}`,
    );
    process.exit(1);
  }

  for (const req of REQUIRED_CONNECT) {
    if (!tokens.includes(req)) {
      console.error(`verify-csp-connect-src: connect-src missing required source ${req}`);
      process.exit(1);
    }
  }

  console.log(`verify-csp-connect-src: ok (${expectedOrigin})`);
}

main();
