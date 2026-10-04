# Tasks

## 1. Image resolution

- [x] 1.1 Add `VITE_IMAGEKIT_URL_ENDPOINT` and `IMAGEKIT_PRIVATE_KEY` to `.env.example` with a comment that the private key must never be `VITE_`-prefixed; copy the values from game-tracker into `.env.local`; verify `git status` shows `.env.local` untracked
- [x] 1.2 Create `src/lib/imagekit.ts` with `toImageKitPath`, a product thumbnail resolver, a product shot resolver, and a variant resolver taking a path and crop box, each returning `null` when the endpoint is unset; verify with a colocated `imagekit.test.ts` covering path mapping (`BR-01` to `BR_01`), each transform string, and the unset case
- [x] 1.3 Add a `CatalogImage` component under `src/pages/baraba-ride/` that renders an `<img>` with required `alt`, or a placeholder when the URL is `null` or the image errors, styled with design tokens only; verify with a test for the three states and a Storybook story
- [x] 1.4 Add `https://ik.imagekit.io` to `img-src` in `vercel.json`; verify `npm run verify:csp` still passes

## 2. Pipeline

- [x] 2.1 Restore the shot `<img>` elements (the `src` URLs only) to the Japanese item fixtures in `scripts/br/__fixtures__/`; verify existing `catalog.test.ts` tests still pass
- [x] 2.2 Add `images: string[]` to `Product` in `src/lib/br/types.ts`; extend `parseItemJa` in `scripts/br/catalog.ts` to return the ordered shot source URLs, throwing `CatalogParseError` (field `images`) when none are found, and `buildProduct` to emit `/assets/baraba-ride/products/<code>/<n>.jpg` paths; verify with `catalog.test.ts` cases for five shots, four shots, zero shots, and that `serializeProducts` output contains no `assets-toy.bandai.co.jp` URL
- [x] 2.3 Add `@imagekit/nodejs` as a dev dependency and create `scripts/br/images.ts` porting `initImageKit` and `ensureAsset` from `../game-tracker/scripts/lib/pipeline.mjs`, reading `IMAGEKIT_*` only (no `VITE_IMAGEKIT_PRIVATE_KEY` fallback) and reusing `toImageKitPath`; verify with unit tests using a stub client for skip-when-present, upload-when-absent, forced re-upload, and disabled-when-no-key
- [x] 2.4 Wire uploads into `scripts/br/fetch-catalog.ts`: load `.env.local`, ensure every shot after parsing and before writing, keep the one-second gap between image downloads, support `--reupload`, exit non-zero naming product and shot on failure without writing `products.json`; verify by running with credentials unset (JSON written, skip notice logged)
- [x] 2.5 Run `npm run data:br` with credentials set and commit the regenerated `src/data/br/products.json`; verify the diff only adds `images` arrays, the ImageKit `baraba_ride/products` folder holds 46 files, and a second run uploads nothing
- [x] 2.6 Run `npm run build` and search `dist/` for the private key value; verify it is absent

## 3. Variants

- [x] 3.1 Add `PartVariant` (`color`, optional `image: { shot, crop }`) to `src/lib/br/types.ts` and an optional `variant` on `ProductPartQuantity`; extend `validateCatalog` in `src/lib/br/validate.ts` with the shot-range and crop-bounds errors and a `missingImages` report; verify with new `validate.test.ts` cases for each error and the report
- [x] 3.2 Curate `variant` for every entry in `src/data/br/product-parts.json`, viewing each product's shot 3 to read the colour and set the crop box around the render square only (RW32 and LW32 share a crop); verify `npx vitest run src/lib/br/validate.test.ts` passes with an empty `missingImages` report
- [x] 3.3 Extend `src/lib/br/catalog.ts` so `resolveProductParts` returns each part's variant and add `findPartVariants(partId)` returning variants with their product, ordered by product code; verify with unit tests against the committed data (Storm Falcon has variants in BR-01, BR-04, BR-07)

## 4. Catalog views

- [x] 4.1 Show the first shot as a thumbnail on each card in `ProductCatalog.tsx`; verify with a test that each card has an image whose `alt` names the product, and that cards render a placeholder with the endpoint unset
- [x] 4.2 Add the shot gallery and per-part variant thumbnail with colour label to `ProductDetail.tsx`; verify with tests for five shots in order, a part with a variant, and a part without one
- [x] 4.3 Show each part's variants in `PartCatalog.tsx` as thumbnails labelled with colour and product code, linking to the product; verify with tests for a multi-variant part, the link target, and a part with no variant
- [x] 4.4 Style the thumbnails, gallery, and variant strip in `BrPage.css` using design tokens only; update the stories for the three views with the endpoint set and review them in `npm run storybook`, correcting any crop box in `product-parts.json` that clips a part or shows prose

## 5. Integration

- [x] 5.1 Replace the e2e test `catalog loads no images from outside the app origin` in `tests/baraba-ride.spec.ts` with an allowlist check (app origin and the ImageKit origin) across the product list, a product detail, and the parts view; verify `npx playwright test --project=chromium` passes
- [x] 5.2 Update the catalog architecture notes in `CLAUDE.md` and `README.md` (images on ImageKit, paths in JSON, `--reupload`, the env variables)
- [x] 5.3 Run `npm run lint`, `npm run test`, `npm run build`, and `npx openspec validate --all`; verify all pass
- [x] 5.4 Open `/baraba-ride`, `/baraba-ride?product=BR-01`, and `/baraba-ride?view=parts` in `npm run dev` with the endpoint set; verify images load, Storm Falcon shows three variants, and the console has no CSP error
