# Proposal

## Why

The Builds segment is still a placeholder, so the inventory records what the user owns but not what it is assembled into. The user wants to record the machines they have built, which take parts out of circulation, and to sketch machines they might build and see whether the parts on hand allow it.

## What Changes

- Replace the Builds placeholder with a list of the user's builds at `/baraba-ride/builds` and a build view at `/baraba-ride/builds/<id>`.
- A build is a named machine with seven positions: bumper, cowl, chassis, and four tires held per wheel (front-left, front-right, rear-left, rear-right). Any tire may go on any wheel.
- A build is either a **plan** or **built**:
  - A plan position names a part and, optionally, the product it comes from (its colour variant). A plan claims nothing from the inventory and may be incomplete.
  - A built build holds seven specific inventory instances. One instance can be in at most one built build, guaranteed by the database.
- A plan is checked on its own against the user's free parts (active instances not held by a built build). Each position reports whether it can be filled, is held by a named built build, or is missing. Plans do not compete with each other.
- Marking a plan built picks matching free instances automatically (oldest first), lets the user choose a different matching instance per position, and is refused with reasons when any position cannot be filled. Taking a built build apart returns it to a plan and frees its parts.
- A built build can have a position swapped in place for another free instance; it is never left incomplete.
- Inventory changes:
  - Retiring or deleting an instance that a built build holds is refused, naming the build. Deleting a purchase is refused while any of its instances is held, naming the builds.
  - The Items view shows, per item, how many active instances are in builds and how many are free, and every instance list names the build holding an instance.
- Sign-in from the gate returns the user to the address they opened (path and query), not to the game root, so a link to a build survives signing in.

## Capabilities

### New Capabilities

- `br-builds`: Baraba Ride builds — planned and built machines made of seven positions, plan checking against free parts, claiming inventory instances when built, and the Builds list and build view.

### Modified Capabilities

- `br-inventory`: retire and delete are refused for instances held by a built build; the Items view gains in-build and free counts; instance lists name the holding build.
- `br-segments`: the "Builds segment shows a placeholder" requirement is removed.
- `auth`: the sign-in gate on a game page returns the user to the address they opened rather than to the game's root route.

## Impact

- **Database**: new migration adding `br_builds` and `br_build_parts` with owner-scoped RLS, a partial unique index on the claimed instance, a foreign key that blocks deleting a claimed instance, a trigger that blocks retiring one, and two functions (`br_mark_built`, `br_take_apart`) called over RPC. First use of Postgres functions and triggers in this project.
- **Client**: new `src/services/br/builds.ts`, `src/hooks/useBrBuilds.ts`, `src/lib/br/builds.ts` (pure availability and assignment logic) and build types; new components under `src/pages/baraba-ride/` for the Builds segment; `BrPage.tsx` mounts `builds/*`; `brRoutes` gains a build path.
- **Inventory UI**: `InventorySegment`, `InventoryItems`, `InventoryPurchases` and `InstanceList` read build claims to show counts, build names and blocked actions.
- **Auth**: `App.tsx` passes the current address to `signInWithGoogle`. The Supabase project's redirect allow-list must accept deep paths on the app origin.
- **Tests and docs**: unit, hook, component and Playwright coverage for builds; `BrPage.test.tsx` and the segment e2e spec lose the placeholder assertions; CLAUDE.md's architecture notes are updated.
- No new dependencies. No catalog data changes.
