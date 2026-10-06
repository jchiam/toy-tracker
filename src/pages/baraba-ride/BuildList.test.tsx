import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { BuildList } from './BuildList';
import { NewBuildDialog } from './NewBuildDialog';
import { TIRE_POSITIONS } from '@/lib/br/build-types';
import type { Build } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';
import { makeInstance, makeInventory } from '@/test/br-inventory';
import { claim, makeBuild, makeBuildsState, wish } from '@/test/br-builds';

afterEach(cleanup);

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

const fullWishes = () => [
  wish('bumper', 'bumper:dual-blade'),
  wish('cowl', 'cowl:storm-falcon'),
  wish('chassis', 'chassis:alpha'),
  ...TIRE_POSITIONS.map((position) => wish(position, 'tire:h36')),
];

const fullStock = (): Instance[] => [
  makeInstance({ id: 'bu', itemId: 'bumper:dual-blade' }),
  makeInstance({ id: 'co', itemId: 'cowl:storm-falcon' }),
  makeInstance({ id: 'ch', itemId: 'chassis:alpha' }),
  ...['t1', 't2', 't3', 't4'].map((id) => makeInstance({ id, itemId: 'tire:h36' })),
];

function renderList(builds: Build[], instances: Instance[] = [], overrides = {}) {
  return render(
    <MemoryRouter>
      <BuildList
        builds={makeBuildsState({ builds, ...overrides })}
        inventory={makeInventory({ instances })}
      />
    </MemoryRouter>,
  );
}

const row = (name: string) => screen.getByRole('link', { name }).closest('li') as HTMLElement;

describe('BuildList', () => {
  it('lists builds by name, linking each to its build view', () => {
    renderList([makeBuild({ id: 'b1', name: 'Red Dash' })]);
    expect(screen.getByRole('link', { name: 'Red Dash' })).toHaveAttribute(
      'href',
      '/baraba-ride/builds/b1',
    );
  });

  it('marks a plan whose every position is free as ready to build', () => {
    renderList([makeBuild({ name: 'Idea', parts: fullWishes() })], fullStock());
    expect(row('Idea')).toHaveTextContent('Plan');
    expect(row('Idea')).toHaveTextContent('Ready to build');
  });

  it('marks a plan with empty positions as incomplete', () => {
    renderList([makeBuild({ name: 'Idea', parts: [wish('cowl', 'cowl:storm-falcon')] })]);
    expect(row('Idea')).toHaveTextContent('Incomplete');
  });

  it('counts the parts a full plan is short of', () => {
    const stock = fullStock().filter((i) => i.id !== 't3' && i.id !== 't4');
    renderList([makeBuild({ name: 'Idea', parts: fullWishes() })], stock);
    expect(row('Idea')).toHaveTextContent('Short of 2 parts');
  });

  it('says "part" for a single shortfall', () => {
    const stock = fullStock().filter((i) => i.id !== 't4');
    renderList([makeBuild({ name: 'Idea', parts: fullWishes() })], stock);
    expect(row('Idea')).toHaveTextContent(/Short of 1 part$/);
  });

  it('marks a built build as built, with no readiness', () => {
    const chassis = makeInstance({ itemId: 'chassis:alpha' });
    renderList(
      [makeBuild({ name: 'Red Dash', status: 'built', parts: [claim('chassis', chassis)] })],
      [chassis],
    );
    expect(row('Red Dash')).toHaveTextContent('Built');
    expect(row('Red Dash')).not.toHaveTextContent(/Ready|Incomplete|Short/);
  });

  it('offers to create a build when there are none', () => {
    renderList([]);
    expect(screen.getByText(/No builds yet\. Create one/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New build' })).toBeInTheDocument();
  });

  it('shows a loading state instead of the empty message', () => {
    renderList([], [], { loading: true });
    expect(screen.getByText('Loading builds...')).toBeInTheDocument();
    expect(screen.queryByText(/No builds yet/)).toBeNull();
  });

  it('shows a load error instead of the empty message', () => {
    renderList([], [], { error: 'Could not load builds: down' });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load builds: down');
    expect(screen.queryByText(/No builds yet/)).toBeNull();
  });

  it('keeps the builds already shown when a write fails', () => {
    renderList([makeBuild({ name: 'Red Dash' })], [], { error: 'Could not delete build: nope' });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not delete build: nope');
    expect(screen.getByRole('link', { name: 'Red Dash' })).toBeInTheDocument();
  });

  it('opens the new build dialog', async () => {
    renderList([]);
    await userEvent.click(screen.getByRole('button', { name: 'New build' }));
    expect(screen.getByRole('dialog', { name: 'New build' })).toBeInTheDocument();
  });

  it('closes the new build dialog on cancel', async () => {
    renderList([]);
    await userEvent.click(screen.getByRole('button', { name: 'New build' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('NewBuildDialog', () => {
  function renderDialog(onSubmit = vi.fn(async (name: string) => makeBuild({ id: 'new', name }))) {
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={['/baraba-ride/builds']}>
        <Routes>
          <Route path="*" element={<NewBuildDialog open onClose={onClose} onSubmit={onSubmit} />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );
    return { onSubmit, onClose, dialog: within(screen.getByRole('dialog')) };
  }

  it('renders nothing while closed', () => {
    render(
      <MemoryRouter>
        <NewBuildDialog open={false} onClose={vi.fn()} onSubmit={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('creates the build with a trimmed name and opens its build view', async () => {
    const { onSubmit, onClose, dialog } = renderDialog();
    await userEvent.type(dialog.getByLabelText('Name'), '  Silver idea ');
    await userEvent.click(dialog.getByRole('button', { name: 'Create build' }));
    expect(onSubmit).toHaveBeenCalledWith('Silver idea');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/baraba-ride/builds/new');
  });

  it('refuses a blank name without creating anything', async () => {
    const { onSubmit, dialog } = renderDialog();
    await userEvent.type(dialog.getByLabelText('Name'), '   ');
    await userEvent.click(dialog.getByRole('button', { name: 'Create build' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(dialog.getByRole('alert')).toHaveTextContent('A name is required.');
    expect(screen.getByTestId('location')).toHaveTextContent('/baraba-ride/builds');
  });

  it('limits the name to 60 characters', () => {
    const { dialog } = renderDialog();
    expect(dialog.getByLabelText('Name')).toHaveAttribute('maxLength', '60');
  });

  it('stays open with the message when creating fails', async () => {
    const { onClose, dialog } = renderDialog(
      vi.fn(async () => {
        throw new Error('Could not create build: down');
      }),
    );
    await userEvent.type(dialog.getByLabelText('Name'), 'x');
    await userEvent.click(dialog.getByRole('button', { name: 'Create build' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not create build: down');
    expect(onClose).not.toHaveBeenCalled();
  });
});
