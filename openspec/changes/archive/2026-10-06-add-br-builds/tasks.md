# Tasks

## 1. Database

- [x] 1.1 Write `supabase/migrations/<timestamp>_add_br_builds.sql` creating `br_builds` and `br_build_parts` per design D1 (CHECKs, primary key, partial unique index on `instance_id`, `profile_id` index) with RLS enabled and four policies per table per D3; verify it applies cleanly with `npm run db:push` against the dev project
- [x] 1.2 Add to the same migration the claim-check trigger on `br_build_parts` and the retire-block trigger on `br_instances` per D2; verify in the Supabase SQL editor that claiming a retired instance, claiming an instance with a different `item_id`, and retiring a claimed instance each raise
- [x] 1.3 Add `br_mark_built` and `br_take_apart` per D4 with execute granted to `authenticated` only; verify in the SQL editor that marking built with one already-claimed instance raises and leaves the build a plan with no `instance_id` set, and that take apart nulls all seven claims
- [x] 1.4 Record the SQL checklist from design D9 as comments at the top of the migration and run every line against the dev project as a second user where ownership matters (foreign build invisible, foreign instance refused, delete claimed instance refused, delete purchase with a claimed instance refused, profile delete succeeds); verify each outcome matches the comment
- [x] 1.5 Update CLAUDE.md's Architecture section for `br_builds`, `br_build_parts`, the claim and retire triggers and the two functions, including that a claimed instance cannot be deleted or retired; verify the text matches the migration's object names

## 2. Domain logic

- [x] 2.1 Add `src/lib/br/build-types.ts` (`BuildStatus`, `Position`, `POSITIONS` in editor order, `positionSlot`, `Build`, `BuildPart`, row types, mappers) and a position label helper in `src/lib/br/labels.ts`; verify with unit tests for the mappers and `positionSlot`, and that `npm run build` type-checks
- [x] 2.2 Add `claims` and `freeInstances` to `src/lib/br/builds.ts`; verify unit tests cover retired instances excluded and claimed instances excluded
- [x] 2.3 Add `checkPlan` and `planReadiness` per D5; verify unit tests cover each `br-builds` plan-check scenario (demand counted, held by a built build, variant narrows, unknown source, retired) plus plans not competing and variant-specific positions being served before any-variant ones
- [x] 2.4 Add `candidates` and `swapCandidates`; verify unit tests cover the current instance being included for a swap, other slots excluded, and claimed instances excluded
- [x] 2.5 Add `src/test/br-builds.ts` builders (`makeBuild`, `makeBuildPart`, `makeBuildsState`) free of vitest imports; verify the tests in 2.2 to 2.4 use them

## 3. Data access

- [x] 3.1 Add `src/services/br/builds.ts` with `listBuilds` (embedded parts), `createBuild` (after `ensureProfile`), `updateBuild`, `deleteBuild`; verify MSW-backed unit tests assert the request shape of each and that errors surface as "Could not <action>: …"
- [x] 3.2 Add `setPlanPositions`, `clearPlanPosition` and `swapBuiltPosition`; verify unit tests assert one request each, that fill-all-tires sends four rows in one upsert, and that a swap sends `instance_id`, `item_id` and `variant_product_code` together
- [x] 3.3 Add `markBuilt` and `takeApart` calling the RPC endpoints; verify unit tests assert the `p_claims` payload has the seven position keys and that an RPC error surfaces as "Could not mark built: …"
- [x] 3.4 Add `src/hooks/useBrBuilds.ts` mirroring `useBrInventory`; verify hook tests for load success, load failure keeping no stale error, a write followed by refetch, and a failed write keeping the shown data
- [x] 3.5 Update CLAUDE.md's Architecture section for `src/services/br/builds.ts`, `src/hooks/useBrBuilds.ts`, `src/lib/br/builds.ts` and `src/test/br-builds.ts`, including which writes go through RPC; verify every named file exists

## 4. Routes and segment shell

- [x] 4.1 Add `brRoutes.build(id)`; verify with a `routes.test.ts` case
- [x] 4.2 Create `BuildsSegment` (both hooks, routes `index`, `:id`, `*` replace-redirect, unknown-id message above the list), mount it at `builds/*` in `BrPage.tsx`, and remove `SegmentPlaceholder`; verify `BrPage.test.tsx` is updated to assert the builds list heading, a build opened by URL, the unknown-build message, and no Catalog or Inventory sub-navigation in Builds, with the placeholder assertions removed
- [x] 4.3 Change `App.tsx` to start game-page sign-in with the current path and query per D8; verify with an `App.test.tsx` case that the gate on `/baraba-ride/builds/abc` calls `signInWithGoogle('/baraba-ride/builds/abc')` and on `/baraba-ride?product=BR-01` passes the query
- [x] 4.4 Add the wildcard redirect URLs to the Supabase auth settings for the dev and production origins per D8 and verify by hand that signing in from the gate on a build URL returns to that URL
- [x] 4.5 Update CLAUDE.md's Architecture section for the Builds routes (`/builds`, `/builds/<id>`, `brRoutes.build`) and the sign-in return address; verify no remaining text calls Builds a placeholder

