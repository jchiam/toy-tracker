import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddItemsDialog } from './AddItemsDialog';

afterEach(cleanup);

function renderDialog(onSubmit = vi.fn(async () => {}), onClose = vi.fn()) {
  render(<AddItemsDialog open onClose={onClose} onSubmit={onSubmit} />);
  return { onSubmit, onClose, dialog: within(screen.getByRole('dialog')) };
}

describe('AddItemsDialog', () => {
  it('offers parts grouped by slot and then accessories by kind', () => {
    const { dialog } = renderDialog();
    const groups = within(dialog.getByLabelText('Item'))
      .getAllByRole('group')
      .map((group) => group.getAttribute('label'));
    expect(groups).toEqual(['Cowls', 'Bumpers', 'Tires', 'Chassis', 'Chargers', 'Colosseums']);
    expect(dialog.getByRole('option', { name: 'Ride Charger' })).toBeInTheDocument();
    expect(dialog.queryByRole('option', { name: /sticker/i })).toBeNull();
  });

  it('offers the chosen part’s source products plus Unknown, resetting on item change', async () => {
    const { dialog } = renderDialog();
    const item = dialog.getByLabelText('Item');
    const source = dialog.getByLabelText('Source product');

    await userEvent.selectOptions(item, 'cowl:storm-falcon');
    expect(
      within(source)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Unknown', 'BR-01 Storm Falcon', 'BR-04 Storm Falcon', 'BR-07 Falcon Kit']);

    await userEvent.selectOptions(source, 'BR-04');
    expect(source).toHaveValue('BR-04');

    await userEvent.selectOptions(item, 'charger:ride-charger');
    expect(source).toHaveValue('');
    expect(within(source).getAllByRole('option')).toHaveLength(7);
  });

  it('submits the quantity and chosen source', async () => {
    const { dialog, onSubmit, onClose } = renderDialog();
    await userEvent.selectOptions(dialog.getByLabelText('Item'), 'tire:rw32');
    const quantity = dialog.getByLabelText('Quantity');
    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('3');
    await userEvent.selectOptions(dialog.getByLabelText('Source product'), 'BR-09');
    await userEvent.click(dialog.getByRole('button', { name: 'Add items' }));

    expect(onSubmit).toHaveBeenCalledWith({ itemId: 'tire:rw32', variantProductCode: 'BR-09' }, 3);
    expect(onClose).toHaveBeenCalled();
  });

  it('submits an unknown source as null', async () => {
    const { dialog, onSubmit } = renderDialog();
    await userEvent.selectOptions(dialog.getByLabelText('Item'), 'tire:rw32');
    await userEvent.click(dialog.getByRole('button', { name: 'Add items' }));
    expect(onSubmit).toHaveBeenCalledWith({ itemId: 'tire:rw32', variantProductCode: null }, 1);
  });

  it('never submits a quantity below one', async () => {
    const { dialog, onSubmit } = renderDialog();
    const quantity = dialog.getByLabelText('Quantity');
    await userEvent.tripleClick(quantity);
    await userEvent.keyboard('0');
    expect(quantity).toHaveValue(1);
    await userEvent.click(dialog.getByRole('button', { name: 'Add items' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('shows the error and stays open when adding fails', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('Could not add items: nope');
    });
    const { dialog, onClose } = renderDialog(onSubmit);
    await userEvent.click(dialog.getByRole('button', { name: 'Add items' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not add items: nope');
    expect(onClose).not.toHaveBeenCalled();
  });
});
