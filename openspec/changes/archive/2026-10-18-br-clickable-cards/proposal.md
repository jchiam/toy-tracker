# Proposal

## Why

On a build view, each position is a large card whose only way in is a small Choose, Change or Swap button in its corner, about 27px tall. The Builds list has the same problem: only the build's name is a link, so clicking a row's status or readiness does nothing. Both are single-purpose surfaces whose whole area should act.

## What Changes

- Activating anywhere on a build position opens its picker: the part picker on a plan, the swap picker on a built build. The position's own links (the build holding a part, the products a missing part ships in) and its Clear action keep their own behaviour.
- Activating anywhere on a row of the Builds list opens that build.
- Positions and rows show hover emphasis and a focus ring around the whole card, and stay a single keyboard control each.
- Shared action buttons gain a 36px minimum height, for easier tapping. This is styling only and is not specified.

Not in this change: Inventory instance rows (several equal actions, no single primary one) and Part Catalog cards (no destination of their own) stay as they are.

## Capabilities

### Modified Capabilities

- `br-builds`: the Builds list opens a build from anywhere on its row, and a build position opens its picker from anywhere on the position.

## Impact

- **Components**: `BuildPosition.tsx` (class names on its two buttons).
- **Styling**: `BrPage.css` (stretched button and link, hover and focus on the card, shared button minimum height).
- **Tests**: a new case in `tests/baraba-ride.spec.ts`; existing unit tests are unchanged.
- **No change** to data, services, Supabase, routing, or dependencies.
