import { describe, it, expect } from 'vitest';
import { POSITIONS, buildFromRow, positionSlot, type BuildRow } from './build-types';

describe('positionSlot', () => {
  it('maps every wheel to the tire slot and the rest to their own slot', () => {
    expect(POSITIONS.map(positionSlot)).toEqual([
      'bumper',
      'tire',
      'tire',
      'cowl',
      'chassis',
      'tire',
      'tire',
    ]);
  });
});

describe('buildFromRow', () => {
  const row: BuildRow = {
    id: 'b1',
    profile_id: 'u',
    name: 'Red Dash',
    status: 'built',
    note: 'fast',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
    br_build_parts: [
      {
        position: 'cowl',
        item_id: 'cowl:storm-falcon',
        variant_product_code: 'BR-01',
        instance_id: 'i1',
      },
    ],
  };

  it('maps a build and its embedded parts to camelCase', () => {
    expect(buildFromRow(row)).toEqual({
      id: 'b1',
      profileId: 'u',
      name: 'Red Dash',
      status: 'built',
      note: 'fast',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-02T00:00:00Z',
      parts: [
        {
          position: 'cowl',
          itemId: 'cowl:storm-falcon',
          variantProductCode: 'BR-01',
          instanceId: 'i1',
        },
      ],
    });
  });

  it('gives a row without embedded parts no positions', () => {
    expect(buildFromRow({ ...row, br_build_parts: undefined }).parts).toEqual([]);
  });
});
