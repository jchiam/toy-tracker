import { describe, it, expect } from 'vitest';
import { findAccessorySources, resolveItem, resolveProductContents } from './catalog';

describe('resolveItem', () => {
  it('resolves a part id to its part', () => {
    expect(resolveItem('cowl:storm-falcon')).toMatchObject({
      kind: 'part',
      part: { id: 'cowl:storm-falcon', slot: 'cowl' },
    });
  });

  it('resolves an accessory id to its accessory', () => {
    expect(resolveItem('charger:ride-charger')).toMatchObject({
      kind: 'accessory',
      accessory: { id: 'charger:ride-charger', kind: 'charger', nameEn: 'Ride Charger' },
    });
  });

  it('returns null for an id the catalog does not know', () => {
    expect(resolveItem('cowl:ghost')).toBeNull();
    expect(resolveItem('sticker:any')).toBeNull();
  });
});

describe('resolveProductContents', () => {
  it('lists mapped parts then accessories with quantities for a starter set', () => {
    const lines = resolveProductContents('BR-01')!;
    const ids = lines.map((l) =>
      l.item.kind === 'part' ? [l.item.part.id, l.quantity] : [l.item.accessory.id, l.quantity],
    );
    expect(ids).toEqual([
      ['cowl:storm-falcon', 1],
      ['bumper:dual-blade', 1],
      ['tire:rw32', 2],
      ['tire:lw32', 2],
      ['chassis:alpha', 1],
      ['charger:ride-charger', 1],
    ]);
    expect(lines.at(-1)?.variant).toBeUndefined();
  });

  it('yields exactly one colosseum for BR-10', () => {
    expect(resolveProductContents('BR-10')).toEqual([
      {
        item: { kind: 'accessory', accessory: expect.objectContaining({ kind: 'colosseum' }) },
        quantity: 1,
      },
    ]);
  });

  it('omits printed contents that have no mapping line', () => {
    const lines = resolveProductContents('BR-01')!;
    expect(
      lines.some((l) => l.item.kind === 'accessory' && l.item.accessory.kind !== 'charger'),
    ).toBe(false);
  });

  it('returns null for an unmapped product', () => {
    expect(resolveProductContents('BR-99')).toBeNull();
  });
});

describe('findAccessorySources', () => {
  it('lists every charger product in catalog order', () => {
    expect(findAccessorySources('charger:ride-charger').map((s) => s.product.code)).toEqual([
      'BR-01',
      'BR-02',
      'BR-03',
      'BR-04',
      'BR-05',
      'BR-06',
    ]);
  });

  it('is empty for an unknown accessory', () => {
    expect(findAccessorySources('charger:ghost')).toEqual([]);
  });
});
