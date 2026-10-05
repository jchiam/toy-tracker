# Design

## Context

See proposal.md for motivation. Current state that shapes the approach:

- Inventory is one `br_instances` row per physical item (`item_id` text, `variant_product_code` nullable, `status` active/retired), owner-scoped by RLS on `profile_id = auth.uid()::text`. The inventory design chose instances so that Builds could reference rows by id.
- The catalog is static JSON; part ids are `<slot>:<slug>` and frozen. Slots are cowl, bumper, tire, chassis. Tires ship as `h36` x4, `c36` x4, or `rw32` x2 with `lw32` x2, so a machine's four tires cannot be stored as "one part x4". Only starter sets BR-01 to BR-06 contain a chassis.
- All writes so far are single PostgREST requests, or two with a compensating delete (`recordPurchase`). There are no Postgres functions or triggers yet.
- `BrPage` mounts each segment under `/baraba-ride/*`; `InventorySegment` owns one `useBrInventory` load and passes it to its views. Hooks refetch after every write. Segments unmount when the user switches, so each segment entry loads fresh data.
- `App.tsx` starts sign-in with `signInWithGoogle(game.path)`, so a signed-out deep link returns to the game root. The segment-shell design deferred fixing this to the Builds change.
- The build sketch in the archived `add-br-segment-shell` design predates instances (`br_owned_products` with quantities). It is superseded by this document, except for the seven positions and the editor layout, which carry over.

Decisions confirmed with the user during exploration: built builds claim specific instances; retire and delete are blocked for claimed instances; a built build is swapped in place and never incomplete; a plan is checked alone against free parts; a plan position is a part plus optional variant; any tire fits any wheel.

## Goals / Non-Goals

**Goals:**

- The database, not only the app, guarantees that one instance is in at most one build and that a claimed instance cannot be deleted or retired.
- Marking built and taking apart are atomic.
- Plan checking and instance assignment are pure functions over already-loaded data, shared by the list, the build view, the mark-built dialog and the inventory views.
- No new dependencies and no catalog data changes.

**Non-Goals:**

- A build's battle style, stats, or legality rules. Nothing in the catalog supports them.
- Bumper or tire mounting orientation.
- A left/right rule for RW32 and LW32. Positions are per wheel, so a rule can be added later without changing stored builds.
- Plans reserving parts against other plans, or a "can I build all my plans at once" view.
- Build history, photos, duplication of a build, or sharing.
- Using the reserved `condition` column.

## Decisions

### D1. Two tables; a position row carries both the wish and the claim

```
br_builds
  id          uuid pk default gen_random_uuid()
  profile_id  text not null references user_profiles(id) on delete cascade
  name        text not null check (char_length(btrim(name)) between 1 and 60)
  status      text not null default 'plan' check (status in ('plan','built'))
  note        text not null default ''
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()

br_build_parts
  build_id              uuid not null references br_builds(id) on delete cascade
  position              text not null check (position in
                          ('bumper','cowl','chassis','tire_fl','tire_fr','tire_rl','tire_rr'))
  item_id               text not null
  variant_product_code  text null
  instance_id           uuid null references br_instances(id) deferrable initially deferred
  primary key (build_id, position)
  check (split_part(item_id, ':', 1) =
         case when position like 'tire_%' then 'tire' else position end)

unique index br_build_parts_instance_id_key on br_build_parts (instance_id)
  where instance_id is not null
index br_builds_profile_id_idx on br_builds (profile_id)
```

- An absent row is an empty position. A row with `instance_id` null is a plan wish: part plus optional variant. A row with `instance_id` set is a claim.
- **One rule for claimed rows:** whenever an instance is claimed, the row's `item_id` and `variant_product_code` are set to the instance's. A built build therefore always describes what is physically on the machine, and taking apart only has to null `instance_id` to leave a plan of the same parts and variants.
- The slot CHECK keeps accessories and wrong-slot parts out without a catalog lookup, relying on the frozen `<slot>:<slug>` id form.
- The partial unique index is the guarantee that an instance is in at most one build.
- Statuses and positions are CHECK-constrained text, not enums, matching `br_instances`.

Alternatives considered:

