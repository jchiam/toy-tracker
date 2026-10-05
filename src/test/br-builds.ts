/**
 * Builders for build state in tests and stories. Free of vitest so stories
 * can import it; tests pass `vi.fn` as the wrapper.
 */
import type { BrBuilds, BrBuildsActions } from '@/hooks/useBrBuilds';
import type { Build, BuildPart, Position } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';

let seq = 0;

export function makeBuildPart(overrides: Partial<BuildPart> = {}): BuildPart {
  return {
    position: 'cowl',
    itemId: 'cowl:storm-falcon',
    variantProductCode: null,
    instanceId: null,
    ...overrides,
  };
}

export function makeBuild(overrides: Partial<Build> = {}): Build {
  seq += 1;
  return {
    id: `b${seq}`,
    profileId: 'u',
    name: `Build ${seq}`,
    status: 'plan',
    note: '',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    parts: [],
    ...overrides,
  };
}

/** A plan position wishing for a part, optionally from one product. */
export function wish(
  position: Position,
  itemId: string,
  variantProductCode: string | null = null,
): BuildPart {
  return makeBuildPart({ position, itemId, variantProductCode });
}

/** A built position holding an instance, described by that instance. */
export function claim(position: Position, instance: Instance): BuildPart {
  return makeBuildPart({
    position,
    itemId: instance.itemId,
    variantProductCode: instance.variantProductCode,
    instanceId: instance.id,
  });
}

type Wrap = <F extends (...args: never[]) => Promise<unknown>>(fn: F) => F;

/** Actions that resolve immediately; `wrap` lets tests substitute spies. */
export function makeBuildsActions(wrap: Wrap = (fn) => fn): BrBuildsActions {
  const noop = async () => {};
  return {
    createBuild: wrap(async (name: string) => makeBuild({ name })),
    updateBuild: wrap(noop),
    deleteBuild: wrap(noop),
    setPlanPositions: wrap(noop),
    clearPlanPosition: wrap(noop),
    swapBuiltPosition: wrap(noop),
    markBuilt: wrap(noop),
    takeApart: wrap(noop),
    reload: wrap(noop),
  };
}

export function makeBuildsState(overrides: Partial<BrBuilds> = {}, wrap?: Wrap): BrBuilds {
  return {
    builds: [],
    loading: false,
    error: null,
    actions: makeBuildsActions(wrap),
    ...overrides,
  };
}
