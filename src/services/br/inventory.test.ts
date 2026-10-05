import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  addInstances,
  deleteInstance,
  deletePurchase,
  listInstances,
  listPurchases,
  recordPurchase,
  setInstanceStatus,
  updateInstanceNote,
} from './inventory';
import { REST, createTestClient, createTestServer } from '@/test/supabase';
import type { InstanceRow, PurchaseRow } from '@/lib/br/inventory-types';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

const client = createTestClient();
const server = createTestServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const USER = 'user-1';

const purchaseRow: PurchaseRow = {
  id: 'p1',
  profile_id: USER,
  product_code: 'BR-01',
  acquired_at: '2026-10-01',
  note: '',
  created_at: '2026-10-01T00:00:00Z',
};

const instanceRow: InstanceRow = {
  id: 'i1',
  profile_id: USER,
  item_id: 'tire:rw32',
  variant_product_code: 'BR-01',
  purchase_id: 'p1',
  status: 'active',
  condition: null,
  note: '',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

/** Records every request MSW sees, in order. */
function recorder() {
  const calls: { method: string; path: string; query: URLSearchParams; body: unknown }[] = [];
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

const profileOk = http.post(`${REST}/user_profiles`, () => new HttpResponse(null, { status: 201 }));

describe('listPurchases', () => {
  it('returns the user’s purchases newest acquisition first, mapped to camelCase', async () => {
    const { calls, record } = recorder();
    server.use(
      http.get(`${REST}/br_purchases`, async ({ request }) => {
        await record(request);
        return HttpResponse.json([purchaseRow]);
      }),
    );
    const purchases = await listPurchases(USER, client);
    expect(purchases).toEqual([
      {
        id: 'p1',
        profileId: USER,
        productCode: 'BR-01',
        acquiredAt: '2026-10-01',
        note: '',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]);
    expect(calls[0].query.get('profile_id')).toBe(`eq.${USER}`);
    expect(calls[0].query.get('order')).toBe('acquired_at.desc,created_at.desc');
  });

  it('throws naming the action when the request fails', async () => {
    server.use(
      http.get(`${REST}/br_purchases`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    await expect(listPurchases(USER, client)).rejects.toThrow('Could not load purchases: boom');
  });
});

describe('listInstances', () => {
  it('returns the user’s instances mapped to camelCase', async () => {
    server.use(http.get(`${REST}/br_instances`, () => HttpResponse.json([instanceRow])));
    const instances = await listInstances(USER, client);
    expect(instances).toEqual([
      {
        id: 'i1',
        profileId: USER,
        itemId: 'tire:rw32',
        variantProductCode: 'BR-01',
        purchaseId: 'p1',
        status: 'active',
        condition: null,
        note: '',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ]);
  });
});

describe('recordPurchase', () => {
  it('ensures the profile, inserts the purchase, then one instance per mapped unit', async () => {
    const { calls, record } = recorder();
    server.use(
      http.post(`${REST}/user_profiles`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(`${REST}/br_purchases`, async ({ request }) => {
        await record(request);
        return HttpResponse.json(purchaseRow, { status: 201 });
      }),
      http.post(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
    );

    const purchase = await recordPurchase(
      USER,
      { productCode: 'BR-01', acquiredAt: '2026-10-01', note: 'launch day' },
      client,
    );

    expect(purchase.id).toBe('p1');
    expect(calls.map((c) => c.path)).toEqual([
      '/rest/v1/user_profiles',
      '/rest/v1/br_purchases',
      '/rest/v1/br_instances',
    ]);
    expect(calls[1].body).toEqual({
      profile_id: USER,
      product_code: 'BR-01',
      acquired_at: '2026-10-01',
      note: 'launch day',
    });
    const rows = calls[2].body as {
      item_id: string;
      purchase_id: string;
      variant_product_code: string;
    }[];
    expect(rows.map((r) => r.item_id)).toEqual([
      'cowl:storm-falcon',
      'bumper:dual-blade',
      'tire:rw32',
      'tire:rw32',
      'tire:lw32',
      'tire:lw32',
      'chassis:alpha',
      'charger:ride-charger',
    ]);
    expect(new Set(rows.map((r) => r.purchase_id))).toEqual(new Set(['p1']));
    expect(new Set(rows.map((r) => r.variant_product_code))).toEqual(new Set(['BR-01']));
  });

  it('expands BR-10 into a single colosseum instance', async () => {
    const { calls, record } = recorder();
    server.use(
      profileOk,
      http.post(`${REST}/br_purchases`, () =>
        HttpResponse.json({ ...purchaseRow, product_code: 'BR-10' }, { status: 201 }),
      ),
      http.post(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
    );
    await recordPurchase(USER, { productCode: 'BR-10', acquiredAt: '2026-10-01' }, client);
    expect(calls[0].body).toEqual([
      {
        profile_id: USER,
        item_id: 'colosseum:fold-colosseum',
        variant_product_code: 'BR-10',
        purchase_id: 'p1',
      },
    ]);
  });

  it('refuses a product with no mapping before touching the database', async () => {
    await expect(
      recordPurchase(USER, { productCode: 'BR-99', acquiredAt: '2026-10-01' }, client),
    ).rejects.toThrow('Could not record purchase: BR-99 has no contents mapping');
  });

  it('deletes the purchase again when the instances cannot be written', async () => {
    const { calls, record } = recorder();
    server.use(
      profileOk,
      http.post(`${REST}/br_purchases`, () => HttpResponse.json(purchaseRow, { status: 201 })),
      http.post(`${REST}/br_instances`, () =>
        HttpResponse.json({ message: 'check violation' }, { status: 400 }),
      ),
      http.delete(`${REST}/br_purchases`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(
      recordPurchase(USER, { productCode: 'BR-01', acquiredAt: '2026-10-01' }, client),
    ).rejects.toThrow('Could not record purchase: check violation');
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].query.get('id')).toBe('eq.p1');
  });
});

describe('addInstances', () => {
  it('ensures the profile and inserts the requested quantity without a purchase', async () => {
    const { calls, record } = recorder();
    server.use(
      http.post(`${REST}/user_profiles`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
      http.post(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
    );
    await addInstances(USER, { itemId: 'tire:rw32', variantProductCode: 'BR-03' }, 3, client);
    expect(calls[0].path).toBe('/rest/v1/user_profiles');
    expect(calls[1].body).toEqual(
      Array(3).fill({ profile_id: USER, item_id: 'tire:rw32', variant_product_code: 'BR-03' }),
    );
  });

  it('allows an unknown source', async () => {
    const { calls, record } = recorder();
    server.use(
      profileOk,
      http.post(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 201 });
      }),
    );
    await addInstances(USER, { itemId: 'tire:rw32', variantProductCode: null }, 1, client);
    expect(calls[0].body).toEqual([
      { profile_id: USER, item_id: 'tire:rw32', variant_product_code: null },
    ]);
  });

  it('rejects a quantity below one', async () => {
    await expect(
      addInstances(USER, { itemId: 'tire:rw32', variantProductCode: null }, 0, client),
    ).rejects.toThrow('Could not add items: quantity must be at least 1');
  });
});

describe('instance updates', () => {
  it('retires an instance with a note', async () => {
    const { calls, record } = recorder();
    server.use(
      http.patch(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await setInstanceStatus('i1', 'retired', 'cracked', client);
    expect(calls[0].query.get('id')).toBe('eq.i1');
    expect(calls[0].body).toMatchObject({ status: 'retired', note: 'cracked' });
    expect(calls[0].body).toHaveProperty('updated_at');
  });

  it('reactivates without touching the note', async () => {
    const { calls, record } = recorder();
    server.use(
      http.patch(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await setInstanceStatus('i1', 'active', undefined, client);
    expect(calls[0].body).not.toHaveProperty('note');
    expect(calls[0].body).toMatchObject({ status: 'active' });
  });

  it('updates the note', async () => {
    const { calls, record } = recorder();
    server.use(
      http.patch(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await updateInstanceNote('i1', 'spare', client);
    expect(calls[0].body).toMatchObject({ note: 'spare' });
  });

  it('names the failed action', async () => {
    server.use(
      http.patch(`${REST}/br_instances`, () =>
        HttpResponse.json({ message: 'nope' }, { status: 403 }),
      ),
    );
    await expect(setInstanceStatus('i1', 'retired', undefined, client)).rejects.toThrow(
      'Could not retire item: nope',
    );
  });
});

describe('deletes', () => {
  it('deletes one instance by id', async () => {
    const { calls, record } = recorder();
    server.use(
      http.delete(`${REST}/br_instances`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deleteInstance('i1', client);
    expect(calls[0].query.get('id')).toBe('eq.i1');
  });

  it('deletes one purchase by id and relies on the cascade for its instances', async () => {
    const { calls, record } = recorder();
    server.use(
      http.delete(`${REST}/br_purchases`, async ({ request }) => {
        await record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await deletePurchase('p1', client);
    expect(calls).toHaveLength(1);
    expect(calls[0].query.get('id')).toBe('eq.p1');
  });
});
