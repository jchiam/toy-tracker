import { useState } from 'react';
import type { BrInventory } from '@/hooks/useBrInventory';
import { sortPurchases } from '@/lib/br/inventory';
import { PRODUCTS } from '@/lib/br/catalog';
import { formatDate } from '@/lib/br/labels';
import { InstanceList, type InstanceListActions } from './InstanceList';
import { RecordPurchaseDialog } from './RecordPurchaseDialog';

interface InventoryPurchasesProps {
  inventory: BrInventory;
}

function productName(code: string): string {
  return PRODUCTS.find((p) => p.code === code)?.nameEn ?? code;
}

/** Purchases view: every recorded purchase with the instances it produced. */
export function InventoryPurchases({ inventory }: InventoryPurchasesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { purchases, instances, loading, error, actions } = inventory;
  const sorted = sortPurchases(purchases);

  const listActions: InstanceListActions = {
    onRetire: (id, note) => actions.setInstanceStatus(id, 'retired', note || undefined),
    onReactivate: (id) => actions.setInstanceStatus(id, 'active'),
    onDelete: (id) => actions.deleteInstance(id),
  };

  const confirmDelete = async (purchaseId: string) => {
    setBusy(true);
    try {
      await actions.deletePurchase(purchaseId);
      setConfirming(null);
    } catch {
      // The hook records the message; the confirmation stays open for a retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="br-inventory-purchases-title">
      <div className="br-toolbar">
        <h2 id="br-inventory-purchases-title">Purchases</h2>
        <div className="br-toolbar-actions">
          <button type="button" onClick={() => setDialogOpen(true)}>
            Record purchase
          </button>
        </div>
      </div>

      {error && (
        <p className="br-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="br-loading">Loading inventory...</p>}

      {!loading && !error && sorted.length === 0 && (
        <p className="br-empty">No purchases recorded yet.</p>
      )}

      {sorted.length > 0 && (
        <ul className="br-list br-item-groups" aria-label="Purchases">
          {sorted.map((purchase) => {
            const linked = instances.filter((i) => i.purchaseId === purchase.id);
            const name = productName(purchase.productCode);
            return (
              <li key={purchase.id}>
                <details className="br-purchase">
                  <summary>
                    <span className="br-code">{purchase.productCode}</span>
                    <span className="br-item-name">{name}</span>
                    <span className="br-purchase-date">{formatDate(purchase.acquiredAt)}</span>
                    {purchase.note && <span className="br-purchase-note">{purchase.note}</span>}
                    <span className="br-purchase-count">
                      {linked.length} {linked.length === 1 ? 'item' : 'items'}
                    </span>
                  </summary>
                  <div className="br-purchase-body">
                    <p className="br-unknown">
                      Items reflect the mapping at the time of recording; later mapping fixes do not
                      change them.
                    </p>
                    <InstanceList
                      instances={linked}
                      purchases={purchases}
                      actions={listActions}
                      label={`${purchase.productCode} items`}
                    />
                    <div className="br-purchase-actions">
                      {confirming === purchase.id ? (
                        <div role="group" aria-label="Delete this purchase">
                          <p>
                            Delete this purchase and its {linked.length}{' '}
                            {linked.length === 1 ? 'item' : 'items'}? This cannot be undone.
                          </p>
                          <button
                            type="button"
                            className="br-danger"
                            onClick={() => confirmDelete(purchase.id)}
                            disabled={busy}
                          >
                            Confirm delete
                          </button>
                          <button type="button" onClick={() => setConfirming(null)} disabled={busy}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="br-danger"
                          onClick={() => setConfirming(purchase.id)}
                          disabled={busy}
                        >
                          Delete purchase
                        </button>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <RecordPurchaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={actions.recordPurchase}
      />
    </section>
  );
}
