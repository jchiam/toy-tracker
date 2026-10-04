# Proposal

## Why

The tracker is meant to cover three distinct activities: browsing what exists (Catalog), recording what the user owns (Inventory), and assembling machines from it (Builds). Today the Baraba Ride page is a single route with two query-string views, both of which are catalog views, so there is nowhere for Inventory and Builds to live and no URL shape that can address a saved build.

This change lays the navigation and URL scaffold for the three segments before either per-user feature is built. It is the first of three planned changes: shell (this one), then Inventory, then Builds.

## What Changes

- Add a segment navigation to the signed-in Baraba Ride page: Catalog, Inventory, Builds. It is the primary navigation; the existing Products / Parts tabs become sub-navigation inside Catalog.
- **BREAKING**: replace the single-route, query-string views with nested paths:
  - `/baraba-ride` opens Catalog (`/baraba-ride/catalog`)
  - `/baraba-ride/catalog` is the product list
  - `/baraba-ride/catalog/products/<code>` is a product's detail
  - `/baraba-ride/catalog/parts` is the parts view
  - `/baraba-ride/inventory` and `/baraba-ride/builds` are the two new segments
- Redirect the earlier links so bookmarks keep working: `/baraba-ride?product=<code>` and `/baraba-ride?view=parts` go to their new paths.
- Inventory and Builds each show a placeholder saying the segment is not available yet. No user data is read or written in this change.
- Record the agreed three-segment model (ownership unit, machine shape, plan and built builds, availability, data sketch) in `design.md` as the reference for the two later changes.
- Update the project guidance in `CLAUDE.md`, which currently states that the game keeps one route.

Not in this change: Supabase tables, owning products, parts on hand, the build editor, and "Owned" badges in Catalog.

## Capabilities

### New Capabilities

- `br-segments`: the three-segment structure of the Baraba Ride page — segment navigation, segment URLs, the default segment, redirects from earlier links, Catalog's sub-navigation, and the placeholders for segments whose features do not exist yet.

### Modified Capabilities

- `br-product-catalog`: the product list and product detail move under the Catalog segment and gain their own paths; an unknown product code in the path is handled.
- `br-part-catalog`: the parts view moves under the Catalog segment and gains its own path.
- `game-selection`: a game's route now also serves paths beneath it, and a signed-in user opening the game lands on its default view.

## Impact

- **Routing**: `src/App.tsx` (game routes match sub-paths), `src/pages/baraba-ride/BrPage.tsx` (shell, nested routes, redirects). The registry in `src/lib/games.ts` is unchanged.
- **Catalog components**: `ProductCatalog.tsx`, `ProductDetail.tsx`, `PartCatalog.tsx` — internal links change from query strings to paths.
- **Styling**: `BrPage.css` gains segment navigation and placeholder styles, from existing design tokens.
- **Tests and stories**: `BrPage.test.tsx`, the three catalog component tests, `GameSwitcher.test.tsx`, `tests/baraba-ride.spec.ts`; stories that render catalog links.
- **Docs**: the "game keeps one route" statement in `CLAUDE.md`.
- **No change** to dependencies, Supabase, the data pipeline, images, `vercel.json`, or the Content Security Policy.
