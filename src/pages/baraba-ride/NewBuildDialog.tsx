import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Build } from '@/lib/br/build-types';
import { BUILD_NAME_MAX, buildNameError } from '@/lib/br/builds';
import { brRoutes } from '@/lib/br/routes';

interface NewBuildDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<Build>;
}

/** Names a new build, creates it as an empty plan and opens it. Rendered only while open. */
export function NewBuildDialog({ open, onClose, onSubmit }: NewBuildDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = buildNameError(name);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const build = await onSubmit(name.trim());
      setName('');
      onClose();
      navigate(brRoutes.build(build.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="br-dialog-backdrop">
      <dialog open className="br-dialog" aria-labelledby="br-new-build-title">
        <form onSubmit={submit} noValidate>
          <h3 id="br-new-build-title">New build</h3>
          <label>
            Name
            <input
              type="text"
              value={name}
              maxLength={BUILD_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Red Dash"
              autoFocus
            />
          </label>
          {error && (
            <p className="br-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="br-dialog-actions">
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" disabled={busy}>
              Create build
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