- _Separate `br_build_claims` table beside the plan rows._ Rejected: two rows per position to keep in step, for no behaviour the single row lacks.
- _Seven columns on `br_builds`._ Rejected: the unique-instance guarantee would need seven indexes plus cross-column checks.
- _Counts per item and variant instead of instance ids._ Rejected by the user in exploration; it cannot give a database guarantee or name the build that holds a given part.

### D2. Blocking delete and retire in the database

- `instance_id` references `br_instances(id)` with no delete action, `DEFERRABLE INITIALLY DEFERRED`. Deleting a claimed instance, directly or through the purchase cascade, fails the whole transaction at commit; one PostgREST request is one transaction, so the client sees the error on that request. Neither `RESTRICT` nor an immediate `NO ACTION` works: deleting a profile cascades to the instances before it reaches the build parts that reference them, and both reject it. Found by applying the migration to a local Postgres.
- A `BEFORE UPDATE OF status` trigger on `br_instances` raises when `NEW.status = 'retired'` and a `br_build_parts` row claims the instance.
- A `BEFORE INSERT OR UPDATE` trigger on `br_build_parts` raises when `instance_id` is set and the instance is not visible to the caller, is not active, or has a different `item_id` than the row. The lookup runs as the caller, so RLS on `br_instances` makes another user's instance "not found"; that is the ownership check.

The app checks the same conditions first and disables the action with the build's name (D7); the database is the backstop, and its raw error is only seen after a race.

Alternative considered: app-only checks, as the earlier sketch proposed. Rejected: the user chose blocking precisely so that a built build is always complete, and the foreign key costs nothing.

### D3. RLS

`br_builds`: RLS enabled, four policies on `profile_id = auth.uid()::text`, mirroring `br_instances`. `br_build_parts` has no `profile_id`; its four policies use `EXISTS (SELECT 1 FROM br_builds b WHERE b.id = build_id AND b.profile_id = auth.uid()::text)` in `USING` and `WITH CHECK`.

Alternative considered: duplicate `profile_id` onto `br_build_parts`. Rejected: a second copy of ownership that could disagree with its build.

### D4. Two functions for the multi-row transitions; everything else is one request

| Operation             | How                                                              | Atomic because      |
| --------------------- | ---------------------------------------------------------------- | ------------------- |
| Create build          | insert `br_builds`                                               | one row             |
| Rename, edit note     | update `br_builds`                                               | one row             |
| Set a plan position   | upsert one `br_build_parts` row                                  | one row             |
| Fill all four tires   | upsert four rows in one request                                  | one statement       |
| Clear a plan position | delete one row                                                   | one row             |
| Swap a built position | update one row: `instance_id`, `item_id`, `variant_product_code` | one row; D2 trigger |
| Delete build          | delete `br_builds`; parts cascade                                | one statement       |
| **Mark built**        | `rpc('br_mark_built', { p_build_id, p_claims })`                 | function            |
| **Take apart**        | `rpc('br_take_apart', { p_build_id })`                           | function            |

`br_mark_built(p_build_id uuid, p_claims jsonb)`, `SECURITY INVOKER`, `search_path = public`:

1. Lock the build row `WHERE id = p_build_id AND status = 'plan'`; raise if none (RLS hides foreign builds).
2. Raise unless `p_claims` is an object with exactly the seven position keys.
3. For each position, update the part row from the named instance, setting `instance_id` and copying `variant_product_code`, where the instance's `item_id` equals the row's and the row's variant is null or equal to the instance's. Raise if no row was updated (empty position or mismatch). The D2 trigger checks active and visible; the unique index rejects an instance claimed elsewhere.
4. Set `status = 'built'`, `updated_at = now()`.

`br_take_apart(p_build_id uuid)`: lock the build `WHERE status = 'built'`, null every `instance_id`, set `status = 'plan'`.

Execute is granted to `authenticated` only. Because the editor writes each change as it is made, there is no Save button and no multi-request plan write to compensate for.

Alternatives considered:

- _Two client requests with a compensating update, as `recordPurchase` does._ Rejected: a half-claimed build is exactly the state the user chose to rule out, and the inventory design already named a function as the stricter option to adopt "if partial writes ever bite".
- _A function for every write._ Rejected: single-row writes are already atomic and the existing service pattern handles them.
- _Deriving status from "all seven rows have an instance"._ Rejected: a stored status makes the list query and the function preconditions trivial, and "built" is the user's statement, not an inference.

