import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { BuildView } from './BuildView';
import { POSITIONS, TIRE_POSITIONS } from '@/lib/br/build-types';
import type { Build } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';
import type { BrBuilds } from '@/hooks/useBrBuilds';
import { makeInstance, makeInventory } from '@/test/br-inventory';
import { claim, makeBuild, makeBuildsState, wish } from '@/test/br-builds';

afterEach(cleanup);

const spy = <F extends (...args: never[]) => Promise<unknown>>(fn: F) => vi.fn(fn) as unknown as F;

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderView(
  build: Build,
  {
    instances = [],
    others = [],
    state = {},
  }: { instances?: Instance[]; others?: Build[]; state?: Partial<BrBuilds> } = {},
) {
  const builds = makeBuildsState({ builds: [build, ...others], ...state }, spy);
  render(
    <MemoryRouter initialEntries={[`/baraba-ride/builds/${build.id}`]}>
      <BuildView build={build} builds={builds} inventory={makeInventory({ instances })} />
      <LocationProbe />
    </MemoryRouter>,
  );
  return builds.actions;
}

const position = (name: string) => within(screen.getByRole('region', { name }));

const stock = (): Instance[] => [
  makeInstance({ id: 'bu', itemId: 'bumper:dual-blade' }),
  makeInstance({ id: 'co', itemId: 'cowl:storm-falcon' }),
  makeInstance({ id: 'ch', itemId: 'chassis:alpha' }),
  ...['t1', 't2', 't3', 't4'].map((id) =>
    makeInstance({ id, itemId: 'tire:h36', variantProductCode: 'BR-02' }),
  ),
];

/** A built build holding one instance of the stock in every position. */
const builtFrom = (instances: Instance[], overrides: Partial<Build> = {}): Build => {
  const [bumper, cowl, chassis, ...tires] = instances;
  return makeBuild({
    name: 'Red Dash',
    status: 'built',
    parts: [
      claim('bumper', bumper),
      claim('cowl', cowl),
      claim('chassis', chassis),
      ...TIRE_POSITIONS.map((p, n) => claim(p, tires[n])),
    ],
    ...overrides,
  });
};

