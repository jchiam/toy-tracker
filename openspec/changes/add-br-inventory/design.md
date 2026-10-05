# Design

## Context

See proposal.md for motivation. Relevant current state:

- Catalog is static JSON (`products.json` generated, `parts.json` and `product-parts.json` curated) read through `src/lib/br/catalog.ts`; `validateCatalog` runs in a unit test and in the `data:br` pipeline. Part ids are `<slot>:<slug>` and are treated as frozen.
- Only one Supabase table exists, `user_profiles(id TEXT)`, RLS on `auth.uid()::text`. The `auth` spec says profile rows are created lazily by the app on first write, but nothing writes one yet.
- `src/lib/supabase.ts` is the singleton client; `useAuth` exposes the session. No `src/services/` or data hooks exist yet; MSW is installed and managed per test file.
- `BrPage.tsx` owns nested routes and renders Inventory as a placeholder. `brRoutes` holds all paths.
- Builds segment is still a placeholder but will consume this inventory.

## Goals / Non-Goals

**Goals:**

- Instance-per-item data model that Builds can reference by row id later.
- Purchase expansion driven entirely by the curated mapping so the DB never duplicates catalog knowledge.
- Accessories tracked without widening the machine-part `Slot` type or leaking into the parts view and future build slot pickers.
- Schema ready for condition tracking with no later migration of existing rows.

**Non-Goals:**

- Condition UI, filtering by condition, or condition history.
- Showing ownership inside the Catalog views (product detail "you own 2").
- Price paid, seller, or currency on purchases.
- Any Builds behaviour.
- Realtime subscriptions; a refetch-after-write model is enough for a single user.

## Decisions

### D1. Instances, not counts

One row per physical item (`br_instances`). Counts are `count(*) where status='active'` grouped client-side. Alternative: `(item_id, variant, qty)` rows. Rejected because condition and Builds both need identity, and splitting counts by condition or build membership would reinvent instances badly. Volume is tens to low hundreds of rows per user, so there is no cost.

### D2. Single `item_id` namespace, kind by prefix

`br_instances.item_id` is TEXT holding either a part id (`cowl:…`, `bumper:…`, `tire:…`, `chassis:…`) or an accessory id (`charger:…`, `colosseum:…`). No FK: the catalog lives in JSON, not the DB. A `resolveItem(id)` helper in `src/lib/br/catalog.ts` looks up parts then accessories and returns a discriminated union `{ kind: 'part', part } | { kind: 'accessory', accessory }`. Alternative: add `charger` to `Slot`. Rejected because `Slot` means "machine assembly slot" in the parts view, validation slot counts, and the coming build picker.

### D3. Accessories as a separate curated file

`src/data/br/accessories.json` with `{ id, kind, nameEn, nameJa }` and a `AccessoryKind = 'charger' | 'colosseum'` type. `product-parts.json` entries keep their `parts: ProductPartQuantity[]` array and gain an optional `accessories: { accessoryId, quantity }[]` array. Keeping accessories in a separate array (rather than mixing ids in `parts`) means existing consumers (`resolveProductParts`, `findPartSources`, `findPartVariants`, the parts view) need no change and cannot accidentally pick up accessories. `validateCatalog` gains an `accessories` parameter and checks: id prefix equals kind, no duplicate ids, mapping accessory ids exist, quantities are positive integers. Slot-count checks stay parts-only. `unmapped` keeps its current meaning (part-bearing products); BR-10 is mapped so it does not show up anyway.

Initial entries: one charger (`charger:ride-charger`, officially "Ride Charger") referenced by the six products whose contents list `charger: 1`, and `colosseum:fold-colosseum` for BR-10.

Renaming `product-parts.json` to `product-contents.json` is deferred; the file name is referenced from CLAUDE.md, specs, and scripts and renaming buys nothing functional.

### D4. Schema

```
br_purchases
  id            uuid pk default gen_random_uuid()
  profile_id    text not null references user_profiles(id) on delete cascade
  product_code  text not null
  acquired_at   date not null default current_date
  note          text not null default ''
  created_at    timestamptz not null default now()

br_instances
  id                    uuid pk default gen_random_uuid()
  profile_id            text not null references user_profiles(id) on delete cascade
  item_id               text not null
  variant_product_code  text null
  purchase_id           uuid null references br_purchases(id) on delete cascade
  status                text not null default 'active' check (status in ('active','retired'))
  condition             text null check (condition in ('mint','used','worn'))
  note                  text not null default ''
  created_at            timestamptz not null default now()
  updated_at            timestamptz not null default now()
```

