import { useState } from 'react';
import { Link } from 'react-router';
import type { BrBuilds } from '@/hooks/useBrBuilds';
import type { BrInventory } from '@/hooks/useBrInventory';
import type { Build } from '@/lib/br/build-types';
import { checkPlan, planReadiness } from '@/lib/br/builds';
import { brRoutes } from '@/lib/br/routes';
import { NewBuildDialog } from './NewBuildDialog';

interface BuildListProps {
  builds: BrBuilds;
  inventory: BrInventory;
}

/** Builds list: every build with its status, and for plans whether the free parts allow it. */
export function BuildList({ builds: state, inventory }: BuildListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { builds, actions } = state;
  const loading = state.loading || inventory.loading;
  const error = state.error ?? inventory.error;

  const readiness = (build: Build): string => {
    const result = planReadiness(checkPlan(build, inventory.instances, builds));
    if (result.state === 'ready') return 'Ready to build';
    if (result.state === 'incomplete') return 'Incomplete';
    return `Short of ${result.count} ${result.count === 1 ? 'part' : 'parts'}`;
  };

  return (
    <section aria-labelledby="br-builds-title">
      <div className="br-toolbar">
        <h2 id="br-builds-title">Builds</h2>
        <div className="br-toolbar-actions">
          <button type="button" onClick={() => setDialogOpen(true)}>
            New build
          </button>
        </div>
      </div>

      {error && (
        <p className="br-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="br-loading">Loading builds...</p>}

      {!loading && !error && builds.length === 0 && (
        <p className="br-empty">No builds yet. Create one to plan a machine from your parts.</p>
      )}

      {builds.length > 0 && (
        <ul className="br-list br-item-groups" aria-label="Builds">
          {builds.map((build) => (
            <li key={build.id} className="br-build-row">
              <Link to={brRoutes.build(build.id)} className="br-item-name">
                {build.name}
              </Link>
              <span className="br-status" data-status={build.status}>
                {build.status === 'built' ? 'Built' : 'Plan'}
              </span>
              {build.status === 'plan' && !loading && (
                <span className="br-build-readiness">{readiness(build)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <NewBuildDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={actions.createBuild}
      />
    </section>
  );
}
