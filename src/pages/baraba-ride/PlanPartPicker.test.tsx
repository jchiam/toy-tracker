import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanPartPicker } from './PlanPartPicker';
import type { Build } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';
import type { Slot } from '@/lib/br/types';
import { ACCESSORIES } from '@/lib/br/catalog';
import { makeInstance } from '@/test/br-inventory';
import { claim, makeBuild } from '@/test/br-builds';

afterEach(cleanup);

function renderPicker({
  slot = 'tire' as Slot,
  instances = [] as Instance[],
  builds = [] as Build[],
  onChoose = vi.fn(async () => {}),
} = {}) {
  const onClose = vi.fn();
  render(
    <PlanPartPicker
      open
      title="Choose a part"
      slot={slot}
      instances={instances}
      builds={builds}
      onChoose={onChoose}
      onClose={onClose}
    />,
  );
  return { onChoose, onClose, dialog: within(screen.getByRole('dialog')) };
}

const partNames = (dialog: ReturnType<typeof within>) =>
  dialog.getAllByRole('heading', { level: 4 }).map((heading: HTMLElement) => heading.textContent);

describe('PlanPartPicker', () => {
  it('renders nothing while closed', () => {
    render(
      <PlanPartPicker
        open={false}
        title="x"
        slot="cowl"
        instances={[]}
        builds={[]}
        onChoose={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers only the parts of the slot', () => {
    const { dialog } = renderPicker({ slot: 'cowl' });
    expect(partNames(dialog)).toEqual(['Storm Falcon', 'Lash Stallion', 'Fury Lizard']);
  });

  it('offers every tire for a wheel, left and right alike', () => {
    const { dialog } = renderPicker({ slot: 'tire' });
    expect(partNames(dialog)).toEqual(['RW32', 'LW32', 'H36', 'C36']);
  });

  it('never offers an accessory', () => {
    for (const slot of ['cowl', 'bumper', 'tire', 'chassis'] as Slot[]) {
      const { dialog } = renderPicker({ slot });
      for (const accessory of ACCESSORIES) {
        expect(dialog.queryByText(accessory.nameEn)).toBeNull();
      }
      cleanup();
    }
  });

  it('offers any variant and each catalogued variant, with free counts', () => {
    const held = makeInstance({ id: 'held', itemId: 'tire:h36', variantProductCode: 'BR-02' });
    const { dialog } = renderPicker({
      instances: [
        held,
        makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-02' }),
        makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-07' }),
        makeInstance({ itemId: 'tire:h36', variantProductCode: null }),
        makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-07', status: 'retired' }),
      ],
      builds: [makeBuild({ status: 'built', parts: [claim('tire_fl', held)] })],
    });
    const h36 = within(dialog.getByRole('region', { name: 'H36' }));
    expect(h36.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Any variant3 free',
      'Blue · BR-021 free',
      'White · BR-050 free',
      'Silver · BR-071 free',
    ]);
  });

  it('lets the user choose a part they do not own', async () => {
    const { onChoose, onClose, dialog } = renderPicker({ slot: 'cowl' });
    await userEvent.click(
      within(dialog.getByRole('region', { name: 'Fury Lizard' })).getByRole('button', {
        name: /Any variant/,
      }),
    );
    expect(onChoose).toHaveBeenCalledWith('cowl:fury-lizard', null);
    expect(onClose).toHaveBeenCalled();
  });

  it('writes the part and the chosen variant', async () => {
    const { onChoose, dialog } = renderPicker();
    await userEvent.click(
      within(dialog.getByRole('region', { name: 'H36' })).getByRole('button', {
        name: /Silver · BR-07/,
      }),
    );
    expect(onChoose).toHaveBeenCalledWith('tire:h36', 'BR-07');
  });

  it('stays open with the message when the write fails', async () => {
    const { onClose, dialog } = renderPicker({
      onChoose: vi.fn(async () => {
        throw new Error('Could not set position: down');
      }),
    });
    await userEvent.click(dialog.getAllByRole('button', { name: /Any variant/ })[0]);
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not set position: down');
    expect(onClose).not.toHaveBeenCalled();
  });
});
