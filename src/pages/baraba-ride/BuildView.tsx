import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { BrBuilds } from '@/hooks/useBrBuilds';
import type { BrInventory } from '@/hooks/useBrInventory';
import { POSITIONS, TIRE_POSITIONS, positionSlot } from '@/lib/br/build-types';
import type { Build, Position } from '@/lib/br/build-types';
import { BUILD_NAME_MAX, buildNameError, checkPlan, swapCandidates } from '@/lib/br/builds';
import { POSITION_LABELS, SLOT_LABELS } from '@/lib/br/labels';
import { brRoutes } from '@/lib/br/routes';
import { BuildPosition } from './BuildPosition';
import { PlanPartPicker } from './PlanPartPicker';
import { InstancePicker } from './InstancePicker';
import { MarkBuiltDialog } from './MarkBuiltDialog';

interface BuildViewProps {
  build: Build;
  builds: BrBuilds;
  inventory: BrInventory;
}

/** Which dialog or in-place confirmation is open. */
type Open =
  | { kind: 'position'; position: Position }
  | { kind: 'fill-tires' }
  | { kind: 'mark-built' }
  | { kind: 'rename' }
  | { kind: 'take-apart' }
  | { kind: 'delete' }
  | null;

/**
 * One build: its name, status and note, and its seven positions laid out with
 * the bumper leading. A plan's positions are chosen from the catalog and
 * checked against the free parts; a built build's positions hold instances
 * and can only be swapped.
 */
