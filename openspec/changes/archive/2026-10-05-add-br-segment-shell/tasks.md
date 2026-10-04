# Tasks

## 1. Routing foundation

- [x] 1.1 Add `src/lib/br/routes.ts` exporting the Baraba Ride base path and path builders (catalog, product by code, parts, inventory, builds); verify with a new `src/lib/br/routes.test.ts` covering each builder and asserting the base equals the `br` entry's `path` in `GAMES`
- [x] 1.2 Mount each game in `src/App.tsx` at `` `${game.path}/*` `` so sub-paths reach the game page, leaving `src/lib/games.ts` unchanged; verify `npx vitest run src/App.test.tsx src/lib/games.test.ts` passes
- [x] 1.3 Add a `GameSwitcher.test.tsx` case rendering at `/baraba-ride/catalog/parts`; verify the trigger shows the Baraba Ride icon and the Baraba Ride item is marked active

## 2. Segment shell

- [x] 2.1 Restructure `src/pages/baraba-ride/BrPage.tsx` into the session gate plus a shell with the `h1`, a segment navigation (Catalog, Inventory, Builds, labelled for assistive technology), nested routes per design D4, and the attribution footer; update `BrPage.test.tsx` to mount `BrPage` under a `/baraba-ride/*` route and verify the navigation shows the three segments in order with `aria-current="page"` on the current one, including on a product detail path
- [x] 2.2 Add the Catalog segment with the Products / Parts sub-navigation and its nested routes (list, `products/:code`, `parts`, unknown path to Catalog); verify with `BrPage.test.tsx` cases for Products current on the list and on a product detail, Parts current on the parts view, and no sub-navigation in Inventory or Builds
- [x] 2.3 Handle an unknown product code on `products/:code` with the existing "No product with code X." message plus the product list; verify with a `BrPage.test.tsx` case at `/baraba-ride/catalog/products/BR-99`
- [x] 2.4 Add a static segment placeholder (heading plus a not-available-yet sentence, no Supabase import) and mount it for `inventory` and `builds`; verify with `BrPage.test.tsx` cases for both headings and messages
- [x] 2.5 Add the default and legacy redirects with `replace`: `/baraba-ride` and unknown paths to Catalog, `?product=<code>` to the product path, `?view=parts` to the parts path, product taking precedence; verify with `BrPage.test.tsx` cases asserting the resulting location for each, including both parameters together
- [x] 2.6 Keep the gate ahead of the routes; verify with `BrPage.test.tsx` cases that a signed-out render at `/baraba-ride/builds` shows the auth gate, no segment navigation, and an unchanged location
- [x] 2.7 Style the segment navigation and the placeholder in `BrPage.css` using design tokens only, with the segment navigation reading as the primary level above the reused `.br-tabs` sub-navigation; verify `npm run lint` passes and both rows wrap without overflow at a 375 px viewport in `npm run dev`
- [x] 2.8 Replace the "game keeps one route — views are query strings" statement in `CLAUDE.md` with the nested-path structure and the `src/lib/br/routes.ts` rule; verify the paths listed match `routes.ts`

## 3. Catalog links

- [x] 3.1 Point product cards in `ProductCatalog.tsx` at the product path from `routes.ts`; verify `ProductCatalog.test.tsx` expects `/baraba-ride/catalog/products/BR-07`
- [x] 3.2 Point the "All products" link in `ProductDetail.tsx` at the catalog path; verify `ProductDetail.test.tsx` expects `/baraba-ride/catalog` and renders from a product path
- [x] 3.3 Point the variant and source-product links in `PartCatalog.tsx` at product paths; verify `PartCatalog.test.tsx` expects the new `href` values and renders from `/baraba-ride/catalog/parts`
- [x] 3.4 Update the `initialEntries` of the catalog stories (`ProductCatalog`, `ProductDetail`, `PartCatalog`) where they use the query form; verify each story renders in `npm run storybook` with working link targets and that no `?product=` or `?view=` literal remains under `src/` outside the redirect and its tests

## 4. End-to-end

- [x] 4.1 Update `tests/baraba-ride.spec.ts` to the new addresses (list at `/baraba-ride/catalog` after opening `/baraba-ride`, product at `/baraba-ride/catalog/products/BR-07`, parts at `/baraba-ride/catalog/parts`, image-origin test using the new paths); verify `npx playwright test --project=chromium tests/baraba-ride.spec.ts` passes
- [x] 4.2 Add e2e cases for switching to Inventory and Builds through the segment navigation and for the two legacy links (`/baraba-ride?product=BR-01`, `/baraba-ride?view=parts`) reaching their new addresses; verify they pass in chromium
- [x] 4.3 Confirm `tests/smoke.spec.ts` needs no change (signed-out addresses stay as opened); verify `npx playwright test --project=chromium tests/smoke.spec.ts` passes

## 5. Integration

- [x] 5.1 Run `npm run lint`, `npm run test`, `npm run build`, and `npx openspec validate --all`; verify all pass
- [x] 5.2 Run `npm run test:e2e`; verify all three browsers pass
- [x] 5.3 In `npm run dev`, walk Catalog (list, a product, parts), Inventory, and Builds, use the browser's back control across them, and open `/baraba-ride` and `/baraba-ride/nowhere`; verify each lands as specified in `specs/br-segments/spec.md` and that back from a redirected address leaves the Baraba Ride page
