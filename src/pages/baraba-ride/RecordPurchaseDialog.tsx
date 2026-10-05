import { useState } from 'react';
import type { Product } from '@/lib/br/types';
import { PRODUCTS, purchasableProducts } from '@/lib/br/catalog';
import { todayIso } from '@/lib/br/labels';
import type { RecordPurchaseInput } from '@/services/br/inventory';

interface RecordPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: RecordPurchaseInput) => Promise<void>;
  products?: Product[];
}

/** Records a purchase of one mapped product. Rendered only while open. */
export function RecordPurchaseDialog({
  open,
  onClose,
  onSubmit,
  products = PRODUCTS,
}: RecordPurchaseDialogProps) {
  const options = purchasableProducts(products);
  const [productCode, setProductCode] = useState(options[0]?.code ?? '');
  const [acquiredAt, setAcquiredAt] = useState(todayIso());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productCode) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ productCode, acquiredAt, note: note.trim() });
      setNote('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="br-dialog-backdrop">
      <dialog open className="br-dialog" aria-labelledby="br-record-purchase-title">
        <form onSubmit={submit}>
          <h3 id="br-record-purchase-title">Record a purchase</h3>
          <label>
            Product
            <select
              value={productCode}
              onChange={(event) => setProductCode(event.target.value)}
              required
            >
              {options.map((product) => (
                <option key={product.code} value={product.code}>
                  {product.code} {product.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label>
            Acquired on
            <input
              type="date"
              value={acquiredAt}
              onChange={(event) => setAcquiredAt(event.target.value)}
              required
            />
          </label>
          <label>
            Note (optional)
            <input type="text" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {error && (
            <p className="br-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="br-dialog-actions">
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !productCode}>
              Record purchase
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
