import { describe, it, expect } from 'vitest';
import {
  buildNameError,
  candidates,
  checkPlan,
  claims,
  countInBuilds,
  defaultAssignment,
  freeInstances,
  planReadiness,
  reassign,
  swapCandidates,
} from './builds';
import { TIRE_POSITIONS } from './build-types';
import type { Build, Position } from './build-types';
import type { Instance } from './inventory-types';
import { makeInstance } from '@/test/br-inventory';
import { claim, makeBuild, wish } from '@/test/br-builds';

/** An instance with a fixed id, so oldest-first ties resolve predictably. */
const inst = (id: string, itemId: string, overrides: Partial<Instance> = {}): Instance =>
  makeInstance({ id, itemId, ...overrides });

const stateOf = (build: Build, instances: Instance[], builds: Build[], position: Position) =>
  checkPlan(build, instances, builds).find((c) => c.position === position)!;

/** A plan wishing for one part on every position. */
const fullPlan = (tire = 'tire:h36'): Build =>
  makeBuild({
    parts: [
      wish('bumper', 'bumper:dual-blade'),
      wish('cowl', 'cowl:storm-falcon'),
      wish('chassis', 'chassis:alpha'),
      ...TIRE_POSITIONS.map((position) => wish(position, tire)),
    ],
  });

const fullStock = (): Instance[] => [
  inst('bu', 'bumper:dual-blade'),
  inst('co', 'cowl:storm-falcon'),
  inst('ch', 'chassis:alpha'),
  inst('t1', 'tire:h36', { variantProductCode: 'BR-02' }),
  inst('t2', 'tire:h36', { variantProductCode: 'BR-02' }),
  inst('t3', 'tire:h36', { variantProductCode: 'BR-02' }),
  inst('t4', 'tire:h36', { variantProductCode: 'BR-02' }),
];

describe('buildNameError', () => {
  it('requires a non-blank name of at most 60 characters', () => {
    expect(buildNameError('   ')).toBe('A name is required.');
    expect(buildNameError('x'.repeat(61))).toBe('A name can be at most 60 characters.');
    expect(buildNameError(` ${'x'.repeat(60)} `)).toBeNull();
  });
});

describe('claims and freeInstances', () => {
  const held = inst('a', 'chassis:alpha');
  const spare = inst('b', 'chassis:alpha');
  const retired = inst('c', 'chassis:alpha', { status: 'retired' });
  const built = makeBuild({ status: 'built', parts: [claim('chassis', held)] });
  const plan = makeBuild({ parts: [wish('chassis', 'chassis:alpha')] });

  it('maps each claimed instance to its build and ignores plan wishes', () => {
    const map = claims([built, plan]);
    expect([...map.keys()]).toEqual(['a']);
    expect(map.get('a')).toBe(built);
  });

  it('leaves out claimed and retired instances', () => {
    expect(freeInstances([held, spare, retired], [built, plan]).map((i) => i.id)).toEqual(['b']);
  });

  it('orders free instances oldest first, breaking ties by id', () => {
    const free = freeInstances(
      [
        inst('z', 'tire:h36', { createdAt: '2026-10-02T00:00:00Z' }),
        inst('y', 'tire:h36', { createdAt: '2026-10-03T00:00:00Z' }),
        inst('x', 'tire:h36', { createdAt: '2026-10-03T00:00:00Z' }),
      ],
      [],
    );
    expect(free.map((i) => i.id)).toEqual(['z', 'x', 'y']);
  });

  it('counts active instances held by builds', () => {
    expect(countInBuilds([held, spare, retired], claims([built]))).toBe(1);
  });
});

