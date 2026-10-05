import { resolveItem, type CatalogItem } from './catalog';
import { ACCESSORY_KINDS, SLOTS, type AccessoryKind, type Slot } from './types';
import type { Instance, Purchase } from './inventory-types';

export interface StatusCounts {
  active: number;
  retired: number;
}

/** Every instance of one catalogued item, with counts by status. */
export interface ItemGroup {
  itemId: string;
  /** Null when the catalog no longer knows the id; the raw id is still shown. */
  item: CatalogItem | null;
  instances: Instance[];
  counts: StatusCounts;
}

/** Items of one slot or accessory kind, in catalog order. */
export interface ItemSection {
  key: Slot | AccessoryKind | 'unknown';
  groups: ItemGroup[];
}

export function countByStatus(instances: Instance[]): StatusCounts {
  return instances.reduce(
    (counts, instance) => ({ ...counts, [instance.status]: counts[instance.status] + 1 }),
    { active: 0, retired: 0 },
  );
}

function sectionKey(item: CatalogItem | null): ItemSection['key'] {
  if (!item) return 'unknown';
  return item.kind === 'part' ? item.part.slot : item.accessory.kind;
}

function displayName(group: ItemGroup): string {
  if (!group.item) return group.itemId;
  return group.item.kind === 'part' ? group.item.part.nameEn : group.item.accessory.nameEn;
}

/**
 * Groups instances by item id, then arranges the groups into sections: the
 * four part slots, then accessory kinds, then anything the catalog no longer
 * resolves. Sections with no instances are omitted. Within a section, items
 * are ordered by name; within an item, instances keep their given order.
 */
export function groupInstancesByItem(
  instances: Instance[],
  resolve: (itemId: string) => CatalogItem | null = resolveItem,
): ItemSection[] {
  const byItem = new Map<string, Instance[]>();
  for (const instance of instances) {
    const list = byItem.get(instance.itemId);
    if (list) list.push(instance);
    else byItem.set(instance.itemId, [instance]);
  }

  const groups: ItemGroup[] = [...byItem].map(([itemId, list]) => ({
    itemId,
    item: resolve(itemId),
    instances: list,
    counts: countByStatus(list),
  }));

  const keys: ItemSection['key'][] = [...SLOTS, ...ACCESSORY_KINDS, 'unknown'];
  return keys.flatMap((key) => {
    const members = groups
      .filter((group) => sectionKey(group.item) === key)
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
    return members.length > 0 ? [{ key, groups: members }] : [];
  });
}

/** Newest acquisition first; ties broken by creation time, newest first. */
export function sortPurchases(purchases: Purchase[]): Purchase[] {
  return [...purchases].sort(
    (a, b) => b.acquiredAt.localeCompare(a.acquiredAt) || b.createdAt.localeCompare(a.createdAt),
  );
}
