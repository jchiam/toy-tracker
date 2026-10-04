# Proposal

## Why

Each Baraba Ride release has an official instruction manual that includes the sticker placement guide, and the tracker gives no way to reach it from a product. Bandai already publishes the manual publicly and links it from every item page, so the catalog only needs to carry that link.

## What Changes

- The `npm run data:br` pipeline records each product's official manual link, when the item page has one, as an optional `manualUrl` in `src/data/br/products.json`.
- The product detail view shows an "Instruction manual" link beside the existing official product page link, opening in a new tab.
- Products whose item page has no manual link are generated and displayed without one.
- No manual is downloaded, stored, mirrored, or embedded. No storage bucket, migration, or CSP change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `br-data-pipeline`: the generated product record gains an optional official manual link.
- `br-product-catalog`: the product detail view links to the official manual when the product has one.

## Impact

- `scripts/br/catalog.ts`, `scripts/br/catalog.test.ts`, and the trimmed fixtures in `scripts/br/__fixtures__/` (the manual link block is added to the Japanese item fixtures).
- `src/lib/br/types.ts` (`Product`), `src/data/br/products.json` (regenerated).
- `src/pages/baraba-ride/ProductDetail.tsx` with its test and story.
- No new dependencies, no backend change, no `vercel.json` change: the link is a new-tab navigation, which the CSP does not restrict.
