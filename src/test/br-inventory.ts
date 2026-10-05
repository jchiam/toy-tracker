/**
 * Builders for inventory state in component tests and stories. Free of
 * vitest so stories can import it; tests pass `vi.fn` as the wrapper.
 */
import type { BrInventory, BrInventoryActions } from '@/hooks/useBrInventory';
import type { Instance, Purchase } from '@/lib/br/inventory-types';

let seq = 0;

export function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  seq += 1;
  return {
    id: `p${seq}`,
    profileId: 'u',
    productCode: 'BR-01',
    acquiredAt: '2026-10-01',
    note: '',
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

export function makeInstance(overrides: Partial<Instance> = {}): Instance {
  seq += 1;
  return {
    id: `i${seq}`,
    profileId: 'u',
    itemId: 'tire:rw32',
    variantProductCode: 'BR-01',
    purchaseId: null,
    status: 'active',
    condition: null,
    note: '',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

type Wrap = <F extends (...args: never[]) => Promise<void>>(fn: F) => F;

/** Actions that resolve immediately; `wrap` lets tests substitute spies. */
export function makeActions(wrap: Wrap = (fn) => fn): BrInventoryActions {
  const noop = async () => {};
  return {
    recordPurchase: wrap(noop),
    addInstances: wrap(noop),
    setInstanceStatus: wrap(noop),
    updateInstanceNote: wrap(noop),
    deleteInstance: wrap(noop),
    deletePurchase: wrap(noop),
    reload: wrap(noop),
  };
}

export function makeInventory(overrides: Partial<BrInventory> = {}, wrap?: Wrap): BrInventory {
  return {
    purchases: [],
    instances: [],
    loading: false,
    error: null,
    actions: makeActions(wrap),
    ...overrides,
  };
}
