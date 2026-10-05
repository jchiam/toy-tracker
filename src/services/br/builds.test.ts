import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  clearPlanPosition,
  createBuild,
  deleteBuild,
  listBuilds,
  markBuilt,
  setPlanPositions,
  swapBuiltPosition,
  takeApart,
  updateBuild,
} from './builds';
import { REST, createTestClient, createTestServer } from '@/test/supabase';
import { POSITIONS, TIRE_POSITIONS } from '@/lib/br/build-types';
import type { Assignment, BuildRow } from '@/lib/br/build-types';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

const client = createTestClient();
const server = createTestServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const USER = 'user-1';

const buildRow: BuildRow = {
  id: 'b1',
  profile_id: USER,
  name: 'Red Dash',
  status: 'plan',
  note: '',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

interface Call {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}

/** Records every request MSW sees, in order. */
function recorder() {
  const calls: Call[] = [];
  const record = async (request: Request) => {
    const url = new URL(request.url);
    const text = await request.text();
    calls.push({
      method: request.method,
      path: url.pathname,
      query: url.searchParams,
      body: text ? JSON.parse(text) : null,
    });
  };
  return { calls, record };
}

const dbError = (message: string) => HttpResponse.json({ message }, { status: 400 });

describe('listBuilds', () => {
  it('loads the user’s builds with their parts embedded, oldest first', async () => {
    const { calls, record } = recorder();
    server.use(
      http.get(`${REST}/br_builds`, async ({ request }) => {
        await record(request);
        return HttpResponse.json([
          {
            ...buildRow,
            br_build_parts: [
              {
                position: 'cowl',
                item_id: 'cowl:storm-falcon',
                variant_product_code: null,
                instance_id: null,
              },
            ],
          },
        ]);
      }),
    );
    const builds = await listBuilds(USER, client);
    expect(builds).toHaveLength(1);
    expect(builds[0]).toMatchObject({
      id: 'b1',
      name: 'Red Dash',
      status: 'plan',
      parts: [
        {
          position: 'cowl',
          itemId: 'cowl:storm-falcon',
          variantProductCode: null,
          instanceId: null,
        },
      ],
    });
    expect(calls[0].query.get('profile_id')).toBe(`eq.${USER}`);
    expect(calls[0].query.get('order')).toBe('created_at.asc');
    expect(calls[0].query.get('select')).toContain(
      'br_build_parts(position,item_id,variant_product_code,instance_id)',
    );
  });

  it('names the failed action', async () => {
    server.use(http.get(`${REST}/br_builds`, () => dbError('down')));
    await expect(listBuilds(USER, client)).rejects.toThrow('Could not load builds: down');
  });
});

describe('createBuild', () => {
  it('ensures the profile, then inserts a trimmed name and returns an empty plan', async () => {
    const { calls, record } = recorder();
    server.use(
      http.post(`${REST}/user_profiles`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(`${REST}/br_builds`, async ({ request }) => {
        await record(request);
        return HttpResponse.json(buildRow, { status: 201 });
      }),
    );
    const build = await createBuild(USER, '  Red Dash  ', client);
    expect(calls.map((c) => c.path)).toEqual(['/rest/v1/user_profiles', '/rest/v1/br_builds']);
    expect(calls[1].body).toEqual({ profile_id: USER, name: 'Red Dash' });
    expect(build).toMatchObject({ id: 'b1', status: 'plan', parts: [] });
  });

  it('names the failed action', async () => {
    server.use(
      http.post(`${REST}/user_profiles`, () => new HttpResponse(null, { status: 201 })),
      http.post(`${REST}/br_builds`, () => dbError('check violation')),
    );
    await expect(createBuild(USER, 'x', client)).rejects.toThrow(
      'Could not create build: check violation',
    );
  });
});

describe('updateBuild', () => {
  it('patches only the given fields of one build', async () => {
    const { calls, record } = recorder();
    server.use(
      http.patch(`${REST}/br_builds`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await updateBuild('b1', { name: ' Blue Spin ' }, client);
    expect(calls[0].query.get('id')).toBe('eq.b1');
    expect(calls[0].body).toEqual({ name: 'Blue Spin', updated_at: expect.any(String) });
  });

  it('names the failed action', async () => {
    server.use(http.patch(`${REST}/br_builds`, () => dbError('nope')));
    await expect(updateBuild('b1', { note: 'x' }, client)).rejects.toThrow(
      'Could not update build: nope',
    );
  });
});

describe('deleteBuild', () => {
  it('deletes the one build', async () => {
    const { calls, record } = recorder();
    server.use(
      http.delete(`${REST}/br_builds`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deleteBuild('b1', client);
    expect(calls).toHaveLength(1);
    expect(calls[0].query.get('id')).toBe('eq.b1');
  });

  it('names the failed action', async () => {
    server.use(http.delete(`${REST}/br_builds`, () => dbError('nope')));
    await expect(deleteBuild('b1', client)).rejects.toThrow('Could not delete build: nope');
  });
});

describe('setPlanPositions', () => {
  it('upserts all four tires in one request and never sends an instance', async () => {
    const { calls, record } = recorder();
    server.use(
      http.post(`${REST}/br_build_parts`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
    );
    await setPlanPositions(
      'b1',
      TIRE_POSITIONS.map((position) => ({
        position,
        itemId: 'tire:c36',
        variantProductCode: 'BR-03',
      })),
      client,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].query.get('on_conflict')).toBe('build_id,position');
    expect(calls[0].body).toEqual(
      TIRE_POSITIONS.map((position) => ({
        build_id: 'b1',
        position,
        item_id: 'tire:c36',
        variant_product_code: 'BR-03',
      })),
    );
  });

  it('names the failed action', async () => {
    server.use(http.post(`${REST}/br_build_parts`, () => dbError('slot check')));
    await expect(
      setPlanPositions(
        'b1',
        [{ position: 'cowl', itemId: 'tire:c36', variantProductCode: null }],
        client,
      ),
    ).rejects.toThrow('Could not set position: slot check');
  });
});

describe('clearPlanPosition', () => {
  it('deletes the one position row', async () => {
    const { calls, record } = recorder();
    server.use(
      http.delete(`${REST}/br_build_parts`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await clearPlanPosition('b1', 'cowl', client);
    expect(calls).toHaveLength(1);
    expect(calls[0].query.get('build_id')).toBe('eq.b1');
    expect(calls[0].query.get('position')).toBe('eq.cowl');
  });
});

describe('swapBuiltPosition', () => {
  it('sends the instance, its part and its source product together in one request', async () => {
    const { calls, record } = recorder();
    server.use(
      http.patch(`${REST}/br_build_parts`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await swapBuiltPosition(
      'b1',
      'tire_fl',
      { id: 'i9', itemId: 'tire:c36', variantProductCode: 'BR-03' },
      client,
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].query.get('build_id')).toBe('eq.b1');
    expect(calls[0].query.get('position')).toBe('eq.tire_fl');
    expect(calls[0].body).toEqual({
      instance_id: 'i9',
      item_id: 'tire:c36',
      variant_product_code: 'BR-03',
    });
  });

  it('names the failed action', async () => {
    server.use(http.patch(`${REST}/br_build_parts`, () => dbError('duplicate key')));
    await expect(
      swapBuiltPosition(
        'b1',
        'cowl',
        { id: 'i', itemId: 'cowl:x', variantProductCode: null },
        client,
      ),
    ).rejects.toThrow('Could not swap part: duplicate key');
  });
});

describe('markBuilt', () => {
  const claims = Object.fromEntries(POSITIONS.map((p, n) => [p, `i${n}`])) as Assignment;

  it('calls the function with the build and all seven claims', async () => {
    const { calls, record } = recorder();
    server.use(
      http.post(`${REST}/rpc/br_mark_built`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await markBuilt('b1', claims, client);
    expect(calls).toHaveLength(1);
    const body = calls[0].body as { p_build_id: string; p_claims: Record<string, string> };
    expect(body.p_build_id).toBe('b1');
    expect(Object.keys(body.p_claims).sort()).toEqual([...POSITIONS].sort());
  });

  it('names the failed action', async () => {
    server.use(http.post(`${REST}/rpc/br_mark_built`, () => dbError('duplicate key')));
    await expect(markBuilt('b1', claims, client)).rejects.toThrow(
      'Could not mark built: duplicate key',
    );
  });
});

describe('takeApart', () => {
  it('calls the function with the build', async () => {
    const { calls, record } = recorder();
    server.use(
      http.post(`${REST}/rpc/br_take_apart`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await takeApart('b1', client);
    expect(calls[0].body).toEqual({ p_build_id: 'b1' });
  });

  it('names the failed action', async () => {
    server.use(http.post(`${REST}/rpc/br_take_apart`, () => dbError('not built')));
    await expect(takeApart('b1', client)).rejects.toThrow('Could not take apart: not built');
  });
});
