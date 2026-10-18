# Tasks

## 1. Product type model

- [x] 1.1 Add `set` and `booster-pack` to `ProductType` in `src/lib/br/types.ts` and their labels "Set" and "Booster Pack" to `TYPE_LABELS` in `src/lib/br/labels.ts`; verify `npm run build` passes with no other consumer needing a change
- [x] 1.2 Extend `ProductCatalog.test.tsx` with a type-filter case for a `booster-pack` product and a badge case for a `set` product (first against inline fixtures, switched to the real BR-12 and BR-14 once the catalog held them, since the inline copies then duplicated real codes); verify `npx vitest run src/pages/baraba-ride/ProductCatalog.test.tsx` passes

## 2. Pipeline parsers

- [x] 2.1 Map セット to `set` and ブースターパック to `booster-pack` in `TYPES_JA` (`scripts/br/catalog.ts`); verify a unit test parsing the BR-12 and BR-14 fixtures yields those types
- [x] 2.2 Widen `SHOT_URL` to an allowlist of `assets-toy.bandai.co.jp` and `bandai-a.akamaihd.net`; verify unit tests accept a shot on each host and still reject a shot on any other host naming the product and the `images` field
- [x] 2.3 Add an `ACRONYMS` exception to `titleCase` seeded with `DX`; verify unit tests give `DX Starter Set` for the BR-12 English fixture and leave `Storm Falcon`, `Falcon Kit`, `Fold Colosseum` and `Random Tire Collection Vol.1` unchanged
- [x] 2.4 Add trimmed fixtures `item-br-12.ja.html`, `item-br-12.en.html`, `item-br-14.ja.html`, `item-br-14.en.html` (markup and factual fields only, gallery `src` kept, no manual button on either, BR-14 contents followed by its `※` note line) and extend `lineup.html` with BR-11 to BR-14 in both the desktop and mobile blocks; verify `parseLineup` yields 14 codes with BR-14 style `null`, BR-14 contents parse as `{ tire: 4, sticker: 1 }`, and both new products parse without `manualUrl`
- [x] 2.5 Verify `npx vitest run scripts/br` passes and `git status` shows no image file under `scripts/br/__fixtures__/`

## 3. Catalog regeneration

- [x] 3.1 Run `npm run data:br` with `.env.local` present; verify it logs 14 lineup products, uploads or skips 25 shots for BR-11 to BR-14, and rewrites `src/data/br/products.json` with 14 records (it reports BR-14 as the only unmapped product: BR-11 to BR-13 list `本体` only and so are not part-bearing)
- [x] 3.2 Verify `products.json` holds BR-12 as `type: "set"`, `nameEn: "DX Starter Set"`, 7 images and no `manualUrl`; BR-14 as `type: "booster-pack"`, `style: null`, `contents: { tire: 4, sticker: 1 }`, 8 images; BR-11 and BR-13 with 5 images each; and no record contains `akamaihd` or `assets-toy`
- [x] 3.3 Update the code list in `ProductCatalog.test.tsx` to BR-01 through BR-14 and confirm `RecordPurchaseDialog.test.tsx` still expects 10 mapped options unchanged; verify `npm run test` passes against the regenerated catalog

## 4. Documentation and integration

- [x] 4.1 Update the catalog paragraph in `CLAUDE.md` to name the five product types and the two accepted shot hosts; verify the paragraph reads correctly against the code
- [x] 4.2 Verify `npm run lint`, `npm run format:check`, `npm run build` and `npx playwright test --project=chromium` pass, and that the Catalog list in the running app shows 14 products with BR-14 badged "Booster Pack" and no style badge

## Workflow follow-up

- Open the pull request and archive the change after review.
- Schedule the wave-2 mapping change after 2026-11-07 (BR-11, BR-12) and 2026-12-05 (BR-13), including the 1200px shot-size question for crop validation.
- Schedule a separate change for BR-14's random contents after 2026-12-05.
