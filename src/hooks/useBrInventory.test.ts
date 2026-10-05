import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBrInventory } from './useBrInventory';
import * as inventory from '@/services/br/inventory';
import type { Instance, Purchase } from '@/lib/br/inventory-types';

vi.mock('@/services/br/inventory', () => ({
  listPurchases: vi.fn(),
  listInstances: vi.fn(),
  recordPurchase: vi.fn(),
  addInstances: vi.fn(),
  setInstanceStatus: vi.fn(),
  updateInstanceNote: vi.fn(),
  deleteInstance: vi.fn(),
  deletePurchase: vi.fn(),
}));

const listPurchases = vi.mocked(inventory.listPurchases);
const listInstances = vi.mocked(inventory.listInstances);
const recordPurchase = vi.mocked(inventory.recordPurchase);

const purchase: Purchase = {
  id: 'p1',
  profileId: 'u',
  productCode: 'BR-01',
  acquiredAt: '2026-10-01',
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
};
const instance: Instance = {
  id: 'i1',
  profileId: 'u',
  itemId: 'tire:rw32',
  variantProductCode: 'BR-01',
  purchaseId: 'p1',
  status: 'active',
  condition: null,
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBrInventory', () => {
  it('loads purchases and instances for the user', async () => {
    listPurchases.mockResolvedValue([purchase]);
    listInstances.mockResolvedValue([instance]);

    const { result } = renderHook(() => useBrInventory('u'));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.purchases).toEqual([purchase]);
    expect(result.current.instances).toEqual([instance]);
    expect(result.current.error).toBeNull();
    expect(listPurchases).toHaveBeenCalledWith('u');
    expect(listInstances).toHaveBeenCalledWith('u');
  });

  it('exposes the load error and stops loading', async () => {
    listPurchases.mockRejectedValue(new Error('Could not load purchases: down'));
    listInstances.mockResolvedValue([]);

    const { result } = renderHook(() => useBrInventory('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Could not load purchases: down');
  });

  it('refetches after a successful write', async () => {
    listPurchases.mockResolvedValueOnce([]).mockResolvedValueOnce([purchase]);
    listInstances.mockResolvedValueOnce([]).mockResolvedValueOnce([instance]);
    recordPurchase.mockResolvedValue(purchase);

    const { result } = renderHook(() => useBrInventory('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instances).toEqual([]);

    await act(() =>
      result.current.actions.recordPurchase({ productCode: 'BR-01', acquiredAt: '2026-10-01' }),
    );

    expect(recordPurchase).toHaveBeenCalledWith('u', {
      productCode: 'BR-01',
      acquiredAt: '2026-10-01',
    });
    expect(result.current.purchases).toEqual([purchase]);
    expect(result.current.instances).toEqual([instance]);
  });

  it('routes every other action through the service and reloads', async () => {
    listPurchases.mockResolvedValue([]);
    listInstances.mockResolvedValue([]);
    const { result } = renderHook(() => useBrInventory('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() =>
      result.current.actions.addInstances({ itemId: 'tire:rw32', variantProductCode: null }, 2),
    );
    await act(() => result.current.actions.setInstanceStatus('i1', 'retired', 'cracked'));
    await act(() => result.current.actions.updateInstanceNote('i1', 'spare'));
    await act(() => result.current.actions.deleteInstance('i1'));
    await act(() => result.current.actions.deletePurchase('p1'));
    await act(() => result.current.actions.reload());

    expect(inventory.addInstances).toHaveBeenCalledWith(
      'u',
      { itemId: 'tire:rw32', variantProductCode: null },
      2,
    );
    expect(inventory.setInstanceStatus).toHaveBeenCalledWith('i1', 'retired', 'cracked');
    expect(inventory.updateInstanceNote).toHaveBeenCalledWith('i1', 'spare');
    expect(inventory.deleteInstance).toHaveBeenCalledWith('i1');
    expect(inventory.deletePurchase).toHaveBeenCalledWith('p1');
    // initial load + one reload per action + explicit reload
    expect(listInstances).toHaveBeenCalledTimes(7);
  });

  it('records the error when a reload after a write fails', async () => {
    listPurchases.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('reload down'));
    listInstances.mockResolvedValue([]);
    const { result } = renderHook(() => useBrInventory('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.actions.deleteInstance('i1'));
    expect(result.current.error).toBe('reload down');
  });

  it('keeps shown data and records the error when a write fails', async () => {
    listPurchases.mockResolvedValue([purchase]);
    listInstances.mockResolvedValue([instance]);
    recordPurchase.mockRejectedValue(new Error('Could not record purchase: nope'));

    const { result } = renderHook(() => useBrInventory('u'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let thrown: unknown;
    await act(async () => {
      await result.current.actions
        .recordPurchase({ productCode: 'BR-01', acquiredAt: '2026-10-01' })
        .catch((err: unknown) => {
          thrown = err;
        });
    });

    expect(thrown).toBeInstanceOf(Error);
    expect(result.current.error).toBe('Could not record purchase: nope');
    expect(result.current.instances).toEqual([instance]);
    expect(listInstances).toHaveBeenCalledTimes(1);
  });
});
