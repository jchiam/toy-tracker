import { useCallback, useEffect, useState } from 'react';
import * as service from '@/services/br/builds';
import type { Assignment, Build, PlanPart, Position } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';

export interface BrBuildsActions {
  /** Resolves to the new build so the caller can open it. */
  createBuild: (name: string) => Promise<Build>;
  updateBuild: (buildId: string, patch: service.BuildPatch) => Promise<void>;
  deleteBuild: (buildId: string) => Promise<void>;
  setPlanPositions: (buildId: string, parts: PlanPart[]) => Promise<void>;
  clearPlanPosition: (buildId: string, position: Position) => Promise<void>;
  swapBuiltPosition: (buildId: string, position: Position, instance: Instance) => Promise<void>;
  markBuilt: (buildId: string, claims: Assignment) => Promise<void>;
  takeApart: (buildId: string) => Promise<void>;
  reload: () => Promise<void>;
}

export interface BrBuilds {
  builds: Build[];
  /** True until the first load settles. */
  loading: boolean;
  /** Message of the last failed load or write; cleared by the next success. */
  error: string | null;
  actions: BrBuildsActions;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Loads the signed-in user's Baraba Ride builds once and exposes actions that
 * write through the service and refetch on success. Data already shown is
 * kept when a load or write fails.
 */
export function useBrBuilds(userId: string): BrBuilds {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setBuilds(await service.listBuilds(userId));
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    service
      .listBuilds(userId)
      .then((next) => {
        if (cancelled) return;
        setBuilds(next);
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
    async <T>(write: () => Promise<T>): Promise<T> => {
      let result: T;
      try {
        result = await write();
      } catch (err) {
        setError(message(err));
        throw err;
      }
      await reload();
      return result;
    },
    [reload],
  );

  const actions: BrBuildsActions = {
    createBuild: (name) => run(() => service.createBuild(userId, name)),
    updateBuild: (id, patch) => run(() => service.updateBuild(id, patch)),
    deleteBuild: (id) => run(() => service.deleteBuild(id)),
    setPlanPositions: (id, parts) => run(() => service.setPlanPositions(id, parts)),
    clearPlanPosition: (id, position) => run(() => service.clearPlanPosition(id, position)),
    swapBuiltPosition: (id, position, instance) =>
      run(() => service.swapBuiltPosition(id, position, instance)),
    markBuilt: (id, claims) => run(() => service.markBuilt(id, claims)),
    takeApart: (id) => run(() => service.takeApart(id)),
    reload,
  };

  return { builds, loading, error, actions };
}
