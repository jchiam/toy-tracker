import { useState } from 'react';
import type { Build } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';
import type { Part, Slot } from '@/lib/br/types';
import { PARTS, findPartVariants, variantShot } from '@/lib/br/catalog';
import { freeInstances, matchesPart } from '@/lib/br/builds';
import { getVariantImageUrl } from '@/lib/imagekit';
import { CatalogImage } from './CatalogImage';

interface PlanPartPickerProps {
  open: boolean;
  /** Dialog heading, e.g. `Choose a cowl`. */
  title: string;
  slot: Slot;
  instances: Instance[];
  builds: Build[];
  onChoose: (itemId: string, variantProductCode: string | null) => Promise<void>;
  onClose: () => void;
  parts?: Part[];
}

/**
 * Picks a part for a plan position: every catalogued part of the slot, owned
 * or not, as "any variant" or one catalogued variant, each with how many the
 * user has free. Choosing writes at once. Rendered only while open.
 */
export function PlanPartPicker({
  open,
  title,
  slot,
  instances,
  builds,
  onChoose,
  onClose,
  parts = PARTS,
}: PlanPartPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const free = freeInstances(instances, builds);
  const freeCount = (itemId: string, variantProductCode: string | null) =>
    free.filter((i) => matchesPart(i, { itemId, variantProductCode })).length;

  const choose = async (itemId: string, variantProductCode: string | null) => {
    setBusy(true);
    setError(null);
    try {
      await onChoose(itemId, variantProductCode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="br-dialog-backdrop">
      <dialog open className="br-dialog br-dialog-wide" aria-labelledby="br-part-picker-title">
        <h3 id="br-part-picker-title">{title}</h3>
        <div className="br-picker">
          {parts
            .filter((part) => part.slot === slot)
            .map((part) => (
              <section key={part.id} className="br-picker-part" aria-label={part.nameEn}>
                <h4>{part.nameEn}</h4>
                <div className="br-picker-choices">
                  <button
                    type="button"
                    className="br-picker-choice"
                    onClick={() => choose(part.id, null)}
                    disabled={busy}
                  >
                    <span>Any variant</span>
                    <span className="br-picker-free">{freeCount(part.id, null)} free</span>
                  </button>
                  {findPartVariants(part.id).map(({ product, variant }) => {
                    const shot = variantShot(product, variant);
                    return (
                      <button
                        key={product.code}
                        type="button"
                        className="br-picker-choice"
                        onClick={() => choose(part.id, product.code)}
                        disabled={busy}
                      >
                        <CatalogImage
                          className="br-picker-image"
                          src={shot && getVariantImageUrl(shot.path, shot.crop)}
                          alt=""
                        />
                        <span>
                          {variant.color} · {product.code}
                        </span>
                        <span className="br-picker-free">
                          {freeCount(part.id, product.code)} free
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
        {error && (
          <p className="br-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="br-dialog-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </dialog>
    </div>
  );
}
