import { describe, it, expect } from 'vitest';
import { countByStatus, groupInstancesByItem, sortPurchases } from './inventory';
import type { Instance, InstanceStatus, Purchase } from './inventory-types';

let seq = 0;
const instance = (itemId: string, status: InstanceStatus = 'active'): Instance => ({
  id: `i${++seq}`,
  profileId: 'u',
  itemId,
  variantProductCode: null,
  purchaseId: null,
  status,
  condition: null,
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

describe('countByStatus', () => {
  it('counts active and retired separately', () => {
    expect(
      countByStatus([
        instance('tire:rw32'),
        instance('tire:rw32'),
        instance('tire:rw32', 'retired'),
      ]),
    ).toEqual({ active: 2, retired: 1 });
  });

  it('is zero for nothing', () => {
    expect(countByStatus([])).toEqual({ active: 0, retired: 0 });
  });
});

describe('groupInstancesByItem', () => {
  it('groups by item with counts, sections by slot then accessory kind, omitting empties', () => {
    const sections = groupInstancesByItem([
      instance('charger:ride-charger'),
      instance('tire:rw32'),
      instance('tire:rw32', 'retired'),
      instance('cowl:storm-falcon'),
      instance('tire:rw32'),
    ]);
    expect(sections.map((s) => s.key)).toEqual(['cowl', 'tire', 'charger']);
    const tires = sections[1];
    expect(tires.groups).toHaveLength(1);
    expect(tires.groups[0]).toMatchObject({
      itemId: 'tire:rw32',
      counts: { active: 2, retired: 1 },
    });
    expect(tires.groups[0].instances).toHaveLength(3);
    expect(sections[2].groups[0].item).toMatchObject({ kind: 'accessory' });
  });

  it('orders items within a section by English name', () => {
    const [cowls] = groupInstancesByItem([
      instance('cowl:storm-falcon'),
      instance('cowl:fury-lizard'),
      instance('cowl:lash-stallion'),
    ]);
    expect(cowls.groups.map((g) => g.item && g.item.kind === 'part' && g.item.part.nameEn)).toEqual(
      ['Fury Lizard', 'Lash Stallion', 'Storm Falcon'],
    );
  });

  it('keeps instances the catalog no longer knows under an unknown section with the raw id', () => {
    const sections = groupInstancesByItem([instance('tire:rw32'), instance('cowl:ghost')]);
    expect(sections.map((s) => s.key)).toEqual(['tire', 'unknown']);
    expect(sections[1].groups[0]).toMatchObject({ itemId: 'cowl:ghost', item: null });
  });

  it('is empty for no instances', () => {
    expect(groupInstancesByItem([])).toEqual([]);
  });
});

describe('sortPurchases', () => {
  const purchase = (id: string, acquiredAt: string, createdAt: string): Purchase => ({
    id,
    profileId: 'u',
    productCode: 'BR-01',
    acquiredAt,
    note: '',
    createdAt,
  });

  it('orders newest acquisition first, then newest record first, without mutating', () => {
    const input = [
      purchase('old', '2026-09-01', '2026-09-01T00:00:00Z'),
      purchase('new-early', '2026-10-01', '2026-10-01T08:00:00Z'),
      purchase('new-late', '2026-10-01', '2026-10-01T09:00:00Z'),
    ];
    expect(sortPurchases(input).map((p) => p.id)).toEqual(['new-late', 'new-early', 'old']);
    expect(input.map((p) => p.id)).toEqual(['old', 'new-early', 'new-late']);
  });
});
