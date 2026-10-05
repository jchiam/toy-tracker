import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ensureProfile } from './profile';
import { REST, createTestClient, createTestServer } from '@/test/supabase';

// The singleton needs env the unit tests do not have; the service takes a client anyway.
vi.mock('@/lib/supabase', () => ({ supabase: null }));

const client = createTestClient();
const server = createTestServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ensureProfile', () => {
  it('upserts the profile row and ignores an existing one', async () => {
    let seen: { url: URL; prefer: string | null; body: unknown } | undefined;
    server.use(
      http.post(`${REST}/user_profiles`, async ({ request }) => {
        seen = {
          url: new URL(request.url),
          prefer: request.headers.get('prefer'),
          body: await request.json(),
        };
        return new HttpResponse(null, { status: 201 });
      }),
    );

    await ensureProfile('user-1', client);

    expect(seen?.body).toEqual({ id: 'user-1' });
    expect(seen?.url.searchParams.get('on_conflict')).toBe('id');
    expect(seen?.prefer).toContain('resolution=ignore-duplicates');
  });

  it('throws with the database message when the write fails', async () => {
    server.use(
      http.post(`${REST}/user_profiles`, () =>
        HttpResponse.json({ message: 'permission denied' }, { status: 403 }),
      ),
    );
    await expect(ensureProfile('user-1', client)).rejects.toThrow(
      'Could not create profile: permission denied',
    );
  });
});
