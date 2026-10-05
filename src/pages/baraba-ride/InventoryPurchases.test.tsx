import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryPurchases } from './InventoryPurchases';
import { makeInstance, makeInventory, makePurchase } from '@/test/br-inventory';

afterEach(cleanup);

const spy = <F extends (...args: never[]) => Promise<void>>(fn: F) => vi.fn(fn) as typeof fn;

describe('InventoryPurchases', () => {
  it('lists purchases newest acquisition first with code, name, date, note and item count', () => {
    const inventory = makeInventory({
      purchases: [
        makePurchase({ id: 'p1', productCode: 'BR-01', acquiredAt: '2026-09-19', note: 'launch' }),
        makePurchase({ id: 'p2', productCode: 'BR-03', acquiredAt: '2026-10-02' }),
      ],
      instances: [
        makeInstance({ purchaseId: 'p1', itemId: 'cowl:storm-falcon' }),
        makeInstance({ purchaseId: 'p1', itemId: 'tire:rw32' }),
        makeInstance({ purchaseId: 'p2', itemId: 'cowl:fury-lizard' }),
        makeInstance({ purchaseId: null, itemId: 'tire:rw32' }),
      ],
    });
    render(<InventoryPurchases inventory={inventory} />);

    const rows = Array.from(
      screen
        .getByRole('list', { name: 'Purchases' })
        .querySelectorAll(':scope > li > details > summary'),
    );
    expect(rows[0]).toHaveTextContent('BR-03');
    expect(rows[0]).toHaveTextContent('Oct 2, 2026');
    expect(rows[0]).toHaveTextContent('1 item');
    expect(rows[1]).toHaveTextContent('BR-01');
    expect(rows[1]).toHaveTextContent('Storm Falcon');
    expect(rows[1]).toHaveTextContent('Sep 19, 2026');
    expect(rows[1]).toHaveTextContent('2 items');
    expect(rows[1]).toHaveTextContent('launch');
  });

  it('expands a purchase to its linked instances only', async () => {
    const inventory = makeInventory({
      purchases: [makePurchase({ id: 'p1', productCode: 'BR-01' })],
      instances: [
        makeInstance({ purchaseId: 'p1', itemId: 'cowl:storm-falcon', status: 'retired' }),
        makeInstance({ purchaseId: null, itemId: 'tire:rw32' }),
      ],
    });
    render(<InventoryPurchases inventory={inventory} />);
    await userEvent.click(screen.getByText('Storm Falcon'));
    const list = within(screen.getByRole('list', { name: 'BR-01 items' }));
    const items = list.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Retired');
  });

  it('deletes a purchase only after confirming the number of items removed', async () => {
    const inventory = makeInventory(
      {
        purchases: [makePurchase({ id: 'p1', productCode: 'BR-01' })],
        instances: [
          makeInstance({ purchaseId: 'p1' }),
          makeInstance({ purchaseId: 'p1' }),
          makeInstance({ purchaseId: 'p1' }),
        ],
      },
      spy,
    );
    render(<InventoryPurchases inventory={inventory} />);
    await userEvent.click(screen.getByText('Storm Falcon'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete purchase' }));
    expect(inventory.actions.deletePurchase).not.toHaveBeenCalled();

    const group = screen.getByRole('group', { name: 'Delete this purchase' });
    expect(group).toHaveTextContent('Delete this purchase and its 3 items? This cannot be undone.');
    await userEvent.click(within(group).getByRole('button', { name: 'Confirm delete' }));
    expect(inventory.actions.deletePurchase).toHaveBeenCalledWith('p1');
  });

  it('keeps the confirmation open when the delete fails', async () => {
    const inventory = makeInventory(
      { purchases: [makePurchase({ id: 'p1' })], instances: [makeInstance({ purchaseId: 'p1' })] },
      spy,
    );
    vi.mocked(inventory.actions.deletePurchase).mockRejectedValueOnce(new Error('nope'));
    render(<InventoryPurchases inventory={inventory} />);
    await userEvent.click(screen.getByText('Storm Falcon'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete purchase' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.getByRole('group', { name: 'Delete this purchase' })).toBeInTheDocument();
  });

  it('retires and deletes a linked instance from the purchase view', async () => {
    const inventory = makeInventory(
      {
        purchases: [makePurchase({ id: 'p1' })],
        instances: [
          makeInstance({ id: 'a', purchaseId: 'p1' }),
          makeInstance({ id: 'b', purchaseId: 'p1', status: 'retired' }),
        ],
      },
      spy,
    );
    render(<InventoryPurchases inventory={inventory} />);
    await userEvent.click(screen.getByText('Storm Falcon'));
    await userEvent.click(screen.getByRole('button', { name: 'Retire' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm retire' }));
    expect(inventory.actions.setInstanceStatus).toHaveBeenCalledWith('a', 'retired', undefined);
    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    expect(inventory.actions.setInstanceStatus).toHaveBeenCalledWith('b', 'active');
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(inventory.actions.deleteInstance).toHaveBeenCalledWith('a');
  });

  it('cancels a purchase delete', async () => {
    const inventory = makeInventory(
      { purchases: [makePurchase({ id: 'p1' })], instances: [makeInstance({ purchaseId: 'p1' })] },
      spy,
    );
    render(<InventoryPurchases inventory={inventory} />);
    await userEvent.click(screen.getByText('Storm Falcon'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete purchase' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: 'Delete this purchase' })).toBeNull();
    expect(inventory.actions.deletePurchase).not.toHaveBeenCalled();
  });

  it('shows empty, loading and error states', () => {
    const { unmount } = render(<InventoryPurchases inventory={makeInventory()} />);
    expect(screen.getByText('No purchases recorded yet.')).toBeInTheDocument();
    unmount();

    render(<InventoryPurchases inventory={makeInventory({ loading: true })} />);
    expect(screen.getByText('Loading inventory...')).toBeInTheDocument();
    expect(screen.queryByText('No purchases recorded yet.')).toBeNull();
    cleanup();

    render(
      <InventoryPurchases inventory={makeInventory({ error: 'Could not load purchases: x' })} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load purchases: x');
    expect(screen.queryByText('No purchases recorded yet.')).toBeNull();
  });

  it('opens the record purchase dialog', async () => {
    render(<InventoryPurchases inventory={makeInventory()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Record purchase' }));
    expect(screen.getByRole('dialog', { name: 'Record a purchase' })).toBeInTheDocument();
  });
});
