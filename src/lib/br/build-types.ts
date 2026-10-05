/** Rows of the Baraba Ride build tables, as the app reads them. */
import type { Slot } from './types';

export type BuildStatus = 'plan' | 'built';

/** Where a part sits on a machine. Tires are held per wheel. */
export type Position =
  'bumper' | 'cowl' | 'chassis' | 'tire_fl' | 'tire_fr' | 'tire_rl' | 'tire_rr';

/** Editor order: bumper leading, then front to rear. */
export const POSITIONS: Position[] = [
  'bumper',
  'tire_fl',
  'tire_fr',
  'cowl',
  'chassis',
  'tire_rl',
  'tire_rr',
];

export const TIRE_POSITIONS: Position[] = ['tire_fl', 'tire_fr', 'tire_rl', 'tire_rr'];

/** The part slot a position accepts. Any tire fits any wheel. */
export function positionSlot(position: Position): Slot {
  return position.startsWith('tire_') ? 'tire' : (position as Slot);
}

/**
 * One filled position. With `instanceId` null it is a plan's wish: a part and,
 * optionally, the product it should come from. With `instanceId` set it is a
 * claim, and `itemId` and `variantProductCode` are the instance's own.
 */
export interface BuildPart {
  position: Position;
  /** Part id, e.g. `tire:h36`. */
  itemId: string;
  /** Source product naming the variant; null means any variant. */
  variantProductCode: string | null;
  instanceId: string | null;
}

/** A named machine. Positions with no entry in `parts` are empty. */
export interface Build {
  id: string;
  profileId: string;
  name: string;
  status: BuildStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
  parts: BuildPart[];
}

/** What a plan position is set to. */
export interface PlanPart {
  position: Position;
  itemId: string;
  variantProductCode: string | null;
}

/** The instance chosen for each position when a plan is marked built. */
export type Assignment = Partial<Record<Position, string>>;

/** Database column shapes, snake_case as PostgREST returns them. */
export interface BuildPartRow {
  position: Position;
  item_id: string;
  variant_product_code: string | null;
  instance_id: string | null;
}

export interface BuildRow {
  id: string;
  profile_id: string;
  name: string;
  status: BuildStatus;
  note: string;
  created_at: string;
  updated_at: string;
  /** Embedded parts; absent on a row returned by an insert. */
  br_build_parts?: BuildPartRow[];
}

export function buildPartFromRow(row: BuildPartRow): BuildPart {
  return {
    position: row.position,
    itemId: row.item_id,
    variantProductCode: row.variant_product_code,
    instanceId: row.instance_id,
  };
}

export function buildFromRow(row: BuildRow): Build {
  return {
    id: row.id,
    profileId: row.profile_id,
    name: row.name,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parts: (row.br_build_parts ?? []).map(buildPartFromRow),
  };
}