Known limit: the database guarantees no double claim, no claim of a retired or foreign instance, and no loss of a claimed instance. That a built build has all seven positions claimed is guaranteed by the two functions and the absence of a clear action, not by a constraint. A hand-written API call could break it; the app would show such a build as built with an empty position.

### D5. Availability and assignment are one pure module

`src/lib/br/builds.ts`, no React or Supabase imports:

- `claims(builds)`: map of instance id to the build holding it.
- `freeInstances(instances, builds)`: active instances with no claim.
- `checkPlan(build, instances, builds)`: per position, `empty`, `available` (with the assigned instance), `in-use` (with the builds holding matching instances) or `missing`.
- `planReadiness(check)`: `ready`, `incomplete` (any empty position) or `short` with a count.
- `candidates(position, check, instances, builds)`: free matching instances for the mark-built override.
- `swapCandidates(slot, build, position, instances, builds)`: free instances of the slot plus the one currently held.

As built, the module also exports `matchesPart`, `countInBuilds`, `buildNameError`, `defaultAssignment` and `reassign` (the override rule below), and `candidates` and `swapCandidates` take the build rather than a slot. How a part, variant or instance reads on screen lives beside the components in `src/pages/baraba-ride/partDisplay.ts`.

Assignment in `checkPlan`: walk positions in editor order (bumper, front-left, front-right, cowl, chassis, rear-left, rear-right), positions naming a variant first, then any-variant positions; each takes the oldest unassigned free match. Variant-specific positions accept only their variant and any-variant positions accept everything, so serving the specific ones first never fails a plan that some other assignment could satisfy. Instances with no source product match only any-variant positions. A position left unassigned is `in-use` when any active matching instance is claimed by a built build, otherwise `missing`.

The mark-built dialog starts from this assignment and lets the user change a position to another candidate; choosing an instance already assigned to another position swaps the two. The list page runs `checkPlan` per plan; with tens of instances and a handful of builds this needs no memoisation beyond `useMemo` in the segment.

Alternative considered: computing availability in SQL (a view). Rejected: the client already holds every instance and build, and the logic needs the catalog for "missing" links.

### D6. Client structure

- `src/lib/br/build-types.ts`: `BuildStatus`, `Position`, `POSITIONS` (editor order), `positionSlot`, `Build` (with `parts: BuildPart[]`), row types and mappers, in the style of `inventory-types.ts`.
- `src/services/br/builds.ts`: `listBuilds` (one request, embedding `br_build_parts`), `createBuild` (calls `ensureProfile` first), `updateBuild`, `deleteBuild`, `setPlanPositions`, `clearPlanPosition`, `swapBuiltPosition`, `markBuilt`, `takeApart`. Same `fail(action, message)` convention and injectable client as the inventory service.
- `src/hooks/useBrBuilds.ts`: mirrors `useBrInventory` — load once per user, actions that write then refetch, `loading`, `error`, data kept on failure.
- `src/test/br-builds.ts`: `makeBuild`, `makeBuildPart`, `makeBuildsState`, alongside `br-inventory.ts`.
- `brRoutes.build(id)` returns `/baraba-ride/builds/<id>`.
- Components in `src/pages/baraba-ride/`:
  - `BuildsSegment`: calls `useBrInventory` and `useBrBuilds`; routes `index` to `BuildList`, `:id` to `BuildView`, `*` to a replace-redirect to the list. An unknown `:id` renders a message above `BuildList`, as `ProductRoute` does for unknown product codes.
  - `BuildList`, `NewBuildDialog`.
  - `BuildView`: header (name, status, note, rename, mark built or take apart, delete) and the seven `BuildPosition` cells laid out bumper, front tires, cowl, chassis, rear tires, with "Fill all four tires" for plans.
  - `PlanPartPicker`: for one position of a plan, every catalogued part of the slot; per part an "Any variant" choice and one choice per catalogued variant (`findPartVariants`) with its `CatalogImage`, colour label, product code and free count.
  - `InstancePicker`: for one position of a built build, the swap candidates listed as instances (part, source product, note).
  - `MarkBuiltDialog`: the per-position assignment with override, or the list of blocking reasons.
  - Dialogs are native `<dialog>` with in-dialog confirmation, as in the inventory dialogs.
