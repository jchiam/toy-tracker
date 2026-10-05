import { POSITIONS, positionSlot } from './build-types';
import type { Assignment, Build, BuildPart, Position } from './build-types';
import type { Instance } from './inventory-types';

/** Longest build name the database accepts. */
export const BUILD_NAME_MAX = 60;

/** Why a build name cannot be saved, or null when it can. */
export function buildNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'A name is required.';
  if (trimmed.length > BUILD_NAME_MAX) return `A name can be at most ${BUILD_NAME_MAX} characters.`;
  return null;
}

/** Oldest first. Instances from one purchase share a timestamp, so id breaks ties. */
function byAge(a: Instance, b: Instance): number {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/** The build holding each claimed instance, by instance id. */
export function claims(builds: Build[]): Map<string, Build> {
  const held = new Map<string, Build>();
  for (const build of builds) {
    for (const part of build.parts) {
      if (part.instanceId) held.set(part.instanceId, build);
    }
  }
  return held;
}

/** Active instances no build holds, oldest first. */
export function freeInstances(instances: Instance[], builds: Build[]): Instance[] {
  const held = claims(builds);
  return instances.filter((i) => i.status === 'active' && !held.has(i.id)).sort(byAge);
}

/** How many of the given instances are active and held by a build. */
export function countInBuilds(instances: Instance[], held: Map<string, Build>): number {
  return instances.filter((i) => i.status === 'active' && held.has(i.id)).length;
}

/**
 * Whether an instance can fill a position's wish: the same part and, when the
 * wish names a variant, that source product. An instance of unknown source
 * therefore only fills any-variant wishes.
 */
export function matchesPart(
  instance: Instance,
  part: Pick<BuildPart, 'itemId' | 'variantProductCode'>,
): boolean {
  return (
    instance.itemId === part.itemId &&
    (part.variantProductCode === null || part.variantProductCode === instance.variantProductCode)
  );
}

export type PositionCheck =
  | { position: Position; state: 'empty' }
  | { position: Position; state: 'available'; part: BuildPart; instance: Instance }
  | { position: Position; state: 'in-use'; part: BuildPart; heldBy: Build[] }
  | { position: Position; state: 'missing'; part: BuildPart };

/**
 * Checks a plan on its own against the free parts, one result per position in
 * editor order. Positions never share an instance. Positions naming a variant
 * are served first: they accept only that variant while any-variant positions
 * accept everything, so this order never fails a plan another order could
 * satisfy. Each position takes the oldest free match left. A position left
 * without one is in use when a build holds a matching instance, else missing.
 */
export function checkPlan(build: Build, instances: Instance[], builds: Build[]): PositionCheck[] {
  const held = claims(builds);
  const free = freeInstances(instances, builds);
  const taken = new Set<string>();
  const assigned = new Map<Position, Instance>();

  const filled = POSITIONS.flatMap((position) => {
    const part = build.parts.find((p) => p.position === position);
    return part ? [part] : [];
  });
  const specificFirst = [
    ...filled.filter((p) => p.variantProductCode !== null),
    ...filled.filter((p) => p.variantProductCode === null),
  ];
  for (const part of specificFirst) {
    const instance = free.find((i) => !taken.has(i.id) && matchesPart(i, part));
    if (instance) {
      taken.add(instance.id);
      assigned.set(part.position, instance);
    }
  }

  return POSITIONS.map((position): PositionCheck => {
    const part = filled.find((p) => p.position === position);
    if (!part) return { position, state: 'empty' };
    const instance = assigned.get(position);
    if (instance) return { position, state: 'available', part, instance };

    const heldBy: Build[] = [];
    for (const candidate of instances) {
      const holder = held.get(candidate.id);
      if (
        holder &&
        candidate.status === 'active' &&
        matchesPart(candidate, part) &&
        !heldBy.includes(holder)
      ) {
        heldBy.push(holder);
      }
    }
    return heldBy.length > 0
      ? { position, state: 'in-use', part, heldBy }
      : { position, state: 'missing', part };
  });
}

export type PlanReadiness =
  { state: 'ready' } | { state: 'incomplete' } | { state: 'short'; count: number };

/** Ready when every position is available; incomplete while any is empty. */
export function planReadiness(check: PositionCheck[]): PlanReadiness {
  if (check.some((c) => c.state === 'empty')) return { state: 'incomplete' };
  const count = check.filter((c) => c.state !== 'available').length;
  return count === 0 ? { state: 'ready' } : { state: 'short', count };
}

/** The instance the check assigned to each available position. */
export function defaultAssignment(check: PositionCheck[]): Assignment {
  const assignment: Assignment = {};
  for (const c of check) {
    if (c.state === 'available') assignment[c.position] = c.instance.id;
  }
  return assignment;
}

/**
 * Gives a position another instance while marking built. When another position
 * already has that instance, the two trade; if the displaced instance does not
 * fit the other position, that position takes its oldest unassigned free match
 * instead. Null when the instance does not fit or the other position would be
 * left with nothing.
 */
export function reassign(
  build: Build,
  assignment: Assignment,
  position: Position,
  instanceId: string,
  instances: Instance[],
  builds: Build[],
): Assignment | null {
  const part = build.parts.find((p) => p.position === position);
  const free = freeInstances(instances, builds);
  const instance = free.find((i) => i.id === instanceId);
  if (!part || !instance || !matchesPart(instance, part)) return null;
  if (assignment[position] === instanceId) return assignment;

  const next: Assignment = { ...assignment, [position]: instanceId };
  const other = POSITIONS.find((p) => p !== position && assignment[p] === instanceId);
  if (!other) return next;

  const otherPart = build.parts.find((p) => p.position === other);
  if (!otherPart) return null;
  const used = new Set(Object.values(next).filter((id) => id !== instanceId));
  used.add(instanceId);
  const displaced = free.find((i) => i.id === assignment[position]);
  const replacement =
    displaced && matchesPart(displaced, otherPart)
      ? displaced
      : free.find((i) => !used.has(i.id) && matchesPart(i, otherPart));
  if (!replacement) return null;
  next[other] = replacement.id;
  return next;
}

/** Free instances a position could be given while marking built, oldest first. */
export function candidates(
  build: Build,
  assignment: Assignment,
  position: Position,
  instances: Instance[],
  builds: Build[],
): Instance[] {
  return freeInstances(instances, builds).filter(
    (i) => reassign(build, assignment, position, i.id, instances, builds) !== null,
  );
}

/**
 * Instances a built build's position can hold: the one it holds now plus every
 * free instance of the position's slot, of any part, oldest first.
 */
export function swapCandidates(
  build: Build,
  position: Position,
  instances: Instance[],
  builds: Build[],
): Instance[] {
  const slot = positionSlot(position);
  const currentId = build.parts.find((p) => p.position === position)?.instanceId;
  const current = instances.find((i) => i.id === currentId);
  const free = freeInstances(instances, builds).filter((i) => i.itemId.startsWith(`${slot}:`));
  return [...(current ? [current] : []), ...free].sort(byAge);
}
