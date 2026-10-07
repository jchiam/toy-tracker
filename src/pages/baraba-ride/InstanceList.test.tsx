import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstanceList } from './InstanceList';
import { MemoryRouter } from 'react-router';
import { claims } from '@/lib/br/builds';
import { claim, makeBuild } from '@/test/br-builds';
import type { Instance, Purchase } from '@/lib/br/inventory-types';

const purchase: Purchase = {
  id: 'p1',
  profileId: 'u',
  productCode: 'BR-01',
  acquiredAt: '2026-10-01',
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
};

const base: Instance = {
  id: 'i1',
  profileId: 'u',
  itemId: 'tire:rw32',
  variantProductCode: 'BR-01',
  purchaseId: 'p1',
  status: 'active',
  condition: null,
  note: '',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const actions = {
  onRetire: vi.fn(async () => {}),
  onReactivate: vi.fn(async () => {}),
  onDelete: vi.fn(async () => {}),
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function renderList(instances: Instance[]) {
  return render(
    <InstanceList instances={instances} purchases={[purchase]} actions={actions} label="RW32" />,
  );
}

describe('InstanceList', () => {
  it('shows source product, purchase date, status and note', () => {
    renderList([
      base,
      {
        ...base,
        id: 'i2',
        variantProductCode: null,
        purchaseId: null,
        status: 'retired',
        note: 'cracked',
      },
    ]);
    const items = within(screen.getByRole('list', { name: 'RW32' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('BR-01 Storm Falcon');
    expect(items[0]).toHaveTextContent('Purchased Oct 1, 2026');
    expect(items[0]).toHaveTextContent('Active');
    expect(items[1]).toHaveTextContent('Unknown source');
    expect(items[1]).toHaveTextContent('Retired');
    expect(items[1]).toHaveTextContent('cracked');
    expect(items[1]).not.toHaveTextContent('Purchased');
  });

  it('retires with a reason after confirmation', async () => {
    renderList([base]);
    await userEvent.click(screen.getByRole('button', { name: 'Retire' }));
    const form = screen.getByRole('form', { name: 'Retire this item' });
    await userEvent.type(within(form).getByLabelText('Reason (optional)'), 'cracked');
    await userEvent.click(within(form).getByRole('button', { name: 'Confirm retire' }));
    expect(actions.onRetire).toHaveBeenCalledWith('i1', 'cracked');
    expect(screen.queryByRole('form', { name: 'Retire this item' })).toBeNull();
  });

  it('cancels a retire without calling the action', async () => {
    renderList([base]);
    await userEvent.click(screen.getByRole('button', { name: 'Retire' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions.onRetire).not.toHaveBeenCalled();
    expect(screen.queryByRole('form', { name: 'Retire this item' })).toBeNull();
  });

  it('reactivates a retired instance directly', async () => {
    renderList([{ ...base, status: 'retired' }]);
    expect(screen.queryByRole('button', { name: 'Retire' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    expect(actions.onReactivate).toHaveBeenCalledWith('i1');
  });

  it('deletes only after confirmation', async () => {
    renderList([base]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(actions.onDelete).not.toHaveBeenCalled();
    const group = screen.getByRole('group', { name: 'Delete this item' });
    expect(group).toHaveTextContent('cannot be undone');
    await userEvent.click(within(group).getByRole('button', { name: 'Confirm delete' }));
    expect(actions.onDelete).toHaveBeenCalledWith('i1');
  });

  it('cancels a delete without calling the action', async () => {
    renderList([base]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions.onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'Delete this item' })).toBeNull();
  });

  it('keeps the confirmation open when the action fails', async () => {
    actions.onDelete.mockRejectedValueOnce(new Error('nope'));
    renderList([base]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.getByRole('group', { name: 'Delete this item' })).toBeInTheDocument();
  });
});

describe('InstanceList with build claims', () => {
  const held = { ...base, id: 'held' };
  const spare = { ...base, id: 'spare' };
  const redDash = makeBuild({
    id: 'rd',
    name: 'Red Dash',
    status: 'built',
    parts: [claim('tire_fl', held)],
  });

  function renderClaimed() {
    render(
      <MemoryRouter>
        <InstanceList
          instances={[held, spare]}
          purchases={[purchase]}
          actions={actions}
          claims={claims([redDash])}
          label="RW32"
        />
      </MemoryRouter>,
    );
    return screen.getAllByRole('listitem').map((row) => within(row));
  }

  it('names the holding build as a link to it', () => {
    const [heldRow, spareRow] = renderClaimed();
    expect(heldRow.getByText(/In use by/)).toBeInTheDocument();
    expect(heldRow.getByRole('link', { name: 'Red Dash' })).toHaveAttribute(
      'href',
      '/baraba-ride/builds/rd',
    );
    expect(spareRow.queryByText(/In use by/)).toBeNull();
    expect(spareRow.queryByRole('link')).toBeNull();
  });

  it('makes retire and delete unavailable for a held instance, with the reason', async () => {
    const [heldRow] = renderClaimed();
    const retire = heldRow.getByRole('button', { name: 'Retire' });
    const remove = heldRow.getByRole('button', { name: 'Delete' });
    expect(retire).toBeDisabled();
    expect(remove).toBeDisabled();
    expect(retire).toHaveAccessibleDescription('In use by Red Dash');
    expect(remove).toHaveAccessibleDescription('In use by Red Dash');
    await userEvent.click(retire);
    await userEvent.click(remove);
    expect(screen.queryByRole('form', { name: 'Retire this item' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Delete this item' })).toBeNull();
  });

  it('leaves an instance no build holds retirable and deletable', async () => {
    const [, spareRow] = renderClaimed();
    expect(spareRow.getByRole('button', { name: 'Retire' })).toBeEnabled();
    await userEvent.click(spareRow.getByRole('button', { name: 'Delete' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(actions.onDelete).toHaveBeenCalledWith('spare');
  });
});
