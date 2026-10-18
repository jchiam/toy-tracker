# Proposal

## Why

Bandai has announced the second wave of Baraba Ride products (BR-11 to BR-14, releasing 2026-11-07 and 2026-12-05), and the official lineup page now lists them. The catalog pipeline cannot ingest them: the lineup introduces two product types it does not know (セット, ブースターパック), the new item pages serve their shots from a different host (`bandai-a.akamaihd.net`) that the shot URL check rejects, and the English title of BR-12 is miscased by the name normaliser (`Dx Starter Set`). Because the pipeline writes nothing unless every product parses, the whole catalog is frozen at BR-10 until these are fixed.

## What Changes

- Add two product types, `set` (セット, "Set") and `booster-pack` (ブースターパック, "Booster Pack"), to the catalog type model, the pipeline's Japanese type map, and the UI labels used by the type filter and product badges.
- Accept official shots hosted on `bandai-a.akamaihd.net` as well as `assets-toy.bandai.co.jp`. Shots are still copied to the image CDN; the source URL is still never persisted. No change to the Content Security Policy, which only allows the CDN.
- Keep the acronym `DX` upper-case when title-casing English product names, so BR-12 reads `DX Starter Set`.
- Extend the pipeline fixtures with the new lineup entries and two new item pages (BR-12 as a `セット` on the new image host with no manual link; BR-14 as a `ブースターパック` whose contents list is followed by a note line), trimmed of prose and images as the existing fixtures are.
- Run `npm run data:br` to regenerate `src/data/br/products.json` with all 14 products and publish their shots to the image CDN.
- Leave BR-11 to BR-14 without entries in `product-parts.json`. They appear in the catalog with slot-level contents only; validation already reports unmapped products without failing.

Non-goals, each a later change:

- Part mappings for BR-11, BR-12 and BR-13 (item pages list `本体…1` only; mappings need the released product or the breakdown shots).
- Modelling BR-14's random contents (one SKU, six possible tire sets). It is catalogued as a product with `タイヤ…4`, `シール…1` and no mapping; recording a purchase of it expands to nothing.
- Tracking the "charger custom parts" BR-12 bundles. They stay untrackable like stickers.
- Variant crop validation against the new shot size. The new host serves 1200×1200 shots, while crop validation assumes 1500×1500. No new mapping carries a crop in this change, so nothing is affected yet; the mapping change for wave 2 must address it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `br-data-pipeline`: the product type set grows from three to five values; official shots may come from a second Bandai-controlled host; English names keep `DX` upper-case; the generated catalog covers BR-01 through BR-14.
- `br-product-catalog`: the product list and type filter cover the two new product types, and the launch-lineup scenario becomes the full catalogued lineup.

## Impact

- `src/lib/br/types.ts` (`ProductType`), `src/lib/br/labels.ts` (`TYPE_LABELS`), `scripts/br/catalog.ts` (`TYPES_JA`, `SHOT_URL`, `titleCase`), `scripts/br/catalog.test.ts`, `scripts/br/__fixtures__/`.
- `src/data/br/products.json` regenerated (10 → 14 records). Tests that pin the product count or the last product (`RecordPurchaseDialog.test.tsx` expects 10 options ending in BR-10; `ProductCatalog.test.tsx` lists BR-01 to BR-10) must follow.
- Image CDN: 25 new shots uploaded under `baraba_ride/products/BR-11…BR-14` (5, 7, 5, 8). Uploads are plain files, no metered transforms.
- `CLAUDE.md` architecture note on the catalog gains the new types and the second shot host.
- No database, routing, or CSP changes.