## 5. Builds list and creation

- [x] 5.1 Create `BuildList` (name, built or plan, plan readiness, link to the build, empty state, loading and error states) with a Storybook story; verify unit tests for ready, incomplete, short-of-N, built, empty, loading and error
- [x] 5.2 Create `NewBuildDialog` (required name, 60-character limit, blank refused) that creates the build and navigates to it; verify unit tests for create, blank name, and navigation to `brRoutes.build(id)`

## 6. Build view for plans

- [x] 6.1 Create `BuildView` and `BuildPosition` with the bumper, front tires, cowl, chassis, rear tires layout, showing each position's part, variant image and colour label, and its check state with held-by build names or Catalog links; verify unit tests for each of the four states and a story for an incomplete plan
- [x] 6.2 Create `PlanPartPicker` (parts of the slot, "Any variant" plus one choice per catalogued variant with free count, unowned parts selectable) and wire set and clear; verify unit tests that only the slot's parts are offered, that no accessory appears, and that choosing writes the part and variant
- [x] 6.3 Add "Fill all four tires" to the plan view; verify a unit test that one choice sets all four tire positions in one action
- [x] 6.4 Add rename, note editing and delete with confirmation to `BuildView`; verify unit tests for rename validation, note save, and delete returning to the list
- [x] 6.5 Verify in the dev app that setting a position updates its check without reload and that the Inventory Items counts do not change while editing a plan

## 7. Built builds

- [x] 7.1 Create `MarkBuiltDialog` showing the per-position assignment with an override among candidates, or the list of blocking reasons when any position is empty or not available; verify unit tests for the default oldest-first assignment, an override, choosing an instance assigned elsewhere swapping the two, and the refusal list
- [x] 7.2 Wire mark built to `markBuilt` and show a built build's positions from its claimed instances; verify unit tests that the claims sent match the dialog and that a failed write leaves the plan shown with an error
- [x] 7.3 Create `InstancePicker` for swapping a built position (free instances of the slot plus the current one, no clear action) and wire it to `swapBuiltPosition`; verify unit tests for the candidate list and that no clear control is rendered on a built build
- [x] 7.4 Add take apart with confirmation, and make delete's confirmation on a built build say its parts are freed; verify unit tests for both confirmations and a story for a built build
- [x] 7.5 Verify in the dev app the full cycle against the real database: mark built, swap one tire, take apart, and that marking a second build built with the same chassis is refused with the first build's name

## 8. Inventory integration

- [x] 8.1 Call `useBrBuilds` in `InventorySegment` and pass the claims map to its views; verify a test that a builds load failure still shows the inventory with an error message
- [x] 8.2 Extend `InstanceList` to show the holding build as a link and to disable retire and delete with "In use by <name>" for claimed instances; verify unit tests for the link target, both disabled actions, and unclaimed instances unchanged, and update its story
- [x] 8.3 Show "N in builds, M free" on an item in `InventoryItems` only when an active instance is claimed; verify unit tests for the six-active, four-in-builds case and for an item with nothing in builds
- [x] 8.4 Block purchase delete in `InventoryPurchases` when a linked instance is claimed, naming every holding build; verify a unit test with two builds named and one that an unclaimed purchase still deletes with the instance-count confirmation
- [x] 8.5 Update CLAUDE.md's inventory paragraph to say the Inventory segment also loads builds to show claims and block retire and delete; verify it names `useBrBuilds`

## 9. Integration

- [x] 9.1 Update the Playwright segment spec to assert the builds list in place of the placeholder; verify with `npx playwright test --project=chromium`
- [x] 9.2 Add a Playwright test that creates a plan and lands on its build view, with its own route stubs: `user_profiles` answered for the `ensureProfile` upsert, the `br_builds` insert answered with the created row as an object, and later `br_builds` reads answered with that build so the view does not show "no such build"; verify with `npx playwright test --project=chromium`
- [x] 9.3 Run `npm run lint`, `npm run format:check`, `npm run test`, `npm run build` and `npx openspec validate --all` and confirm all pass
- [x] 9.4 Run the full Playwright suite with `npm run test:e2e` and confirm it passes