- `BrPage.tsx` mounts `builds/*` on `BuildsSegment` and drops `SegmentPlaceholder`, which has no other user.

### D7. Inventory views read build claims

`InventorySegment` also calls `useBrBuilds(userId)` and passes the `claims` map down. Inventory views show the last loaded inventory even if the builds load fails, and surface that error.

- `InstanceList` takes `claims`; a claimed instance shows the build name as a link (`brRoutes.build`) and renders retire and delete as disabled with "In use by <name>" as the reason.
- `InventoryItems` shows "N in builds, M free" on an item when at least one active instance is claimed.
- `InventoryPurchases` blocks purchase delete when any linked instance is claimed, listing the build names in place of the confirmation step.

Alternative considered: one combined hook or a context at `BrShell` level. Rejected for now: two hooks composed in two segments is less machinery, and Catalog must keep making no user-data requests.

### D8. Sign-in returns to the opened address

`App.tsx` reads `useLocation()` and passes `location.pathname + location.search` to `signInWithGoogle` for game pages. `useAuth` and `GamePageProps` are unchanged; `SelectionPage` still signs in to the origin root. This also fixes signed-out query-string links (`/baraba-ride?product=BR-01`), which previously lost their query.

Supabase only honours `redirectTo` values on the project's redirect allow-list. The list must contain a wildcard for the app origins (`http://127.0.0.1:5175/**` and the production origin `/**`); an exact `/baraba-ride` entry is not enough. This is dashboard configuration, verified by hand.

### D9. Testing

- `src/lib/br/builds.test.ts`: assignment and check states, including demand counting, variant narrowing, unknown-source instances, retired instances, claimed instances, plans not competing, and the specific-before-any ordering.
- `src/services/br/builds.test.ts`: each service function against MSW handlers through the real supabase-js client, including the RPC paths (`POST /rest/v1/rpc/br_mark_built`) and error surfacing.
- Hook, component and story coverage per component, using `src/test/br-builds.ts`; components mock the service or receive built state, never the Supabase client.
- The migration's constraints, triggers and functions are not reachable from Vitest. They are verified by a written SQL checklist run against the dev project (double claim, retired claim, foreign instance, delete claimed instance, delete purchase with a claimed instance, retire claimed instance, profile delete, mark built with a taken instance leaves a plan).
- Playwright: the segment spec's Builds assertions change from the placeholder to the list; the existing `**/rest/v1/br_*` route stub already answers `br_builds` with `[]`. One new test creates a plan against stubbed responses and reaches the build view.

## Risks / Trade-offs

- [First Postgres functions and triggers in the project; logic now lives in SQL that unit tests cannot run] → Kept to two short functions and two triggers, each with a line in the manual SQL checklist; the client pre-checks every condition so the SQL is a backstop.
- [Built-build completeness is not a database constraint (D4)] → Only the two functions change status, and the UI offers no clear action on a built build. A deferred constraint trigger can be added later if it ever happens.
- [Trigger and unique-index errors reach the user as raw Postgres messages after a race] → The service wraps them as "Could not mark built: …"; the hook refetches, so the view then shows the true state. Single-user data makes races rare.
- [Catalog ids are unvalidated text in `br_build_parts`] → Same accepted trade-off as `br_instances`; a position whose part id the catalog no longer knows renders the raw id and checks as missing.
- [`position` is a non-reserved SQL keyword] → Valid as a column name in Postgres; quoted nowhere in PostgREST. Kept for readability.
- [Deep-link sign-in silently falls back to the Supabase Site URL if the allow-list lacks a wildcard] → Verified by hand on dev and production before release; failure mode is the current behaviour, not an error.
- [Inventory segment now makes a second request on entry] → One small query; acceptable.
- [A plan's "available" can go stale when another build is marked built] → Checks are computed from data refetched after every write and on every segment entry; plans never promised a reservation.

## Migration Plan

1. Add the wildcard redirect URLs to the Supabase project's auth settings (dev and production origins).
2. Push the migration with `npm run db:push`. It only adds objects; existing inventory rows are untouched and no instance is claimed, so the new trigger on `br_instances` cannot reject existing data.
3. Deploy the client.

Rollback: redeploy the previous client. The tables, functions and triggers can stay; with no client writing builds, nothing is claimed and the inventory behaves as before. Dropping them is a separate migration if ever wanted.
