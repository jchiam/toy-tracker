## Why

The app shell exists but the Baraba Ride page is a placeholder. Before any collection or custom-build tracking can be built, the app needs a catalog of what exists in the line: the released products and the parts they contain. Baraba Ride launched on 2026-09-19 with ten products (BR-01 to BR-10), so the catalog is small enough to establish correctly now and grow with each release wave.

## What Changes

- Add a build-time data pipeline that fetches the Baraba Ride product lineup from the official Bandai site and writes a normalized, committed JSON catalog.
- Add a hand-curated parts dataset (cowls, bumpers, tires, chassis) and the product → parts mapping, since no source publishes this structurally.
- Replace the Baraba Ride placeholder page with a product catalog view and a parts catalog view.
- No images are copied from Bandai; cards use the per-game gradient treatment until self-produced art exists.

## Non-goals

- Tracking owned products/parts, quantities, or custom builds (follow-up change; needs Supabase tables).
- Part performance stats — Bandai publishes none.
- Runtime fetching from Bandai or any third-party origin.
- Japanese-language UI. Japanese names are stored but the UI is English.

## Capabilities

### New Capabilities

- `br-data-pipeline`: Fetching, normalizing, and validating Baraba Ride catalog data from the official source plus curated overrides.
- `br-product-catalog`: Browsing released Baraba Ride products (starter sets, booster sets, tools).
- `br-part-catalog`: Browsing Baraba Ride parts by slot and seeing which products contain them.

### Modified Capabilities

<!-- None. game-selection already allows the placeholder page to be replaced. -->

## Impact

- New: `scripts/br/` (pipeline), `src/data/br/` (committed catalog JSON), `src/pages/baraba-ride/` views, `src/lib/br/` types.
- New npm script `data:br`. New dev dependency for HTML parsing.
- No Supabase schema change, no CSP change (no new runtime origins).
