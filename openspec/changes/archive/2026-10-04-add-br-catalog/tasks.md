## 1. Data pipeline

- [x] 1.1 Add `cheerio` dev dependency and `data:br` npm script
- [x] 1.2 Save lineup and item page HTML fixtures (ja + en) under `scripts/br/__fixtures__/`
- [x] 1.3 Define catalog types in `src/lib/br/types.ts` (Product, Part, ProductParts, Style, Slot)
- [x] 1.4 Implement lineup parser (dedupe PC/SP blocks by code) with unit tests against fixtures
- [x] 1.5 Implement item page parser (price, release date, contents, names) with unit tests
- [x] 1.6 Implement fetch runner: sequential, 1 s delay, fail-loud, deterministic sorted output
- [x] 1.7 Run pipeline and commit `src/data/br/products.json`

## 2. Curated parts

- [x] 2.1 Create `src/data/br/parts.json` seeded from the Custom Encyclopedia part names
- [x] 2.2 Create `src/data/br/product-parts.json`; confirm each box's parts from manuals or packaging
- [x] 2.3 Implement validation (unknown references fail, unmapped products reported) with unit tests
- [x] 2.4 Resolve open questions in design.md (BR-04–06 difference, chassis variants)

## 3. Product catalog UI

- [x] 3.1 Product list on `/baraba-ride` ordered by code, with type and style badges
- [x] 3.2 Type and style filters with empty state
- [x] 3.3 Product detail with contents, mapped parts, and official page link
- [x] 3.4 Component tests and Storybook stories

## 4. Part catalog UI

- [x] 4.1 Parts view grouped by slot
- [x] 4.2 Part → containing products with quantities
- [x] 4.3 Component tests and Storybook stories

## 5. Wrap-up

- [x] 5.1 Update Playwright smoke test for the catalog page
- [x] 5.2 Document `data:br` in CLAUDE.md and README
- [x] 5.3 `npx openspec validate --all`, lint, unit, build, e2e all pass