describe('checkPlan', () => {
  it('reports empty positions', () => {
    const plan = makeBuild({ parts: [wish('cowl', 'cowl:storm-falcon')] });
    expect(stateOf(plan, [], [plan], 'bumper').state).toBe('empty');
  });

  it('counts demand: four wheels wanting one part need four instances', () => {
    const plan = fullPlan();
    const check = checkPlan(plan, [inst('t1', 'tire:h36'), inst('t2', 'tire:h36')], [plan]);
    expect(
      TIRE_POSITIONS.map((position) => check.find((c) => c.position === position)!.state),
    ).toEqual(['available', 'available', 'missing', 'missing']);
  });

  it('never gives two positions the same instance', () => {
    const plan = fullPlan();
    const check = checkPlan(plan, fullStock(), [plan]);
    const ids = Object.values(defaultAssignment(check));
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
  });

  it('names the built builds holding the only matching instances', () => {
    const alpha = inst('a', 'chassis:alpha');
    const redDash = makeBuild({
      name: 'Red Dash',
      status: 'built',
      parts: [claim('chassis', alpha)],
    });
    const plan = makeBuild({ parts: [wish('chassis', 'chassis:alpha')] });
    const result = stateOf(plan, [alpha], [redDash, plan], 'chassis');
    expect(result).toMatchObject({ state: 'in-use', heldBy: [redDash] });
  });

  it('narrows the match to the named variant', () => {
    const plan = makeBuild({ parts: [wish('tire_fl', 'tire:h36', 'BR-07')] });
    const fromBr02 = inst('t', 'tire:h36', { variantProductCode: 'BR-02' });
    expect(stateOf(plan, [fromBr02], [plan], 'tire_fl').state).toBe('missing');
  });

  it('lets an instance of unknown source fill only any-variant positions', () => {
    const loose = inst('t', 'tire:h36', { variantProductCode: null });
    const any = makeBuild({ parts: [wish('tire_fl', 'tire:h36')] });
    const specific = makeBuild({ parts: [wish('tire_fl', 'tire:h36', 'BR-02')] });
    expect(stateOf(any, [loose], [any], 'tire_fl').state).toBe('available');
    expect(stateOf(specific, [loose], [specific], 'tire_fl').state).toBe('missing');
  });

  it('does not count retired instances', () => {
    const plan = makeBuild({ parts: [wish('cowl', 'cowl:storm-falcon')] });
    const retired = inst('c', 'cowl:storm-falcon', { status: 'retired' });
    expect(stateOf(plan, [retired], [plan], 'cowl').state).toBe('missing');
  });

  it('checks each plan alone: two plans may want the same part', () => {
    const falcon = inst('c', 'cowl:storm-falcon');
    const one = makeBuild({ parts: [wish('cowl', 'cowl:storm-falcon')] });
    const two = makeBuild({ parts: [wish('cowl', 'cowl:storm-falcon')] });
    expect(stateOf(one, [falcon], [one, two], 'cowl').state).toBe('available');
    expect(stateOf(two, [falcon], [one, two], 'cowl').state).toBe('available');
  });

  it('serves variant-specific positions before any-variant ones', () => {
    // The front-left wheel comes first in editor order and would take the
    // older BR-07 tire, leaving the rear wheel that needs BR-07 with nothing.
    const plan = makeBuild({
      parts: [wish('tire_fl', 'tire:h36'), wish('tire_rr', 'tire:h36', 'BR-07')],
    });
    const stock = [
      inst('a', 'tire:h36', { variantProductCode: 'BR-07' }),
      inst('b', 'tire:h36', { variantProductCode: 'BR-02' }),
    ];
    const check = checkPlan(plan, stock, [plan]);
    expect(defaultAssignment(check)).toEqual({ tire_fl: 'b', tire_rr: 'a' });
  });

  it('assigns the oldest free match', () => {
    const plan = makeBuild({ parts: [wish('chassis', 'chassis:alpha')] });
    const stock = [
      inst('new', 'chassis:alpha', { createdAt: '2026-10-05T00:00:00Z' }),
      inst('old', 'chassis:alpha', { createdAt: '2026-10-01T00:00:00Z' }),
    ];
    expect(defaultAssignment(checkPlan(plan, stock, [plan]))).toEqual({ chassis: 'old' });
  });
});

