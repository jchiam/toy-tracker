import { useState } from 'react';
import { Link } from 'react-router';
import type { Build } from '@/lib/br/build-types';
import type { Instance, Purchase } from '@/lib/br/inventory-types';
import type { Product } from '@/lib/br/types';
import { PRODUCTS } from '@/lib/br/catalog';
import { formatDate } from '@/lib/br/labels';
import { brRoutes } from '@/lib/br/routes';

export interface InstanceListActions {
  onRetire: (instanceId: string, note: string) => Promise<void>;
  onReactivate: (instanceId: string) => Promise<void>;
  onDelete: (instanceId: string) => Promise<void>;
}

interface InstanceListProps {
  instances: Instance[];
  /** Purchases by id, to show acquisition dates on linked instances. */
  purchases?: Purchase[];
  products?: Product[];
  actions: InstanceListActions;
  /** The build holding each claimed instance; a held instance cannot be retired or deleted. */
  claims?: Map<string, Build>;
  /** Accessible name for the list. */
  label: string;
}

const NO_CLAIMS = new Map<string, Build>();

type Pending = { id: string; kind: 'retire' | 'delete' } | null;

function sourceLabel(instance: Instance, products: Product[]): string {
  if (!instance.variantProductCode) return 'Unknown source';
  const product = products.find((p) => p.code === instance.variantProductCode);
  return product ? `${product.code} ${product.nameEn}` : instance.variantProductCode;
}

/** Expandable list of instances with retire, reactivate and delete, each confirmed in place. */
export function InstanceList({
  instances,
  purchases = [],
  products = PRODUCTS,
  actions,
  claims = NO_CLAIMS,
  label,
}: InstanceListProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const purchasesById = new Map(purchases.map((p) => [p.id, p]));

  const begin = (next: Pending) => {
    setPending(next);
    setNote('');
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
      setPending(null);
    } catch {
      // The hook records the message; the row stays open so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <ul className="br-instance-list" aria-label={label}>
      {instances.map((instance) => {
        const purchase = instance.purchaseId ? purchasesById.get(instance.purchaseId) : undefined;
        const isPending = pending?.id === instance.id;
        const heldBy = claims.get(instance.id);
        const blockedId = heldBy ? `br-instance-held-${instance.id}` : undefined;
        return (
          <li
            key={instance.id}
            className={`br-instance br-instance-${instance.status}`}
            data-status={instance.status}
          >
            <div className="br-instance-row">
              <span className="br-instance-source">{sourceLabel(instance, products)}</span>
              {purchase && (
                <span className="br-instance-date">
                  Purchased {formatDate(purchase.acquiredAt)}
                </span>
              )}
              <span className="br-status" data-status={instance.status}>
                {instance.status === 'active' ? 'Active' : 'Retired'}
              </span>
              {instance.note && <span className="br-instance-note">{instance.note}</span>}
              {heldBy && (
                <span id={blockedId} className="br-instance-build">
                  In use by <Link to={brRoutes.build(heldBy.id)}>{heldBy.name}</Link>
                </span>
              )}
              <span className="br-instance-actions">
                {instance.status === 'active' ? (
                  <button
                    type="button"
                    onClick={() => begin({ id: instance.id, kind: 'retire' })}
                    disabled={busy || heldBy !== undefined}
                    aria-describedby={blockedId}
                  >
                    Retire
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => run(() => actions.onReactivate(instance.id))}
                    disabled={busy}
                  >
                    Reactivate
                  </button>
                )}
                <button
                  type="button"
                  className="br-danger"
                  onClick={() => begin({ id: instance.id, kind: 'delete' })}
                  disabled={busy || heldBy !== undefined}
                  aria-describedby={blockedId}
                >
                  Delete
                </button>
              </span>
            </div>

            {isPending && pending.kind === 'retire' && (
              <form
                className="br-instance-confirm"
                aria-label="Retire this item"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(() => actions.onRetire(instance.id, note.trim()));
                }}
              >
                <label>
                  Reason (optional)
                  <input
                    type="text"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. cracked"
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Confirm retire
                </button>
                <button type="button" onClick={() => setPending(null)} disabled={busy}>
                  Cancel
                </button>
              </form>
            )}

            {isPending && pending.kind === 'delete' && (
              <div className="br-instance-confirm" role="group" aria-label="Delete this item">
                <p>Delete this item? This cannot be undone.</p>
                <button
                  type="button"
                  className="br-danger"
                  onClick={() => run(() => actions.onDelete(instance.id))}
                  disabled={busy}
                >
                  Confirm delete
                </button>
                <button type="button" onClick={() => setPending(null)} disabled={busy}>
                  Cancel
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
