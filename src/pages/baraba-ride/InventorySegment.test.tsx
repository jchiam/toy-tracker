import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import { InventorySegment } from './InventorySegment';
import * as inventoryHook from '@/hooks/useBrInventory';
import * as buildsHook from '@/hooks/useBrBuilds';
import { makeInstance, makeInventory } from '@/test/br-inventory';
import { claim, makeBuild, makeBuildsState } from '@/test/br-builds';

vi.mock('@/hooks/useBrInventory', () => ({ useBrInventory: vi.fn() }));
vi.mock('@/hooks/useBrBuilds', () => ({ useBrBuilds: vi.fn() }));

const useBrInventory = vi.mocked(inventoryHook.useBrInventory);
const useBrBuilds = vi.mocked(buildsHook.useBrBuilds);

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function renderSegment() {
  return render(
    <MemoryRouter initialEntries={['/baraba-ride/inventory']}>
      <Routes>
        <Route path="/baraba-ride/inventory/*" element={<InventorySegment userId="u" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InventorySegment', () => {
  it('loads builds for the same user and passes their claims to the views', async () => {
    const held = makeInstance({ id: 'held', itemId: 'chassis:alpha' });
    useBrInventory.mockReturnValue(makeInventory({ instances: [held] }));
    useBrBuilds.mockReturnValue(
      makeBuildsState({
        builds: [
          makeBuild({
            id: 'rd',
            name: 'Red Dash',
            status: 'built',
            parts: [claim('chassis', held)],
          }),
        ],
      }),
    );
    renderSegment();

    expect(useBrBuilds).toHaveBeenCalledWith('u');
    expect(screen.getByText('1 in builds')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Alpha'));
    expect(
      within(screen.getByRole('list', { name: 'Alpha instances' })).getByRole('link', {
        name: 'Red Dash',
      }),
    ).toHaveAttribute('href', '/baraba-ride/builds/rd');
  });

  it('still shows the inventory, with the error, when builds fail to load', () => {
    useBrInventory.mockReturnValue(
      makeInventory({ instances: [makeInstance({ itemId: 'chassis:alpha' })] }),
    );
    useBrBuilds.mockReturnValue(makeBuildsState({ error: 'Could not load builds: down' }));
    renderSegment();

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load builds: down');
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
  });
});
