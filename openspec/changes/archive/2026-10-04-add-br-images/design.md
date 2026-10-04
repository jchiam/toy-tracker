# Design

## Context

The catalog (`add-br-catalog`) was built facts-only: the pipeline stores no images, the app loads no image outside its own origin, and an e2e test enforces that. This change deliberately reverses that position for images.

### What the official site provides

Checked against the live site on 2026-10-04.

- Every item page lists its shots as `https://assets-toy.bandai.co.jp/toy/ja/product/<yyyy>/<mm>/<token>/<id>_<n>.jpg`, 1500x1500 JPEG. BR-01 to BR-06 have 5 shots; BR-07 to BR-10 have 4.
- Starter sets: shot 1 assembled machine and charger, 2 name banner, 3 part breakdown, 4 arena action, 5 box.
- Shot 3 of every part-bearing product is the part breakdown, in one of two layouts:

  | Layout    | Products       | Panels                                                                          |
  | --------- | -------------- | ------------------------------------------------------------------------------- |
  | 2x2 grid  | BR-01 to BR-06 | cowl (top left), chassis (top right), bumper (bottom left), tire (bottom right) |
  | 3 stacked | BR-07 to BR-09 | cowl, bumper, tire, top to bottom                                               |

  Each panel has a square holding the part render, beside Japanese prose and a name label. Viewed: BR-01, BR-02, BR-04, BR-07.

- Colour differs per release on every slot, not only cowls: the Alpha chassis is red in BR-01, blue in BR-02, purple in BR-04; H36 tires are blue in BR-02 and silver in BR-07.
- The Custom Encyclopedia has no per-part images, only three group shots.

### How game-tracker handles images

- Update scripts download each source image and upload it to ImageKit through an idempotent helper (`scripts/lib/pipeline.mjs`: `initImageKit`, `ensureAsset`), skipping assets that already exist.
- Generated data stores local `/assets/<game>/...` paths, never CDN URLs. `src/lib/imagekit.ts` turns a path into a CDN URL at render time and owns the transform strings.
- The repository stores no game images. CSP `img-src` allows `https://ik.imagekit.io`.

## Goals / Non-Goals

**Goals**

- Official shots for every product, visible in the list and the detail view.
- An image for every part variant, with the variant's colour recorded as data.
- No image files in the repository and no hand-edited image files anywhere.
- The app still builds, tests, and renders sensibly with ImageKit unset (CI, Storybook, fresh clones).

**Non-Goals**

- User photo uploads or any Supabase Storage use.
- Tracking which variants the user owns.
- Moving the existing cover and switcher icon out of `public/`.
- A shared multi-game image pipeline. Only Baraba Ride exists; generalise when a second line arrives.
- Separate images for RW32 and LW32. They share one breakdown panel and which wheel is which is not established.

## Decisions

### Variant images are CDN crops of the breakdown shot

A variant image is shot 3 of its product, cropped by an ImageKit transform (`cm-extract` with `x`, `y`, `w`, `h`), cut out of its panel by ImageKit background removal (`e-bgremove`), then resized onto white (`bg-FFFFFF`) to match the product shots. Nothing is cropped by hand and no derived file is stored.

Background removal was added after the first review: a crop wide enough for the Storm Falcon cowl, which overflows its square, also caught the panel border and name label. Removing the background lets every crop stay generous. Tried on the hardest cases (red parts on the dark red panel, black parts, spoked tires); outlines are clean, and see-through gaps such as wheel spokes keep a little of the panel colour.

Alternatives: hand-cropped files uploaded separately (33 files to maintain, and a second upload path); own photographs (no licence issue, but needs every box in hand and an upload flow).

### A variant is one part in one product, stored on the mapping entry

Each `parts[]` entry in `product-parts.json` gains:

```json
{
  "partId": "cowl:storm-falcon",
  "quantity": 1,
  "variant": {
    "color": "White",
    "image": { "shot": 3, "crop": { "x": 30, "y": 400, "w": 345, "h": 345 } }
  }
}
```

The variant has no id of its own: `(productCode, partId)` identifies it. A separate variants file was rejected because it would duplicate that key and need its own referential checks. `variant` and `variant.image` are both optional so a mapping can exist before its colours are confirmed.

`color` is a short English label written by the curator from the shot. Sticker design is not recorded as text; the image carries it.

### Crop boxes are explicit per entry

About 33 boxes, hand-written, in source-pixel coordinates of the 1500x1500 shot. The two layouts give starting values that are then nudged per product, since panel positions drift by a few pixels and cowls overflow their square. A named-template indirection was rejected: it saves little typing and every entry would still need an override path.

The crop takes the render square only, never the prose or label beside it, so no description text is republished through the crop.

RW32 and LW32 entries of one product carry the same crop.

### Products record shots as local asset paths

