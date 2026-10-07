import { Link, Navigate, Route, Routes, useMatch } from 'react-router';
import { brRoutes } from '@/lib/br/routes';
import { useBrInventory } from '@/hooks/useBrInventory';
import { useBrBuilds } from '@/hooks/useBrBuilds';
import { claims } from '@/lib/br/builds';
import { InventoryItems } from './InventoryItems';
import { InventoryPurchases } from './InventoryPurchases';

interface InventorySegmentProps {
  /** Supabase auth user id of the signed-in user. */
  userId: string;
}

/**
 * The Inventory segment: Items / Purchases sub-navigation over one shared
 * inventory load. Builds are loaded too, so the views can name the build
 * holding an instance and block retiring or deleting it.
 */
export function InventorySegment({ userId }: InventorySegmentProps) {
  const showPurchases = useMatch(brRoutes.purchases) !== null;
  const inventory = useBrInventory(userId);
  const builds = useBrBuilds(userId);
  const held = claims(builds.builds);

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

      {builds.error && (
        <p className="br-error" role="alert">
          {builds.error}
        </p>
      )}

      <Routes>
        <Route index element={<InventoryItems inventory={inventory} claims={held} />} />
        <Route
          path="purchases"
          element={<InventoryPurchases inventory={inventory} claims={held} />}
        />
        <Route path="*" element={<Navigate to={brRoutes.inventory} replace />} />
      </Routes>
    </>
  );
}
