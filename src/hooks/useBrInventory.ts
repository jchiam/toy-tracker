import { useCallback, useEffect, useState } from 'react';
import * as inventory from '@/services/br/inventory';
import type { Instance, InstanceStatus, NewInstance, Purchase } from '@/lib/br/inventory-types';

export interface BrInventoryActions {
  recordPurchase: (input: inventory.RecordPurchaseInput) => Promise<void>;
  addInstances: (item: NewInstance, quantity: number) => Promise<void>;
  setInstanceStatus: (instanceId: string, status: InstanceStatus, note?: string) => Promise<void>;
  updateInstanceNote: (instanceId: string, note: string) => Promise<void>;
  deleteInstance: (instanceId: string) => Promise<void>;
  deletePurchase: (purchaseId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export interface BrInventory {
  purchases: Purchase[];
  instances: Instance[];
  /** True until the first load settles. */
  loading: boolean;
  /** Message of the last failed load or write; cleared by the next success. */
  error: string | null;
  actions: BrInventoryActions;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Loads the signed-in user's Baraba Ride inventory once and exposes actions
 * that write through the service and refetch on success. Data already shown
 * is kept when a load or write fails.
 */
export function useBrInventory(userId: string): BrInventory {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [nextPurchases, nextInstances] = await Promise.all([
        inventory.listPurchases(userId),
        inventory.listInstances(userId),
      ]);
      setPurchases(nextPurchases);
      setInstances(nextInstances);
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([inventory.listPurchases(userId), inventory.listInstances(userId)])
      .then(([nextPurchases, nextInstances]) => {
        if (cancelled) return;
        setPurchases(nextPurchases);
        setInstances(nextInstances);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(message(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const run = useCallback(
    async (write: () => Promise<unknown>) => {
      try {
        await write();
      } catch (err) {
        setError(message(err));
        throw err;
      }
      await reload();
    },
    [reload],
  );

  const actions: BrInventoryActions = {
    recordPurchase: (input) => run(() => inventory.recordPurchase(userId, input)),
    addInstances: (item, quantity) => run(() => inventory.addInstances(userId, item, quantity)),
    setInstanceStatus: (id, status, note) =>
      run(() => inventory.setInstanceStatus(id, status, note)),
    updateInstanceNote: (id, note) => run(() => inventory.updateInstanceNote(id, note)),
    deleteInstance: (id) => run(() => inventory.deleteInstance(id)),
    deletePurchase: (id) => run(() => inventory.deletePurchase(id)),
    reload,
  };

  return { purchases, instances, loading, error, actions };
}
