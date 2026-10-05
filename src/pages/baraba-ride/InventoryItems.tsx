import type { BrInventory } from '@/hooks/useBrInventory';

interface InventoryItemsProps {
  inventory: BrInventory;
}

/** Items view: every catalogued item the user owns, grouped, with its instances. */
export function InventoryItems({ inventory }: InventoryItemsProps) {
  return (
    <section aria-labelledby="br-inventory-items-title">
      <h2 id="br-inventory-items-title">Items</h2>
      {inventory.loading && <p>Loading inventory...</p>}
    </section>
  );
}