describe('BuildView for a plan', () => {
  it('lays the positions out bumper first, then front tires, cowl, chassis and rear tires', () => {
    renderView(makeBuild({ name: 'Idea' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Idea');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Plan');
    expect(
      within(screen.getByRole('group', { name: 'Positions' }))
        .getAllByRole('region')
        .map((region) => region.getAttribute('aria-label')),
    ).toEqual([
      'Bumper',
      'Front-left tire',
      'Front-right tire',
      'Cowl',
      'Chassis',
      'Rear-left tire',
      'Rear-right tire',
    ]);
  });

  it('shows an empty position with only a choose action', () => {
    renderView(makeBuild());
    expect(position('Cowl').getByText('Empty')).toBeInTheDocument();
    expect(position('Cowl').getByRole('button', { name: 'Choose' })).toBeInTheDocument();
    expect(position('Cowl').queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('shows a position as available when a free part matches', () => {
    renderView(makeBuild({ parts: [wish('cowl', 'cowl:storm-falcon')] }), { instances: stock() });
    expect(position('Cowl').getByText('Storm Falcon')).toBeInTheDocument();
    expect(position('Cowl').getByText('Any variant')).toBeInTheDocument();
    expect(position('Cowl').getByText('Available')).toBeInTheDocument();
  });

  it('shows the variant colour and product for a specific variant', () => {
    renderView(makeBuild({ parts: [wish('tire_fl', 'tire:h36', 'BR-07')] }));
    expect(position('Front-left tire').getByText('Silver · BR-07')).toBeInTheDocument();
  });

  it('names the built build holding the only matching part, linking to it', () => {
    const alpha = makeInstance({ itemId: 'chassis:alpha' });
    const redDash = makeBuild({
      id: 'rd',
      name: 'Red Dash',
      status: 'built',
      parts: [claim('chassis', alpha)],
    });
    renderView(makeBuild({ parts: [wish('chassis', 'chassis:alpha')] }), {
      instances: [alpha],
      others: [redDash],
    });
    expect(position('Chassis').getByText(/In use by/)).toBeInTheDocument();
    expect(position('Chassis').getByRole('link', { name: 'Red Dash' })).toHaveAttribute(
      'href',
      '/baraba-ride/builds/rd',
    );
  });

  it('links a missing variant to the product that contains it', () => {
    renderView(makeBuild({ parts: [wish('tire_fl', 'tire:h36', 'BR-07')] }), {
      instances: [makeInstance({ itemId: 'tire:h36', variantProductCode: 'BR-02' })],
    });
    const cell = position('Front-left tire');
    expect(cell.getByText(/Missing/)).toBeInTheDocument();
    expect(cell.getAllByRole('link').map((link) => link.textContent)).toEqual(['BR-07']);
    expect(cell.getByRole('link', { name: 'BR-07' })).toHaveAttribute(
      'href',
      '/baraba-ride/catalog/products/BR-07',
    );
  });

  it('links a missing any-variant part to every product that contains it', () => {
    renderView(makeBuild({ parts: [wish('tire_fl', 'tire:h36')] }));
    expect(
      position('Front-left tire')
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['BR-02', 'BR-05', 'BR-07']);
  });

  it('sets a position to the chosen part and variant', async () => {
    const build = makeBuild({ id: 'b1' });
    const actions = renderView(build);
    await userEvent.click(position('Bumper').getByRole('button', { name: 'Choose' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(
      within(dialog.getByRole('region', { name: 'Dual Blade' })).getByRole('button', {
        name: /Red · BR-01/,
      }),
    );
    expect(actions.setPlanPositions).toHaveBeenCalledWith('b1', [
      { position: 'bumper', itemId: 'bumper:dual-blade', variantProductCode: 'BR-01' },
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('clears a filled position', async () => {
    const build = makeBuild({ id: 'b1', parts: [wish('cowl', 'cowl:storm-falcon')] });
    const actions = renderView(build);
    await userEvent.click(position('Cowl').getByRole('button', { name: 'Clear' }));
    expect(actions.clearPlanPosition).toHaveBeenCalledWith('b1', 'cowl');
  });

  it('fills all four tires with one choice in one action', async () => {
    const actions = renderView(makeBuild({ id: 'b1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fill all four tires' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(
      within(dialog.getByRole('region', { name: 'C36' })).getByRole('button', {
        name: /Green · BR-03/,
      }),
    );
    expect(actions.setPlanPositions).toHaveBeenCalledTimes(1);
    expect(actions.setPlanPositions).toHaveBeenCalledWith(
      'b1',
      TIRE_POSITIONS.map((p) => ({ position: p, itemId: 'tire:c36', variantProductCode: 'BR-03' })),
    );
  });

  it('renames after validating the name', async () => {
    const actions = renderView(makeBuild({ id: 'b1', name: 'Idea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const form = within(screen.getByRole('form', { name: 'Rename this build' }));
    await userEvent.clear(form.getByLabelText('Name'));
    await userEvent.click(form.getByRole('button', { name: 'Save name' }));
    expect(form.getByRole('alert')).toHaveTextContent('A name is required.');
    expect(actions.updateBuild).not.toHaveBeenCalled();

    await userEvent.type(form.getByLabelText('Name'), ' Red Dash ');
    await userEvent.click(form.getByRole('button', { name: 'Save name' }));
    expect(actions.updateBuild).toHaveBeenCalledWith('b1', { name: 'Red Dash' });
    expect(screen.queryByRole('form', { name: 'Rename this build' })).toBeNull();
  });

  it('saves the note', async () => {
    const actions = renderView(makeBuild({ id: 'b1' }));
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Note'), 'for the weekend');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(actions.updateBuild).toHaveBeenCalledWith('b1', { note: 'for the weekend' });
  });

  it('deletes after confirmation and returns to the list', async () => {
    const actions = renderView(makeBuild({ id: 'b1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete build' }));
    const confirm = within(screen.getByRole('group', { name: 'Delete this build' }));
    expect(confirm.getByText('Delete this build? This cannot be undone.')).toBeInTheDocument();
    expect(actions.deleteBuild).not.toHaveBeenCalled();
    await userEvent.click(confirm.getByRole('button', { name: 'Confirm delete' }));
    expect(actions.deleteBuild).toHaveBeenCalledWith('b1');
    // The navigation follows the awaited delete, so it may land after the click settles.
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/baraba-ride\/builds$/),
    );
  });

  it('shows a write error and keeps the build shown', () => {
    renderView(makeBuild({ name: 'Idea' }), { state: { error: 'Could not set position: down' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not set position: down');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Idea');
  });

  it('says the build is loading while either source still loads', () => {
    renderView(makeBuild(), { state: { loading: true } });
    expect(screen.getByText('Loading build...')).toBeInTheDocument();
  });

  it('cancels a rename without writing', async () => {
    const actions = renderView(makeBuild({ name: 'Idea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await userEvent.click(
      within(screen.getByRole('form', { name: 'Rename this build' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(screen.queryByRole('form', { name: 'Rename this build' })).toBeNull();
    expect(actions.updateBuild).not.toHaveBeenCalled();
  });

  it('keeps the rename form open when the write fails', async () => {
    const actions = renderView(makeBuild({ id: 'b1', name: 'Idea' }));
    vi.mocked(actions.updateBuild).mockRejectedValueOnce(new Error('down'));
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(actions.updateBuild).toHaveBeenCalledWith('b1', { name: 'Idea' });
    expect(screen.getByRole('form', { name: 'Rename this build' })).toBeInTheDocument();
  });

  it('cancels a delete without writing', async () => {
    const actions = renderView(makeBuild());
    await userEvent.click(screen.getByRole('button', { name: 'Delete build' }));
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Delete this build' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(screen.queryByRole('group', { name: 'Delete this build' })).toBeNull();
    expect(actions.deleteBuild).not.toHaveBeenCalled();
  });

  it('stays on the build when deleting fails', async () => {
    const actions = renderView(makeBuild({ id: 'b1' }));
    vi.mocked(actions.deleteBuild).mockRejectedValueOnce(new Error('down'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete build' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(actions.deleteBuild).toHaveBeenCalledWith('b1');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/baraba-ride\/builds\/b1$/);
  });

  it('names every built build holding a matching part', () => {
    const alpha = makeInstance({ id: 'a1', itemId: 'chassis:alpha' });
    const beta = makeInstance({ id: 'a2', itemId: 'chassis:alpha' });
    const built = (id: string, name: string, instance: Instance) =>
      makeBuild({ id, name, status: 'built', parts: [claim('chassis', instance)] });
    const redDash = built('rd', 'Red Dash', alpha);
    const blueDash = built('bd', 'Blue Dash', beta);
    renderView(makeBuild({ parts: [wish('chassis', 'chassis:alpha')] }), {
      instances: [alpha, beta],
      others: [redDash, blueDash],
    });
    expect(position('Chassis').getByText(/In use by/)).toHaveTextContent(
      'In use by Red Dash, Blue Dash',
    );
  });

  it('marks built with the claims shown in the dialog', async () => {
    const build = makeBuild({
      id: 'b1',
      name: 'Idea',
      parts: [
        wish('bumper', 'bumper:dual-blade'),
        wish('cowl', 'cowl:storm-falcon'),
        wish('chassis', 'chassis:alpha'),
        ...TIRE_POSITIONS.map((p) => wish(p, 'tire:h36')),
      ],
    });
    const actions = renderView(build, { instances: stock() });
    await userEvent.click(screen.getByRole('button', { name: 'Mark built' }));
    const dialog = within(screen.getByRole('dialog'));
    const shown = Object.fromEntries(
      POSITIONS.map((p) => [
        p,
        (dialog.getAllByRole('combobox')[POSITIONS.indexOf(p)] as HTMLSelectElement).value,
      ]),
    );
    await userEvent.click(dialog.getByRole('button', { name: 'Mark built' }));
    expect(actions.markBuilt).toHaveBeenCalledWith('b1', shown);
    expect(shown).toEqual({
      bumper: 'bu',
      tire_fl: 't1',
      tire_fr: 't2',
      cowl: 'co',
      chassis: 'ch',
      tire_rl: 't3',
      tire_rr: 't4',
    });
  });

  it('leaves the plan shown with the error when marking built fails', async () => {
    const build = makeBuild({
      id: 'b1',
      name: 'Idea',
      parts: [
        wish('bumper', 'bumper:dual-blade'),
        wish('cowl', 'cowl:storm-falcon'),
        wish('chassis', 'chassis:alpha'),
        ...TIRE_POSITIONS.map((p) => wish(p, 'tire:h36')),
      ],
    });
    const actions = renderView(build, { instances: stock() });
    vi.mocked(actions.markBuilt).mockRejectedValue(
      new Error('Could not mark built: duplicate key'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mark built' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Mark built' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not mark built: duplicate key');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Plan');
  });
});

describe('BuildView for a built build', () => {
  it('shows each position from the instance it holds', () => {
    const instances = stock();
    instances[2] = makeInstance({
      id: 'ch',
      itemId: 'chassis:alpha',
      variantProductCode: null,
      note: 'spare',
    });
    renderView(builtFrom(instances), { instances });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Built');
    expect(position('Front-left tire').getByText('H36')).toBeInTheDocument();
    expect(position('Front-left tire').getByText('Blue · BR-02')).toBeInTheDocument();
    expect(position('Chassis').getByText('Unknown source')).toBeInTheDocument();
    expect(position('Chassis').getByText('spare')).toBeInTheDocument();
    expect(screen.queryByText('Available')).toBeNull();
  });

  it('offers swap on every position and never clear, fill or mark built', () => {
    const instances = stock();
    renderView(builtFrom(instances), { instances });
    expect(screen.getAllByRole('button', { name: 'Swap' })).toHaveLength(7);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fill all four tires' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark built' })).toBeNull();
  });

  it('swaps a position for a free instance of the slot, of any part', async () => {
    const instances = [
      ...stock(),
      makeInstance({ id: 'c36', itemId: 'tire:c36', variantProductCode: 'BR-03' }),
      makeInstance({ id: 'spare-cowl', itemId: 'cowl:fury-lizard' }),
    ];
    const build = builtFrom(instances, { id: 'b1' });
    const actions = renderView(build, { instances });
    await userEvent.click(position('Front-left tire').getByRole('button', { name: 'Swap' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(
      within(dialog.getByRole('list', { name: 'Free parts' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['C36, BR-03 Fury Lizard']);
    await userEvent.click(dialog.getByRole('button', { name: 'C36, BR-03 Fury Lizard' }));
    expect(actions.swapBuiltPosition).toHaveBeenCalledWith(
      'b1',
      'tire_fl',
      expect.objectContaining({ id: 'c36', itemId: 'tire:c36', variantProductCode: 'BR-03' }),
    );
  });

  it('says so when no free part fits the position', async () => {
    const instances = stock();
    renderView(builtFrom(instances), { instances });
    await userEvent.click(position('Chassis').getByRole('button', { name: 'Swap' }));
    expect(
      within(screen.getByRole('dialog')).getByText('No free part fits this position.'),
    ).toBeInTheDocument();
  });

  it('takes apart only after confirmation', async () => {
    const instances = stock();
    const actions = renderView(builtFrom(instances, { id: 'b1' }), { instances });
    await userEvent.click(screen.getByRole('button', { name: 'Take apart' }));
    const confirm = within(screen.getByRole('group', { name: 'Take this build apart' }));
    expect(confirm.getByText(/becomes a plan of the same parts/)).toBeInTheDocument();
    expect(actions.takeApart).not.toHaveBeenCalled();
    await userEvent.click(confirm.getByRole('button', { name: 'Confirm take apart' }));
    expect(actions.takeApart).toHaveBeenCalledWith('b1');
  });

  it('cancels taking apart without writing', async () => {
    const instances = stock();
    const actions = renderView(builtFrom(instances), { instances });
    await userEvent.click(screen.getByRole('button', { name: 'Take apart' }));
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Take this build apart' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    expect(screen.queryByRole('group', { name: 'Take this build apart' })).toBeNull();
    expect(actions.takeApart).not.toHaveBeenCalled();
  });

  it('keeps the take-apart confirmation open when the write fails', async () => {
    const instances = stock();
    const actions = renderView(builtFrom(instances, { id: 'b1' }), { instances });
    vi.mocked(actions.takeApart).mockRejectedValueOnce(new Error('down'));
    await userEvent.click(screen.getByRole('button', { name: 'Take apart' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm take apart' }));
    expect(actions.takeApart).toHaveBeenCalledWith('b1');
    expect(screen.getByRole('group', { name: 'Take this build apart' })).toBeInTheDocument();
  });

  it('shows the message in the picker when a swap fails', async () => {
    const instances = [...stock(), makeInstance({ id: 'spare', itemId: 'cowl:fury-lizard' })];
    const actions = renderView(builtFrom(instances), { instances });
    vi.mocked(actions.swapBuiltPosition).mockRejectedValueOnce(
      new Error('Could not swap position: taken'),
    );
    await userEvent.click(position('Cowl').getByRole('button', { name: 'Swap' }));
    const dialog = within(screen.getByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: /Fury Lizard/ }));
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not swap position: taken');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('says the source is unknown for a held any-variant instance the inventory lacks', () => {
    const instances = stock();
    instances[1] = makeInstance({
      id: 'co',
      itemId: 'cowl:storm-falcon',
      variantProductCode: null,
    });
    renderView(builtFrom(instances), { instances: instances.filter((i) => i.id !== 'co') });
    expect(position('Cowl').getByText('Unknown source')).toBeInTheDocument();
  });

  it('says deleting frees the parts', async () => {
    const instances = stock();
    renderView(builtFrom(instances), { instances });
    await userEvent.click(screen.getByRole('button', { name: 'Delete build' }));
    expect(
      within(screen.getByRole('group', { name: 'Delete this build' })).getByText(
        /Its seven parts are freed and stay in your inventory/,
      ),
    ).toBeInTheDocument();
  });
});
