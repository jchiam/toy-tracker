import { Navigate, Route, Routes, useParams } from 'react-router';
import { brRoutes } from '@/lib/br/routes';
import { useBrBuilds, type BrBuilds } from '@/hooks/useBrBuilds';
import { useBrInventory, type BrInventory } from '@/hooks/useBrInventory';
import { BuildList } from './BuildList';
import { BuildView } from './BuildView';

interface BuildsSegmentProps {
  /** Supabase auth user id of the signed-in user. */
  userId: string;
}

interface LoadedProps {
  builds: BrBuilds;
  inventory: BrInventory;
}

function BuildRoute({ builds, inventory }: LoadedProps) {
  const { id } = useParams();
  const build = builds.builds.find((b) => b.id === id);

  // Keyed by id so the name and note drafts reset when another build opens.
  if (build)
    return <BuildView key={build.id} build={build} builds={builds} inventory={inventory} />;
  return (
    <>
      {!builds.loading && !builds.error && <p className="br-empty">No build with that address.</p>}
      <BuildList builds={builds} inventory={inventory} />
    </>
  );
}

/** The Builds segment: the builds list and one build's view over shared builds and inventory loads. */
export function BuildsSegment({ userId }: BuildsSegmentProps) {
  const inventory = useBrInventory(userId);
  const builds = useBrBuilds(userId);

  return (
    <Routes>
      <Route index element={<BuildList builds={builds} inventory={inventory} />} />
      <Route path=":id" element={<BuildRoute builds={builds} inventory={inventory} />} />
      <Route path="*" element={<Navigate to={brRoutes.builds} replace />} />
    </Routes>
  );
}
