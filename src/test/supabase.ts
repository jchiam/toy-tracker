/**
 * Test doubles for the Supabase REST API. Tests build a real supabase-js client
 * pointed at a fake origin and intercept its requests with MSW, so the service
 * layer's queries and headers are exercised for real.
 */
import { createClient } from '@supabase/supabase-js';
import { setupServer } from 'msw/node';
import type { RequestHandler } from 'msw';

export const SUPABASE_TEST_URL = 'http://supabase.test';
export const REST = `${SUPABASE_TEST_URL}/rest/v1`;

export function createTestClient() {
  return createClient(SUPABASE_TEST_URL, 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function createTestServer(...handlers: RequestHandler[]) {
  return setupServer(...handlers);
}
