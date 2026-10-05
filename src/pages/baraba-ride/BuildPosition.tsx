import { Link } from 'react-router';
import type { BuildPart, Position } from '@/lib/br/build-types';
import type { PositionCheck } from '@/lib/br/builds';
import type { Instance } from '@/lib/br/inventory-types';
import { PRODUCTS, findPartSources } from '@/lib/br/catalog';
import { POSITION_LABELS } from '@/lib/br/labels';
import { brRoutes } from '@/lib/br/routes';
import { CatalogImage } from './CatalogImage';
import { describePart, instanceSourceLabel } from './partDisplay';

interface BuildPositionProps {
  position: Position;
  part: BuildPart | undefined;
  /** The plan check for this position; absent on a built build. */
  check?: PositionCheck;
  /** True on a built build, whose positions hold instances and are only swapped. */
  built: boolean;
  /** The instance held here, once the inventory has loaded. */
  instance?: Instance;
  busy: boolean;
  onChoose: () => void;
  /** Empties the position. Never passed for a built build. */
  onClear?: () => void;
}

/** Catalog products a missing part can be found in: the named one, or every source. */
function missingSources(part: BuildPart) {
  if (part.variantProductCode) {
    return PRODUCTS.filter((p) => p.code === part.variantProductCode);
  }
  return findPartSources(part.itemId).map(({ product }) => product);
}

function CheckLine({ check }: { check: PositionCheck }) {
  if (check.state === 'empty') return null;
  if (check.state === 'available') {
    return (
      <p className="br-position-check" data-state="available">
        Available
      </p>
    );
  }
  if (check.state === 'in-use') {
    return (
      <p className="br-position-check" data-state="in-use">
        In use by{' '}
        {check.heldBy.map((build, index) => (
          <span key={build.id}>
            {index > 0 && ', '}
            <Link to={brRoutes.build(build.id)}>{build.name}</Link>
          </span>
        ))}
      </p>
    );
  }
  const sources = missingSources(check.part);
  return (
    <p className="br-position-check" data-state="missing">
      Missing
      {sources.length > 0 && (
        <>
          {' — found in '}
          {sources.map((product, index) => (
            <span key={product.code}>
              {index > 0 && ', '}
              <Link to={brRoutes.product(product.code)}>{product.code}</Link>
            </span>
          ))}
        </>
      )}
    </p>
  );
}

/** One position of a build: what it holds, how it checks, and the actions on it. */
export function BuildPosition({
  position,
  part,
  check,
  built,
  instance,
  busy,
  onChoose,
  onClear,
}: BuildPositionProps) {
  const label = POSITION_LABELS[position];
  const display = part && describePart(part.itemId, part.variantProductCode);

  return (
    <section
      className="br-position"
      style={{ gridArea: position }}
      aria-label={label}
      data-state={check?.state}
    >
      <h3 className="br-slot">{label}</h3>
      {part && display ? (
        <div className="br-named-part">
          <CatalogImage className="br-variant-image" src={display.imageUrl} alt="" />
          <div>
            <p className="br-part-name">{display.name}</p>
            <p className="br-variant-color">
              {built && !part.variantProductCode
                ? instance
                  ? instanceSourceLabel(instance)
                  : 'Unknown source'
                : display.variantLabel}
            </p>
            {instance?.note && <p className="br-instance-note">{instance.note}</p>}
          </div>
        </div>
      ) : (
        <p className="br-unknown">Empty</p>
      )}
      {check && <CheckLine check={check} />}
      <div className="br-instance-actions">
        <button type="button" onClick={onChoose} disabled={busy}>
          {built ? 'Swap' : part ? 'Change' : 'Choose'}
        </button>
        {onClear && part && (
          <button type="button" onClick={onClear} disabled={busy}>
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