Indexes on `(profile_id)` for both, `(purchase_id)` on instances. RLS: enable on both; four policies each, `USING`/`WITH CHECK` `profile_id = auth.uid()::text`, mirroring `user_profiles`. `on delete cascade` from purchase to instances implements "delete a purchase deletes its instances" in one statement. `condition` is a CHECK-constrained text rather than a Postgres enum so adding a value later is one `ALTER TABLE … DROP/ADD CONSTRAINT`, not a type migration. Statuses likewise.

Alternative considered: a movement ledger (events in/out) with instances derived. Rejected as over-engineering for a single-user hobby tracker; `created_at`, `status`, `note` and the purchase link already give the history that matters.

### D5. Profile upsert on first write

A `ensureProfile(userId)` in `src/services/profile.ts` does `upsert({ id }, { onConflict: 'id', ignoreDuplicates: true })`. Every inventory mutation calls it first. This satisfies the `auth` spec's lazy-creation rule and the FK. It costs one extra round trip per write, acceptable at this volume; a later optimisation can remember success per session.

### D6. Purchase expansion runs on the client, in one request

`recordPurchase(product, acquiredAt, note)` builds the instance rows from `resolveProductContents(code)` (parts plus accessories, quantities expanded) and sends them with the purchase. To keep it atomic without a stored procedure: insert the purchase, then insert the instances; if the instance insert fails, delete the purchase and surface the error. A Postgres function would be stricter but adds a second migration surface; revisit if partial writes ever bite. Products without a mapping entry are filtered out of the picker rather than failing at write time.

### D7. Data access and state

- `src/services/br/inventory.ts`: thin wrappers over the supabase client returning typed rows (`Purchase`, `Instance` in `src/lib/br/inventory-types.ts`), throwing on error.
- `src/hooks/useBrInventory.ts`: loads purchases and instances for the session user once, exposes `{ purchases, instances, loading, error, actions }` where actions wrap the service calls and refetch on success. One hook instance lives in the Inventory segment component and is passed down, so Items and Purchases views share state and a write in one is visible in the other without reload. No query library is introduced; the sibling projects do not use one and the data set is tiny.
- Grouping and counting (`groupInstancesByItem`, `countByStatus`) live as pure functions in `src/lib/br/inventory.ts` so they are unit-testable without React.

### D8. Routes and components

- `brRoutes.inventory` stays `/baraba-ride/inventory`; add `brRoutes.purchases = /baraba-ride/inventory/purchases`.
- `BrPage.tsx`: `inventory/*` mounts `InventorySegment`, which renders the Items/Purchases sub-nav (same markup and class as the Catalog sub-nav), the shared hook, and nested routes `index` (Items), `purchases`, and `*` redirecting to Items with `replace`.
- New components under `src/pages/baraba-ride/`: `InventorySegment`, `InventoryItems`, `InventoryPurchases`, `RecordPurchaseDialog`, `AddItemsDialog`, `InstanceList` (shared expandable list with retire/reactivate/delete). Dialogs use native `<dialog>` with a form; confirmation for deletes is an in-dialog step, not `window.confirm`.
- Pickers: purchase dialog lists mapped products ordered by code; add-items dialog lists parts grouped by slot then accessories by kind, and once an item is chosen offers "source product" from `findPartSources` (parts) or the products whose mapping lists that accessory, plus "unknown".

### D9. Testing

- Unit: `validateCatalog` accessory cases; `resolveProductContents`, `resolveItem`, grouping helpers; hook and components with MSW handlers for the Supabase REST endpoints (`/rest/v1/br_purchases`, `/rest/v1/br_instances`) stubbing a signed-in session as the existing `BrPage.test.tsx` does.
- E2E: Playwright runs with dummy Supabase env in CI, so inventory e2e is limited to navigation and sub-nav behaviour (segment URLs, redirect, sub-nav presence), matching how Catalog is covered today. Mutation flows are unit-tested.

## Risks / Trade-offs

- [Catalog id renamed or removed] → ids are declared frozen; `resolveItem` returns `null` for unknown ids and the Items view renders such instances under an "Unknown item" group with the raw id, so data is never hidden.
- [Mapping corrected after purchases were recorded] → past purchases keep the instances they created; no retroactive re-expansion. Documented in the Purchases view help text.
- [Non-atomic purchase write] → compensating delete per D6; the purchase row is harmless on its own if cleanup also fails and can be deleted from the Purchases view.
- [RLS mistake exposes rows] → policies copy the proven `user_profiles` pattern verbatim; migration review item in tasks.
- [Dialog UX on mobile] → native `<dialog>` is sized with existing tokens and tested at phone width in Storybook stories.

## Migration Plan

1. Add migration `supabase/migrations/<timestamp>_add_br_inventory.sql`; apply with `npm run db:push`. Additive only; no existing rows affected.
2. Deploy app. Inventory placeholder is replaced; no data migration.
3. Rollback: redeploy previous build. Tables can stay; dropping them is a separate migration if ever wanted.
