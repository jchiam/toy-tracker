import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordPurchaseDialog } from './RecordPurchaseDialog';
import { PRODUCTS } from '@/lib/br/catalog';
import { todayIso } from '@/lib/br/labels';

afterEach(cleanup);

function renderDialog(onSubmit = vi.fn(async () => {}), onClose = vi.fn()) {
  render(<RecordPurchaseDialog open onClose={onClose} onSubmit={onSubmit} />);
  return { onSubmit, onClose, dialog: within(screen.getByRole('dialog')) };
}

describe('RecordPurchaseDialog', () => {
  it('renders nothing while closed', () => {
    render(<RecordPurchaseDialog open={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers only mapped products, in code order, including the colosseum', () => {
    const { dialog } = renderDialog();
    const options = within(dialog.getByLabelText('Product'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options[0]).toBe('BR-01 Storm Falcon');
    expect(options.at(-1)).toBe('BR-10 Fold Colosseum');
    expect(options).toHaveLength(10);
  });

  it('does not offer a product with no mapping', () => {
    const unmapped = { ...PRODUCTS[0], code: 'BR-99', nameEn: 'Mystery Box' };
    render(
      <RecordPurchaseDialog
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        products={[...PRODUCTS, unmapped]}
      />,
    );
    expect(screen.queryByRole('option', { name: /BR-99/ })).toBeNull();
  });

  it('defaults the acquisition date to today', () => {
    const { dialog } = renderDialog();
    expect(dialog.getByLabelText('Acquired on')).toHaveValue(todayIso());
  });

  it('submits the chosen product, date and note, then closes', async () => {
    const { dialog, onSubmit, onClose } = renderDialog();
    await userEvent.selectOptions(dialog.getByLabelText('Product'), 'BR-10');
    const date = dialog.getByLabelText('Acquired on');
    await userEvent.clear(date);
    await userEvent.type(date, '2026-09-19');
    await userEvent.type(dialog.getByLabelText('Note (optional)'), ' launch day ');
    await userEvent.click(dialog.getByRole('button', { name: 'Record purchase' }));

    expect(onSubmit).toHaveBeenCalledWith({
      productCode: 'BR-10',
      acquiredAt: '2026-09-19',
      note: 'launch day',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the error and stays open when recording fails', async () => {
    const onSubmit = vi.fn(async () => {
      throw new Error('Could not record purchase: nope');
    });
    const { dialog, onClose } = renderDialog(onSubmit);
    await userEvent.click(dialog.getByRole('button', { name: 'Record purchase' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('Could not record purchase: nope');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cancels without submitting', async () => {
    const { dialog, onSubmit, onClose } = renderDialog();
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
