# Tasks

## 1. Pipeline

- [x] 1.1 Add the trimmed `manual_space` block (the `a.downloadBtn` link only, no prose or images) to `scripts/br/__fixtures__/item-br-01.ja.html`, taken from the live BR-01 item page; verify the existing `catalog.test.ts` tests still pass
- [x] 1.2 Add `manualUrl?: string` to `Product` in `src/lib/br/types.ts` with a doc comment noting it opens Bandai's interstitial page; verify `npx tsc -b` passes
- [x] 1.3 Extend `parseItemJa` and `ItemJa` in `scripts/br/catalog.ts` to read the optional manual link, throwing `CatalogParseError` (field `manualUrl`) when a link is present but is not `https://toy.bandai.co.jp/manuals/pdf.php?id=<digits>`; verify with new `catalog.test.ts` cases for link present (BR-01 fixture), link absent (a fixture without the block), and malformed link
- [x] 1.4 Emit `manualUrl` after `sourceUrl` in `buildProduct`, omitting the key when absent; verify with `catalog.test.ts` cases covering both and that `serializeProducts` output has no `manualUrl` key for a manual-less product
- [x] 1.5 Run `npm run data:br` and commit the regenerated `src/data/br/products.json`; verify the diff only adds `manualUrl` lines, BR-01 to BR-03 each have one, and `npx vitest run src/lib/br/validate.test.ts` passes

## 2. Product detail

- [x] 2.1 Render an "Instruction manual ↗" link after the official product page link in `src/pages/baraba-ride/ProductDetail.tsx` when `product.manualUrl` is set, with `target="_blank" rel="noopener noreferrer"`; verify with new `ProductDetail.test.tsx` cases for link shown (correct `href`, new tab) and link absent
- [x] 2.2 Adjust `BrPage.css` if the two links need spacing, using design tokens only; verify in `npm run storybook` that both links read clearly in `ProductDetail.stories.tsx`, adding a story variant without a manual

## 3. Integration

- [x] 3.1 Run `npm run lint`, `npm run test`, `npm run build`, and `npx openspec validate --all`; verify all pass
- [x] 3.2 Open `/baraba-ride?product=BR-01` in `npm run dev` and click the manual link; verify it opens Bandai's manual page in a new tab with no CSP error in the console
