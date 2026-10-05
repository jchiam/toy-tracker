import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryItems } from './InventoryItems';
import { makeInstance, makeInventory, makePurchase } from '@/test/br-inventory';

afterEach(cleanup);

describe('InventoryItems', () => {
  it('groups owned items by slot then accessory kind with active and retired counts', () => {
    const inventory = makeInventory({
      instances: [
        makeInstance({ itemId: 'charger:ride-charger' }),
        makeInstance({ itemId: 'tire:rw32' }),
        makeInstance({ itemId: 'tire:rw32' }),
        makeInstance({ itemId: 'tire:rw32', status: 'retired' }),
        makeInstance({ itemId: 'cowl:storm-falcon' }),
      ],
    });
    render(<InventoryItems inventory={inventory} />);

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(['Cowls', 'Tires', 'Chargers']);

    const tires = within(screen.getByRole('region', { name: 'Tires' }));
    expect(tires.getByText('RW32')).toBeInTheDocument();
    expect(tires.getByText('2 active')).toBeInTheDocument();
    expect(tires.getByText('1 retired')).toBeInTheDocument();

    const cowls = within(screen.getByRole('region', { name: 'Cowls' }));
    expect(cowls.getByText('1 active')).toBeInTheDocument();
    expect(cowls.queryByText(/retired/)).toBeNull();
  });

  it('expands an item to its instances', async () => {
    const inventory = makeInventory({
      purchases: [makePurchase({ id: 'p1', acquiredAt: '2026-09-20' })],
      instances: [
        makeInstance({ itemId: 'tire:rw32', purchaseId: 'p1' }),
        makeInstance({ itemId: 'tire:rw32', variantProductCode: null, note: 'spare' }),
      ],
    });
    render(<InventoryItems inventory={inventory} />);

    await userEvent.click(screen.getByText('RW32'));
    const list = within(screen.getByRole('list', { name: 'RW32 instances' }));
    const rows = list.getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('BR-01 Storm Falcon');
    expect(rows[0]).toHaveTextContent('Purchased Sep 20, 2026');
    expect(rows[1]).toHaveTextContent('Unknown source');
    expect(rows[1]).toHaveTextContent('spare');
  });

  it('routes retire, reactivate and delete to the inventory actions', async () => {
    const inventory = makeInventory(
      {
        instances: [
          makeInstance({ id: 'a', itemId: 'tire:rw32' }),
          makeInstance({ id: 'b', itemId: 'tire:rw32', status: 'retired' }),
        ],
      },
      (fn) => vi.fn(fn) as typeof fn,
    );
    render(<InventoryItems inventory={inventory} />);
    await userEvent.click(screen.getByText('RW32'));

    await userEvent.click(screen.getByRole('button', { name: 'Retire' }));
    await userEvent.type(screen.getByLabelText('Reason (optional)'), 'cracked');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm retire' }));
    expect(inventory.actions.setInstanceStatus).toHaveBeenCalledWith('a', 'retired', 'cracked');

    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    expect(inventory.actions.setInstanceStatus).toHaveBeenCalledWith('b', 'active');

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(inventory.actions.deleteInstance).toHaveBeenCalledWith('a');
  });

  it('shows the empty state with calls to action', () => {
    render(<InventoryItems inventory={makeInventory()} />);
    expect(screen.getByText(/Your inventory is empty/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record purchase' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add items' })).toBeInTheDocument();
  });

  it('shows a loading state and no empty message while loading', () => {
    render(<InventoryItems inventory={makeInventory({ loading: true })} />);
    expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
    expect(screen.queryByText(/Your inventory is empty/)).toBeNull();
  });

  it('shows the error instead of the empty message and keeps shown data', () => {
    render(
      <InventoryItems
        inventory={makeInventory({
          error: 'Could not load inventory: down',
          instances: [makeInstance({ itemId: 'tire:rw32' })],
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load inventory: down');
    expect(screen.queryByText(/Your inventory is empty/)).toBeNull();
    expect(screen.getByText('RW32')).toBeInTheDocument();
  });

  it('keeps instances of an id the catalog no longer knows under Unknown items', () => {
    render(
      <InventoryItems
        inventory={makeInventory({ instances: [makeInstance({ itemId: 'cowl:ghost' })] })}
      />,
    );
    const unknown = within(screen.getByRole('region', { name: 'Unknown items' }));
    expect(unknown.getByText('cowl:ghost')).toBeInTheDocument();
  });

  it('opens the purchase and add dialogs from the toolbar', async () => {
    render(<InventoryItems inventory={makeInventory()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Record purchase' }));
    expect(screen.getByRole('dialog', { name: 'Record a purchase' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Add items' }));
    expect(screen.getByRole('dialog', { name: 'Add items' })).toBeInTheDocument();
  });
});
