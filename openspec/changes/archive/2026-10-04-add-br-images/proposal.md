# Proposal

## Why

The Baraba Ride catalog is text only, so a product or part cannot be recognised at a glance. The same part also ships in different colours and sticker designs across releases (the Storm Falcon cowl is white in BR-01, red in BR-04, and black in BR-07), and the catalog has no way to show or even record that.

Bandai's item pages already carry what is needed: four or five official shots per product, and the third shot of every part-bearing product is a breakdown showing each part alone in that release's colours.

## What Changes

- `npm run data:br` records each product's official shots in `src/data/br/products.json` as local asset paths and uploads the shots to the ImageKit CDN (the game-tracker account, folder `baraba_ride`). No image file enters the repository.
- **BREAKING** (spec): the rule that the pipeline downloads no images is replaced by "images go to the CDN, never the repository". The rule against storing description prose stays.
- A new `src/lib/imagekit.ts` resolves local asset paths to ImageKit URLs with transforms, following game-tracker. When ImageKit is not configured, images are replaced by a placeholder instead of a broken request.
- Each entry in `src/data/br/product-parts.json` gains a variant: the colour of that part in that product and a crop box into the product's breakdown shot. One variant per part per product.
- The product list shows a thumbnail per product; the product detail shows a gallery of the official shots and a variant thumbnail beside each named part.
- The parts view shows every variant of a part as a thumbnail labelled with its product, linking to that product.
- **BREAKING** (spec): the rule that product imagery is self-hosted is replaced by "images load only from the app origin or the ImageKit origin". `vercel.json` CSP `img-src` gains `https://ik.imagekit.io`.

## Capabilities

### New Capabilities

- `br-image-pipeline`: how catalog image paths resolve to CDN URLs, which transforms apply, and what renders when the CDN is not configured.

### Modified Capabilities

- `br-data-pipeline`: the pipeline records product shots and publishes them to the CDN; the image prohibition is narrowed to the repository; variant data is validated.
- `br-product-catalog`: products show official images; the self-hosted imagery rule and the no-third-party-request rule are replaced by an allowlist of image origins.
- `br-part-catalog`: parts show their per-product variants with images.

## Impact

- `scripts/br/catalog.ts`, `scripts/br/fetch-catalog.ts`, a new upload module under `scripts/br/`, tests, and the trimmed fixtures (shot URLs are restored; the image files themselves are still not stored).
- `src/lib/br/types.ts`, `src/lib/br/validate.ts`, `src/lib/br/catalog.ts`, `src/data/br/products.json` (regenerated), `src/data/br/product-parts.json` (hand-curated variants).
- New `src/lib/imagekit.ts`; `src/pages/baraba-ride/` components with their tests and stories; `tests/baraba-ride.spec.ts`.
- New dev dependency `@imagekit/nodejs`.
- Environment: `VITE_IMAGEKIT_URL_ENDPOINT` (client; `.env.local`, `.env.example`, Vercel) and `IMAGEKIT_PRIVATE_KEY` (pipeline only, `.env.local`, never prefixed `VITE_`).
- `vercel.json` CSP; `CLAUDE.md` and `README.md` notes on the catalog architecture.
- Licensing: Bandai's site terms prohibit reuse of its images. This change republishes about 46 official shots through a third-party CDN. The project owner has accepted this for a personal tracker, as for the existing cover and icon.
