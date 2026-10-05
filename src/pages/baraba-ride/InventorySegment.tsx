import { Link, Navigate, Route, Routes, useMatch } from 'react-router';
import { brRoutes } from '@/lib/br/routes';
import { useBrInventory } from '@/hooks/useBrInventory';
import { InventoryItems } from './InventoryItems';
import { InventoryPurchases } from './InventoryPurchases';

interface InventorySegmentProps {
  /** Supabase auth user id of the signed-in user. */
  userId: string;
}

/** The Inventory segment: Items / Purchases sub-navigation over one shared inventory load. */
export function InventorySegment({ userId }: InventorySegmentProps) {
  const showPurchases = useMatch(brRoutes.purchases) !== null;
  const inventory = useBrInventory(userId);

  return (
    <>
      <nav className="br-tabs" aria-label="Inventory views">
        <Link to={brRoutes.inventory} aria-current={showPurchases ? undefined : 'page'}>
          Items
        </Link>
        <Link to={brRoutes.purchases} aria-current={showPurchases ? 'page' : undefined}>
          Purchases
        </Link>
      </nav>

      <Routes>
        <Route index element={<InventoryItems inventory={inventory} />} />
        <Route path="purchases" element={<InventoryPurchases inventory={inventory} />} />
        <Route path="*" element={<Navigate to={brRoutes.inventory} replace />} />
      </Routes>
    </>
  );
}
