# Proposal

## Why

The Inventory segment is a placeholder: the app can show what Baraba Ride products exist but not what the user actually owns. Owners accumulate parts from boxed purchases, from loose parts bought or received, and lose parts to wear and breakage; without a record of each physical part there is nothing for the upcoming Builds segment to assemble from.

## What Changes

- Add a per-user Baraba Ride inventory backed by Supabase, where every physical item the user owns is one **instance** row (a part, a charger, a colosseum) rather than a count.
- Add "record a purchase": pick a product from the catalog and the mapping expands it into one instance per tracked item in the box, each tagged with the product it came from (its variant).
- Add "add items": log one or more standalone instances of a catalogued item, with the source product (variant) optional. Firsthand and secondhand are not distinguished.
- Add "retire an instance": mark a part as decommissioned (worn out, broken) without deleting it, so history and future builds that referenced it survive. Plain delete remains for mistakes.
- Replace the Inventory placeholder with two views: Items (grouped by catalogued item, active count, expandable to instances) at `/baraba-ride/inventory`, and Purchases (one entry per recorded purchase, expandable to its instances) at `/baraba-ride/inventory/purchases`.
- Extend the hand-curated catalog so non-part box contents can be tracked bespokely: a new `accessories.json` (initially chargers and the Fold Colosseum) and mapping entries that reference accessory ids. Anything without a mapping entry (stickers, the generic `body` contents label) is not trackable and is silently ignored by the purchase expansion.
- Reserve a nullable `condition` field on instances (mint, used, worn) in the schema so condition tracking can land later without a data-model change. No UI for it in this change.

## Capabilities

### New Capabilities

- `br-inventory`: what a signed-in user owns for Baraba Ride, as individual instances with provenance and status; recording purchases, adding standalone items, retiring and deleting instances, and the Items and Purchases views.
- `br-accessory-catalog`: hand-curated catalogue of trackable non-part box contents (chargers, colosseums), how mapping entries reference them, and the rule that only mapped contents are trackable.

### Modified Capabilities

- `br-segments`: the "Segments without features show a placeholder" requirement no longer covers Inventory; only Builds keeps the placeholder. Inventory gains a sub-navigation (Items / Purchases) parallel to Catalog's.
- `br-data-pipeline`: "Curated parts data is validated against the product catalog" extends to accessory ids and the accessories file.

## Impact

- New Supabase migration (`supabase/migrations/`): `br_purchases` and `br_instances` tables referencing `user_profiles(id)`, RLS scoped to `auth.uid()::text` per the `auth` spec. First inventory write must lazily upsert the user's profile row, which no code does yet.
- New data access layer (`src/services/br/`) and hooks for loading and mutating inventory; MSW handlers for unit tests.
- New data file `src/data/br/accessories.json`, new `Accessory` type, `product-parts.json` entries for chargers and BR-10, `validateCatalog` and the `data:br` pipeline check extended.
- `src/lib/br/routes.ts` gains the purchases path; `BrPage.tsx` mounts the Inventory routes; new page components under `src/pages/baraba-ride/`.
- Catalog views unaffected except that product detail may later show tracked contents; out of scope here.
- `vercel.json` CSP already admits the Supabase origin; no change expected (verified by `npm run verify:csp`).
