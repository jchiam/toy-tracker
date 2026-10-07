import { useState } from 'react';
import type { Assignment, Build, Position } from '@/lib/br/build-types';
import type { Instance } from '@/lib/br/inventory-types';
import {
  candidates,
  checkPlan,
  defaultAssignment,
  planReadiness,
  reassign,
  type PositionCheck,
} from '@/lib/br/builds';
import { POSITION_LABELS } from '@/lib/br/labels';
import { instanceChoiceLabel } from './partDisplay';

interface MarkBuiltDialogProps {
  open: boolean;
  build: Build;
  instances: Instance[];
  builds: Build[];
  onConfirm: (claims: Assignment) => Promise<void>;
  onClose: () => void;
}

function reason(check: PositionCheck): string {
  if (check.state === 'empty') return 'empty';
  if (check.state === 'in-use') {
    return `in use by ${check.heldBy.map((b) => `“${b.name}”`).join(', ')}`;
  }
  return 'missing';
}

/**
 * Confirms marking a plan built. Shows the instance chosen for each position,
 * the oldest free match by default, and lets the user pick another. When any
 * position is empty or cannot be filled it lists the reasons instead.
 * Rendered only while open.
 */
export function MarkBuiltDialog({
  open,
  build,
  instances,
  builds,
  onConfirm,
  onClose,
}: MarkBuiltDialogProps) {
  // Positions the user changed; the rest follow the current default assignment.
  const [chosen, setChosen] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const check = checkPlan(build, instances, builds);
  const blocked = check.filter((c) => c.state !== 'available');
  const assignment = chosen ?? defaultAssignment(check);

  const close = () => {
    setChosen(null);
    setError(null);
    onClose();
  };

  if (planReadiness(check).state !== 'ready') {
    return (
      <div className="br-dialog-backdrop">
        <dialog open className="br-dialog" aria-labelledby="br-mark-built-title">
          <h3 id="br-mark-built-title">Cannot mark built</h3>
          <p>Every position needs a free part.</p>
          <ul className="br-blocked-list" aria-label="Positions that cannot be filled">
            {blocked.map((c) => (
              <li key={c.position}>
                {POSITION_LABELS[c.position]}: {reason(c)}
              </li>
            ))}
          </ul>
          <div className="br-dialog-actions">
            <button type="button" onClick={close}>
              Close
            </button>
          </div>
        </dialog>
      </div>
    );
  }

  const pick = (position: Position, instanceId: string) => {
    const next = reassign(build, assignment, position, instanceId, instances, builds);
    if (next) setChosen(next);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm(assignment);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="br-dialog-backdrop">
      <dialog open className="br-dialog" aria-labelledby="br-mark-built-title">
        <form onSubmit={submit}>
          <h3 id="br-mark-built-title">Mark “{build.name}” built</h3>
          <p>These parts leave your free parts until the build is taken apart.</p>
          {check.map(({ position }) => (
            <label key={position}>
              {POSITION_LABELS[position]}
              <select
                value={assignment[position] ?? ''}
                onChange={(event) => pick(position, event.target.value)}
                disabled={busy}
              >
                {candidates(build, assignment, position, instances, builds).map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instanceChoiceLabel(instance)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {error && (
            <p className="br-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="br-dialog-actions">
            <button type="button" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy}>
              Mark built
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
