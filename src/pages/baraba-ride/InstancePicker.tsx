import { useState } from 'react';
import type { Instance } from '@/lib/br/inventory-types';
import { instanceChoiceLabel } from './partDisplay';

interface InstancePickerProps {
  open: boolean;
  /** Dialog heading, e.g. `Swap the front-left tire`. */
  title: string;
  /** The instance the position holds now plus the free ones it could take. */
  candidates: Instance[];
  currentId: string | null;
  onChoose: (instance: Instance) => Promise<void>;
  onClose: () => void;
}

/**
 * Swaps the instance in one position of a built build for a free one. There
 * is no way to empty the position here. Rendered only while open.
 */
export function InstancePicker({
  open,
  title,
  candidates,
  currentId,
  onChoose,
  onClose,
}: InstancePickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const others = candidates.filter((instance) => instance.id !== currentId);

  const choose = async (instance: Instance) => {
    setBusy(true);
    setError(null);
    try {
      await onChoose(instance);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="br-dialog-backdrop">
      <dialog open className="br-dialog br-dialog-wide" aria-labelledby="br-instance-picker-title">
        <h3 id="br-instance-picker-title">{title}</h3>
        {others.length === 0 ? (
          <p className="br-unknown">No free part fits this position.</p>
        ) : (
          <ul className="br-picker-instances" aria-label="Free parts">
            {others.map((instance) => (
              <li key={instance.id}>
                <button
                  type="button"
                  className="br-picker-choice"
                  onClick={() => choose(instance)}
                  disabled={busy}
                >
                  {instanceChoiceLabel(instance)}
                </button>
              </li>
            ))}
          </ul>
        )}
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
