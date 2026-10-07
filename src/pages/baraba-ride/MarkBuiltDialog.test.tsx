import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkBuiltDialog } from './MarkBuiltDialog';
import { TIRE_POSITIONS } from '@/lib/br/build-types';
import type { Assignment, Build } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';
import { makeInstance } from '@/test/br-inventory';
import { claim, makeBuild, wish } from '@/test/br-builds';

afterEach(cleanup);

const plan = (overrides: Partial<Build> = {}): Build =>
  makeBuild({
    id: 'b1',
    name: 'Idea',
    parts: [
      wish('bumper', 'bumper:dual-blade'),
      wish('cowl', 'cowl:storm-falcon'),
      wish('chassis', 'chassis:alpha'),
      ...TIRE_POSITIONS.map((position) => wish(position, 'tire:h36')),
    ],
    ...overrides,
  });

const stock = (): Instance[] => [
  makeInstance({ id: 'bu', itemId: 'bumper:dual-blade' }),
  makeInstance({ id: 'co', itemId: 'cowl:storm-falcon' }),
  makeInstance({
    id: 'ch-new',
    itemId: 'chassis:alpha',
    createdAt: '2026-10-05T00:00:00Z',
    note: 'newer',
  }),
  makeInstance({ id: 'ch-old', itemId: 'chassis:alpha', createdAt: '2026-10-01T00:00:00Z' }),
  makeInstance({ id: 't1', itemId: 'tire:h36', note: 'one' }),
  makeInstance({ id: 't2', itemId: 'tire:h36', note: 'two' }),
  makeInstance({ id: 't3', itemId: 'tire:h36', note: 'three' }),
  makeInstance({ id: 't4', itemId: 'tire:h36', note: 'four' }),
];

function renderDialog(
  build: Build,
  instances: Instance[],
  others: Build[] = [],
  onConfirm = vi.fn(async (_claims: Assignment) => {}),
) {
  const onClose = vi.fn();
  render(
    <MarkBuiltDialog
      open
      build={build}
      instances={instances}
      builds={[build, ...others]}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose, dialog: within(screen.getByRole('dialog')) };
}

const value = (dialog: ReturnType<typeof within>, label: string) =>
  (dialog.getByLabelText(label) as HTMLSelectElement).value;

describe('MarkBuiltDialog', () => {
  it('renders nothing while closed', () => {
    render(
      <MarkBuiltDialog
        open={false}
        build={plan()}
        instances={[]}
        builds={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('chooses the oldest free match for every position by default', async () => {
    const { onConfirm, onClose, dialog } = renderDialog(plan(), stock());
    expect(value(dialog, 'Chassis')).toBe('ch-old');
    await userEvent.click(dialog.getByRole('button', { name: 'Mark built' }));
    expect(onConfirm).toHaveBeenCalledWith({
      bumper: 'bu',
      cowl: 'co',
      chassis: 'ch-old',
      tire_fl: 't1',
      tire_fr: 't2',
      tire_rl: 't3',
      tire_rr: 't4',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('lets the user choose another free matching instance', async () => {
    const { onConfirm, dialog } = renderDialog(plan(), stock());
    await userEvent.selectOptions(dialog.getByLabelText('Chassis'), 'ch-new');
    await userEvent.click(dialog.getByRole('button', { name: 'Mark built' }));
    expect(onConfirm.mock.calls[0][0]).toMatchObject({ chassis: 'ch-new' });
    expect(Object.values(onConfirm.mock.calls[0][0])).not.toContain('ch-old');
  });

  it('trades instances when the chosen one is assigned to another position', async () => {
    const { onConfirm, dialog } = renderDialog(plan(), stock());
    await userEvent.selectOptions(dialog.getByLabelText('Front-left tire'), 't4');
    expect(value(dialog, 'Front-left tire')).toBe('t4');
    expect(value(dialog, 'Rear-right tire')).toBe('t1');
    await userEvent.click(dialog.getByRole('button', { name: 'Mark built' }));
    const claims = onConfirm.mock.calls[0][0];
    expect(new Set(Object.values(claims)).size).toBe(7);
  });

  it('offers only free instances of the position’s part', () => {
    const { dialog } = renderDialog(plan(), [
      ...stock(),
      makeInstance({ id: 'c36', itemId: 'tire:c36' }),
    ]);
    expect(
      within(dialog.getByLabelText('Front-left tire'))
        .getAllByRole('option')
        .map((option) => (option as HTMLOptionElement).value),
    ).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('refuses a plan with an empty position, listing it', () => {
    const build = plan();
    build.parts = build.parts.filter((p) => p.position !== 'chassis');
    const { dialog } = renderDialog(build, stock());
    expect(dialog.getByRole('heading', { name: 'Cannot mark built' })).toBeInTheDocument();
    expect(
      within(dialog.getByRole('list', { name: 'Positions that cannot be filled' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Chassis: empty']);
    expect(dialog.queryByRole('button', { name: 'Mark built' })).toBeNull();
  });

  it('refuses when a part is held elsewhere or missing, listing every reason', () => {
    const alpha = makeInstance({ id: 'alpha', itemId: 'chassis:alpha' });
    const redDash = makeBuild({
      name: 'Red Dash',
      status: 'built',
      parts: [claim('chassis', alpha)],
    });
    const instances = [
      ...stock().filter((i) => i.itemId !== 'chassis:alpha' && i.id !== 't4'),
      alpha,
    ];
    const { dialog } = renderDialog(plan(), instances, [redDash]);
    expect(
      within(dialog.getByRole('list', { name: 'Positions that cannot be filled' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Chassis: in use by “Red Dash”', 'Rear-right tire: missing']);
  });

  it('stays open with the message when marking built fails', async () => {
    const { onClose, dialog } = renderDialog(
      plan(),
      stock(),
      [],
      vi.fn(async () => {
        throw new Error('Could not mark built: duplicate key');
      }),
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Mark built' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not mark built: duplicate key');
    expect(onClose).not.toHaveBeenCalled();
  });
});
