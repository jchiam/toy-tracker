# Tasks

## 1. Accessory catalog

- [x] 1.1 Add `Accessory`, `AccessoryKind`, and `ProductAccessoryQuantity` types to `src/lib/br/types.ts`, extend `ProductParts` with optional `accessories`, and verify `npm run build` type-checks
- [x] 1.2 Create `src/data/br/accessories.json` with `charger:ride-charger` ("Ride Charger") and `colosseum:fold-colosseum`; add `accessories` lines to the six charger products and a new BR-10 entry in `product-parts.json`; verify the catalog unit test still loads the data
- [x] 1.3 Extend `validateCatalog` with an `accessories` parameter (prefix/kind match, duplicate ids, unknown accessory refs, positive quantities, accessory lines with variants rejected, slot counts parts-only) and add unit tests in `validate.test.ts` for each new error plus the BR-10 and charger happy paths
- [x] 1.4 Pass accessories through the `data:br` pipeline validation call in `scripts/br/` and verify the pipeline's existing tests pass
- [x] 1.5 Add `ACCESSORIES`, `resolveItem(id)`, `resolveProductContents(code)` and `findAccessorySources(id)` to `src/lib/br/catalog.ts` with unit tests covering parts, accessories, unmapped product, and unknown id
- [x] 1.6 Add a `PartCatalog` test asserting no accessory appears in the parts view

## 2. Database

- [ ] 2.1 Write `supabase/migrations/<timestamp>_add_br_inventory.sql` creating `br_purchases` and `br_instances` per design D4 with indexes, RLS enabled, and four owner-scoped policies per table; verify it applies cleanly with `npm run db:push` against the dev project
- [ ] 2.2 Review the policies side by side with `user_profiles` and confirm, via the Supabase SQL editor as a second user, that foreign rows are neither readable nor writable

## 3. Data access

- [x] 3.1 Add `src/lib/br/inventory-types.ts` (`Purchase`, `Instance`, `InstanceStatus`, `Condition`) and `src/services/profile.ts` with `ensureProfile`; unit test with an MSW handler that the upsert is sent with `ignoreDuplicates`
- [x] 3.2 Add `src/services/br/inventory.ts` with `listPurchases`, `listInstances`, `recordPurchase` (compensating delete on instance insert failure), `addInstances`, `setInstanceStatus`, `updateInstanceNote`, `deleteInstance`, `deletePurchase`; unit test each against MSW handlers, including the compensating delete path
- [x] 3.3 Add pure helpers `groupInstancesByItem` and `countByStatus` to `src/lib/br/inventory.ts` with unit tests covering unknown ids, retired counts, and slot/kind grouping order
- [x] 3.4 Add `src/hooks/useBrInventory.ts` (load on mount for the session user, actions that call the service then refetch, loading and error state) with hook tests for load success, load failure, and a write followed by refetch

## 4. Routes and segment shell

- [x] 4.1 Add `brRoutes.purchases` and a `routes.test.ts` case for it
- [x] 4.2 Create `InventorySegment` with the Items/Purchases sub-nav, nested routes (`index`, `purchases`, `*` redirect with replace), mount it at `inventory/*` in `BrPage.tsx`, and remove the Inventory placeholder; update `BrPage.test.tsx` for sub-nav presence, redirect, and absence of the sub-nav in Catalog and Builds
- [x] 4.3 Update the Playwright segment spec in `tests/` for the Inventory sub-nav, `/baraba-ride/inventory/purchases` direct access, and the unknown-path redirect; verify with `npx playwright test --project=chromium`

## 5. Items view

- [x] 5.1 Create `InstanceList` (expandable instances with source product or "unknown", purchase date, status, note, retire/reactivate/delete with in-component confirmation) plus Storybook story and unit tests for each action
- [x] 5.2 Create `InventoryItems` (grouped by slot then accessory kind, active and retired counts, empty state with calls to action, loading and error states) plus story and unit tests for grouping, counts, empty, loading, and error
- [x] 5.3 Create `RecordPurchaseDialog` (mapped products only, acquisition date defaulting to today, note) and wire it to `recordPurchase`; unit test that an unmapped product is not offered and that BR-10 expands to one colosseum instance
- [x] 5.4 Create `AddItemsDialog` (parts by slot then accessories by kind, quantity, optional source product from the item's sources, "unknown") and wire it to `addInstances`; unit test quantity expansion and empty source
- [ ] 5.5 Verify in the dev app that recording a purchase from Items shows its instances without reload

## 6. Purchases view

- [x] 6.1 Create `InventoryPurchases` (most recent acquisition first, product code and name, date, note, instance count, expand to `InstanceList`, delete with instance-count confirmation) plus story and unit tests for ordering, expansion, and delete confirmation text
- [ ] 6.2 Verify in the dev app that a purchase deleted in Purchases disappears from Items without reload

## 7. Integration

- [ ] 7.1 Run `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, and `npm run verify:csp` and confirm all pass
- [ ] 7.2 Run the full Playwright suite with `npm run test:e2e` and confirm it passes
- [ ] 7.3 Update CLAUDE.md's Architecture section for the inventory tables, `src/services/`, `accessories.json`, and the Inventory routes, and verify the documented commands run as written
