import { useState } from 'react';
import type { Accessory, Part, Product } from '@/lib/br/types';
import { ACCESSORY_KINDS, SLOTS } from '@/lib/br/types';
import {
  ACCESSORIES,
  PARTS,
  PRODUCTS,
  findAccessorySources,
  findPartSources,
} from '@/lib/br/catalog';
import { ACCESSORY_KIND_HEADINGS, SLOT_HEADINGS } from '@/lib/br/labels';
import type { NewInstance } from '@/lib/br/inventory-types';

interface AddItemsDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (item: NewInstance, quantity: number) => Promise<void>;
  parts?: Part[];
  accessories?: Accessory[];
  products?: Product[];
}

const UNKNOWN = '';

/** Adds standalone instances of one catalogued part or accessory. Rendered only while open. */
export function AddItemsDialog({
  open,
  onClose,
  onSubmit,
  parts = PARTS,
  accessories = ACCESSORIES,
  products = PRODUCTS,
}: AddItemsDialogProps) {
  const [itemId, setItemId] = useState(parts[0]?.id ?? accessories[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [source, setSource] = useState(UNKNOWN);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isPart = parts.some((p) => p.id === itemId);
  const sources = isPart
    ? findPartSources(itemId, products)
    : findAccessorySources(itemId, products);

  const chooseItem = (next: string) => {
    setItemId(next);
    setSource(UNKNOWN);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemId) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ itemId, variantProductCode: source || null }, quantity);
      setQuantity(1);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="br-dialog-backdrop">
      <dialog open className="br-dialog" aria-labelledby="br-add-items-title">
        <form onSubmit={submit}>
          <h3 id="br-add-items-title">Add items</h3>
          <label>
            Item
            <select value={itemId} onChange={(event) => chooseItem(event.target.value)} required>
              {SLOTS.map((slot) => {
                const members = parts.filter((p) => p.slot === slot);
                return members.length > 0 ? (
                  <optgroup key={slot} label={SLOT_HEADINGS[slot]}>
                    {members.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.nameEn}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
              {ACCESSORY_KINDS.map((kind) => {
                const members = accessories.filter((a) => a.kind === kind);
                return members.length > 0 ? (
                  <optgroup key={kind} label={ACCESSORY_KIND_HEADINGS[kind]}>
                    {members.map((accessory) => (
                      <option key={accessory.id} value={accessory.id}>
                        {accessory.nameEn}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              required
            />
          </label>
          <label>
            Source product
            <select value={source} onChange={(event) => setSource(event.target.value)}>
              <option value={UNKNOWN}>Unknown</option>
              {sources.map(({ product }) => (
                <option key={product.code} value={product.code}>
                  {product.code} {product.nameEn}
                </option>
              ))}
            </select>
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
            <button type="submit" disabled={busy || !itemId}>
              Add items
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