describe('planReadiness', () => {
  it('is ready when every position is available', () => {
    const plan = fullPlan();
    expect(planReadiness(checkPlan(plan, fullStock(), [plan]))).toEqual({ state: 'ready' });
  });

  it('is incomplete while any position is empty', () => {
    const plan = makeBuild({ parts: [wish('cowl', 'cowl:storm-falcon')] });
    expect(planReadiness(checkPlan(plan, [], [plan]))).toEqual({ state: 'incomplete' });
  });

  it('counts the positions a full plan cannot fill', () => {
    const plan = fullPlan();
    const stock = fullStock().filter((i) => i.id !== 't3' && i.id !== 't4');
    expect(planReadiness(checkPlan(plan, stock, [plan]))).toEqual({ state: 'short', count: 2 });
  });
});

describe('candidates and reassign', () => {
  const plan = makeBuild({
    parts: [wish('tire_fl', 'tire:h36'), wish('tire_rr', 'tire:h36', 'BR-07')],
  });
  const a = inst('a', 'tire:h36', { variantProductCode: 'BR-07' });
  const b = inst('b', 'tire:h36', { variantProductCode: 'BR-02' });
  const c = inst('c', 'tire:h36', { variantProductCode: 'BR-07' });

  it('offers free matches and leaves out other parts and claimed instances', () => {
    const taken = inst('d', 'tire:h36', { variantProductCode: 'BR-02' });
    const other = makeBuild({ status: 'built', parts: [claim('tire_fl', taken)] });
    const stock = [a, b, c, taken, inst('e', 'tire:c36')];
    const assignment = defaultAssignment(checkPlan(plan, stock, [plan, other]));
    expect(candidates(plan, assignment, 'tire_fl', stock, [plan, other]).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(candidates(plan, assignment, 'tire_rr', stock, [plan, other]).map((i) => i.id)).toEqual([
      'a',
      'c',
    ]);
  });

  it('moves a position to an unassigned instance', () => {
    const stock = [a, b, c];
    expect(reassign(plan, { tire_fl: 'b', tire_rr: 'a' }, 'tire_rr', 'c', stock, [plan])).toEqual({
      tire_fl: 'b',
      tire_rr: 'c',
    });
  });

  it('trades instances with the position that had the chosen one', () => {
    const any = makeBuild({ parts: [wish('tire_fl', 'tire:h36'), wish('tire_fr', 'tire:h36')] });
    expect(reassign(any, { tire_fl: 'a', tire_fr: 'b' }, 'tire_fl', 'b', [a, b], [any])).toEqual({
      tire_fl: 'b',
      tire_fr: 'a',
    });
  });

  it('finds the other position another match when the displaced one does not fit', () => {
    const stock = [a, b, c];
    expect(reassign(plan, { tire_fl: 'b', tire_rr: 'a' }, 'tire_fl', 'a', stock, [plan])).toEqual({
      tire_fl: 'a',
      tire_rr: 'c',
    });
  });

  it('refuses a choice that would leave the other position with nothing', () => {
    const stock = [a, b];
    expect(
      reassign(plan, { tire_fl: 'b', tire_rr: 'a' }, 'tire_fl', 'a', stock, [plan]),
    ).toBeNull();
    expect(
      candidates(plan, { tire_fl: 'b', tire_rr: 'a' }, 'tire_fl', stock, [plan]).map((i) => i.id),
    ).toEqual(['b']);
  });

  it('refuses an instance that does not match the position', () => {
    expect(reassign(plan, { tire_rr: 'a' }, 'tire_rr', 'b', [a, b], [plan])).toBeNull();
  });
});

describe('swapCandidates', () => {
  it('offers the held instance and free instances of the slot, of any part', () => {
    const held = inst('held', 'tire:h36');
    const elsewhere = inst('elsewhere', 'tire:c36');
    const built = makeBuild({ status: 'built', parts: [claim('tire_fl', held)] });
    const other = makeBuild({ status: 'built', parts: [claim('tire_fl', elsewhere)] });
    const stock = [
      held,
      elsewhere,
      inst('free-c36', 'tire:c36'),
      inst('free-h36', 'tire:h36'),
      inst('retired', 'tire:h36', { status: 'retired' }),
      inst('cowl', 'cowl:storm-falcon'),
    ];
    expect(
      swapCandidates(built, 'tire_fl', stock, [built, other])
        .map((i) => i.id)
        .sort(),
    ).toEqual(['free-c36', 'free-h36', 'held']);
  });
});