export function BuildView({ build, builds: state, inventory }: BuildViewProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Open>(null);
  const [name, setName] = useState(build.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [note, setNote] = useState(build.note);
  const [busy, setBusy] = useState(false);

  const { builds, actions } = state;
  const { instances } = inventory;
  const isPlan = build.status === 'plan';
  const loading = state.loading || inventory.loading;
  const error = state.error ?? inventory.error;
  const check = isPlan ? checkPlan(build, instances, builds) : [];

  /** Runs a write; the hook records a failure, so the view only tracks busy. */
  const run = async (write: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    try {
      await write();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const rename = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = buildNameError(name);
    setNameError(invalid);
    if (invalid) return;
    if (await run(() => actions.updateBuild(build.id, { name: name.trim() }))) setOpen(null);
  };

  const saveNote = (event: React.FormEvent) => {
    event.preventDefault();
    void run(() => actions.updateBuild(build.id, { note: note.trim() }));
  };

  const remove = async () => {
    if (await run(() => actions.deleteBuild(build.id))) navigate(brRoutes.builds);
  };

  const takeApart = async () => {
    if (await run(() => actions.takeApart(build.id))) setOpen(null);
  };

  const picking = open?.kind === 'position' ? open.position : null;

  return (
    <section className="br-build" aria-labelledby="br-build-title">
      <Link to={brRoutes.builds} className="br-back-link">
        ← All builds
      </Link>

      <div className="br-toolbar">
        <h2 id="br-build-title">
          {build.name}{' '}
          <span className="br-status" data-status={build.status}>
            {isPlan ? 'Plan' : 'Built'}
          </span>
        </h2>
        <div className="br-toolbar-actions">
          <button
            type="button"
            onClick={() => {
              setName(build.name);
              setNameError(null);
              setOpen({ kind: 'rename' });
            }}
            disabled={busy}
          >
            Rename
          </button>
          {isPlan ? (
            <button
              type="button"
              onClick={() => setOpen({ kind: 'mark-built' })}
              disabled={busy || loading}
            >
              Mark built
            </button>
          ) : (
            <button type="button" onClick={() => setOpen({ kind: 'take-apart' })} disabled={busy}>
              Take apart
            </button>
          )}
          <button
            type="button"
            className="br-danger"
            onClick={() => setOpen({ kind: 'delete' })}
            disabled={busy}
          >
            Delete build
          </button>
        </div>
      </div>

      {error && (
        <p className="br-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p className="br-loading">Loading build...</p>}

      {open?.kind === 'rename' && (
        <form className="br-instance-confirm" aria-label="Rename this build" onSubmit={rename}>
          <label>
            Name
            <input
              type="text"
              value={name}
              maxLength={BUILD_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="submit" disabled={busy}>
            Save name
          </button>
          <button type="button" onClick={() => setOpen(null)} disabled={busy}>
            Cancel
          </button>
          {nameError && (
            <p className="br-form-error" role="alert">
              {nameError}
            </p>
          )}
        </form>
      )}

      {open?.kind === 'take-apart' && (
        <div className="br-instance-confirm" role="group" aria-label="Take this build apart">
          <p>
            Take this build apart? It becomes a plan of the same parts, and its seven parts are free
            again.
          </p>
          <button type="button" onClick={takeApart} disabled={busy}>
            Confirm take apart
          </button>
          <button type="button" onClick={() => setOpen(null)} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      {open?.kind === 'delete' && (
        <div className="br-instance-confirm" role="group" aria-label="Delete this build">
          <p>
            {isPlan
              ? 'Delete this build? This cannot be undone.'
              : 'Delete this build? Its seven parts are freed and stay in your inventory. This cannot be undone.'}
          </p>
          <button type="button" className="br-danger" onClick={remove} disabled={busy}>
            Confirm delete
          </button>
          <button type="button" onClick={() => setOpen(null)} disabled={busy}>
            Cancel
          </button>
        </div>
      )}

      <form className="br-instance-confirm br-build-note" onSubmit={saveNote}>
        <label>
          Note
          <input type="text" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button type="submit" disabled={busy || note.trim() === build.note}>
          Save note
        </button>
      </form>

      <div className="br-build-layout" role="group" aria-label="Positions">
        {POSITIONS.map((position) => {
          const part = build.parts.find((p) => p.position === position);
          return (
            <BuildPosition
              key={position}
              position={position}
              part={part}
              check={isPlan ? check.find((c) => c.position === position) : undefined}
              built={!isPlan}
              instance={isPlan ? undefined : instances.find((i) => i.id === part?.instanceId)}
              busy={busy}
              onChoose={() => setOpen({ kind: 'position', position })}
              onClear={
                isPlan
                  ? () => void run(() => actions.clearPlanPosition(build.id, position))
                  : undefined
              }
            />
          );
        })}
      </div>

      {isPlan && (
        <div className="br-toolbar-actions">
          <button type="button" onClick={() => setOpen({ kind: 'fill-tires' })} disabled={busy}>
            Fill all four tires
          </button>
        </div>
      )}

      {isPlan && (
        <>
          <PlanPartPicker
            open={picking !== null}
            title={picking ? `Choose: ${POSITION_LABELS[picking].toLowerCase()}` : ''}
            slot={picking ? positionSlot(picking) : 'tire'}
            instances={instances}
            builds={builds}
            onChoose={(itemId, variantProductCode) =>
              actions.setPlanPositions(build.id, [
                { position: picking!, itemId, variantProductCode },
              ])
            }
            onClose={() => setOpen(null)}
          />
          <PlanPartPicker
            open={open?.kind === 'fill-tires'}
            title={`Choose a ${SLOT_LABELS.tire.toLowerCase()} for all four wheels`}
            slot="tire"
            instances={instances}
            builds={builds}
            onChoose={(itemId, variantProductCode) =>
              actions.setPlanPositions(
                build.id,
                TIRE_POSITIONS.map((position) => ({ position, itemId, variantProductCode })),
              )
            }
            onClose={() => setOpen(null)}
          />
          <MarkBuiltDialog
            open={open?.kind === 'mark-built'}
            build={build}
            instances={instances}
            builds={builds}
            onConfirm={(claims) => actions.markBuilt(build.id, claims)}
            onClose={() => setOpen(null)}
          />
        </>
      )}

      {!isPlan && (
        <InstancePicker
          open={picking !== null}
          title={picking ? `Swap: ${POSITION_LABELS[picking].toLowerCase()}` : ''}
          candidates={picking ? swapCandidates(build, picking, instances, builds) : []}
          currentId={build.parts.find((p) => p.position === picking)?.instanceId ?? null}
          onChoose={(instance) => actions.swapBuiltPosition(build.id, picking!, instance)}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
