import type { BrInventory } from '@/hooks/useBrInventory';

interface InventoryPurchasesProps {
  inventory: BrInventory;
}

/** Purchases view: every recorded purchase with the instances it produced. */
export function InventoryPurchases({ inventory }: InventoryPurchasesProps) {
  return (
    <section aria-labelledby="br-inventory-purchases-title">
      <h2 id="br-inventory-purchases-title">Purchases</h2>
      {inventory.loading && <p>Loading inventory...</p>}
    </section>
  );
}
