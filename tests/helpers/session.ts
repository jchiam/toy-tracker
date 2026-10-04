import { existsSync, readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/**
 * Every VITE_SUPABASE_URL the app under test may have been started with: the
 * process env (CI, or a server Playwright starts) and the .env files (a dev
 * server that was already running and got reused).
 */
function supabaseUrls(): string[] {
  const urls = new Set<string>();
  if (process.env.VITE_SUPABASE_URL) urls.add(process.env.VITE_SUPABASE_URL);
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, 'utf8').match(/^VITE_SUPABASE_URL=(.*)$/m);
    if (match) urls.add(match[1].trim().replace(/^["']|["']$/g, ''));
  }
  if (urls.size === 0) {
    throw new Error('VITE_SUPABASE_URL is not set — needed to seed a signed-in session');
  }
  return [...urls];
}

/**
 * Seeds a far-from-expiry Supabase session into localStorage before the app
 * loads, so game pages render signed in without contacting Supabase.
 */
export async function signIn(page: Page) {
  // Mirrors supabase-js's default storage key.
  const storageKeys = supabaseUrls().map(
    (url) => `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
  );
  const session = {
    access_token: 'e2e.access.token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    user: {
      id: '00000000-0000-4000-8000-000000000000',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };

  await page.addInitScript(
    ([keys, value]) => {
      for (const key of keys) window.localStorage.setItem(key, value);
    },
    [storageKeys, JSON.stringify(session)] as const,
  );
}