`Product` gains `images: string[]`, in page order: `/assets/baraba-ride/products/BR-01/1.jpg` and so on. The Bandai URL is not persisted; it carries an opaque token and the pipeline re-reads it from the page on each run. Paths are deterministic, so the byte-identical-output guarantee holds.

`shot` in a variant is the 1-based index into this array.

### Upload is part of `npm run data:br`

After every page parses and before `products.json` is written, the runner ensures each shot exists on ImageKit: skip when present, otherwise download from Bandai (same user agent and one-second gap) and upload with `useUniqueFileName: false`. A `--reupload` flag forces replacement.

- Credentials set and an upload fails: the run exits non-zero and `products.json` is untouched, matching the existing fail-loudly rule.
- Credentials unset: uploads are skipped with a logged notice and the JSON is still written. This keeps the pipeline usable for data-only refreshes; the app shows placeholders for anything not yet uploaded.

The upload logic is ported from game-tracker's `scripts/lib/pipeline.mjs` into TypeScript under `scripts/br/`, using `@imagekit/nodejs`.

### The private key is never `VITE_`-prefixed

The pipeline reads one credential, `IMAGEKIT_PRIVATE_KEY`; the ImageKit SDK needs no public key or URL endpoint to list and upload. game-tracker also accepts `VITE_IMAGEKIT_PRIVATE_KEY`; that fallback is not copied, because Vite exposes `VITE_` variables to client code. The runner loads `.env.local` itself (`process.loadEnvFile`), since Node does not.

### URL resolution lives in `src/lib/imagekit.ts`

Mirrors game-tracker. `toImageKitPath` lives in its own module, `src/lib/imagekit-path.ts`, because the pipeline runs on Node and cannot load a module that reads `import.meta.env`. It strips `/assets` and replaces non-alphanumerics in directory names with `_`, so `/assets/baraba-ride/products/BR-01/3.jpg` resolves under `/baraba_ride/products/BR_01/3.jpg`. The pipeline uses the same mapping for upload locations; the function is shared, not duplicated.

Resolvers:

| Resolver          | Transform                                                       | Used by                 |
| ----------------- | --------------------------------------------------------------- | ----------------------- |
| product thumbnail | `tr:w-480,c-at_max`                                             | list card, gallery tile |
| product shot      | `tr:w-1200,c-at_max`                                            | opened from the gallery |
| variant           | `tr:x-,y-,w-,h-,cm-extract:e-bgremove:w-256,c-at_max,bg-FFFFFF` | named parts, parts view |

The detail gallery shows thumbnails; each links to the full shot in a new tab, so five 1200px images are not loaded into small tiles.

### Unconfigured means placeholder, not a local fallback

game-tracker falls back to the raw local path, which works there because some assets exist locally. Here no local file exists, so a fallback would be a guaranteed 404. Resolvers return `null` when `VITE_IMAGEKIT_URL_ENDPOINT` is unset and the image component renders a neutral placeholder. The same placeholder shows when an image fails to load.

CI and e2e run without the endpoint, so they exercise the placeholder path and make no CDN request.

### Image origins are allowlisted, not banned

The "self-hosted only" requirement becomes "app origin or the configured ImageKit origin only". CSP `img-src` gains `https://ik.imagekit.io`. The e2e check changes from "no foreign image" to "no image outside the allowlist"; with the endpoint unset in e2e it still observes zero foreign requests.

Hotlinking `assets-toy.bandai.co.jp` directly was rejected: it cannot crop, loads 1500px originals into thumbnails, and breaks whenever Bandai rotates a token.

## Risks / Trade-offs

- **Licensing.** Republishing Bandai's shots contravenes its site terms. Accepted by the project owner for a personal, signed-in tracker. Mitigation: shots keep their `©BANDAI` mark, the page keeps its attribution footer, and removal is one folder delete on ImageKit plus unsetting the endpoint.
- **Crop drift.** If Bandai replaces a breakdown shot with a different layout, existing crops show the wrong region. Mitigation: uploads are skipped when the asset exists, so a re-run does not silently replace a shot; `--reupload` is an explicit act followed by a visual check in Storybook.
- **Shot order is assumed.** Shot 3 is the breakdown on the four products viewed. Mitigation: the curator views each product's shot when writing its crops, so a deviation surfaces during curation; `shot` is per entry, not global.
- **Background removal is metered.** `e-bgremove` is a paid ImageKit extension charged per generated image, and the first request for each takes several seconds. There are 33 distinct variant images, generated once and then cached. Mitigation: all were requested once after curation, so visitors hit the cache; changing a crop box or the transform regenerates only the affected images.
- **Shared ImageKit quota** with game-tracker. About 46 files of under 1 MB each is negligible against the free tier.
- **Images absent in CI.** Rendering with real images is not covered by automated tests. Mitigation: unit tests cover URL building; Storybook stories set the endpoint for visual review.

## Open Questions

None. Colour labels for all nine part-bearing products were read from their breakdown shots during curation (task 3.2); they are the curator's reading, not official colour names.
