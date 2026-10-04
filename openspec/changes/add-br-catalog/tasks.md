## 1. Data pipeline

- [ ] 1.1 Add `cheerio` dev dependency and `data:br` npm script
- [ ] 1.2 Save lineup and item page HTML fixtures (ja + en) under `scripts/br/__fixtures__/`
- [ ] 1.3 Define catalog types in `src/lib/br/types.ts` (Product, Part, ProductParts, Style, Slot)
- [ ] 1.4 Implement lineup parser (dedupe PC/SP blocks by code) with unit tests against fixtures
- [ ] 1.5 Implement item page parser (price, release date, contents, names) with unit tests
- [ ] 1.6 Implement fetch runner: sequential, 1 s delay, fail-loud, deterministic sorted output
- [ ] 1.7 Run pipeline and commit `src/data/br/products.json`

## 2. Curated parts

- [ ] 2.1 Create `src/data/br/parts.json` seeded from the Custom Encyclopedia part names
- [ ] 2.2 Create `src/data/br/product-parts.json`; confirm each box's parts from manuals or packaging
- [ ] 2.3 Implement validation (unknown references fail, unmapped products reported) with unit tests
- [ ] 2.4 Resolve open questions in design.md (BR-04–06 difference, chassis variants)

## 3. Product catalog UI

- [ ] 3.1 Product list on `/baraba-ride` ordered by code, with type and style badges
- [ ] 3.2 Type and style filters with empty state
- [ ] 3.3 Product detail with contents, mapped parts, and official page link
- [ ] 3.4 Component tests and Storybook stories

## 4. Part catalog UI

- [ ] 4.1 Parts view grouped by slot
- [ ] 4.2 Part → containing products with quantities
- [ ] 4.3 Component tests and Storybook stories

## 5. Wrap-up

- [ ] 5.1 Update Playwright smoke test for the catalog page
- [ ] 5.2 Document `data:br` in CLAUDE.md and README
- [ ] 5.3 `npx openspec validate --all`, lint, unit, build, e2e all pass
