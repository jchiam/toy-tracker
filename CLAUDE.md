# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

The JonZone Toy Zone (package `jonzone-toy-zone`) — a toy collection and custom-build tracker; the first tracked line is Baraba Ride (Bandai, game id `br`). Scaffolded from the sibling `../tcg-tracker` project (itself from `../game-tracker`) and shares its tech stack and conventions: React 19 + TypeScript (strict) + Vite 8 + React Router 8, Supabase backend, Style Dictionary design tokens, Vitest/Playwright/Storybook.

## Commands

```bash
npm run dev            # dev server (http://127.0.0.1:5175) + token watcher
npm run build          # tsc -b, then vite build (prebuild regenerates tokens)
npm run lint           # eslint
npm run format         # prettier --write
npm run test           # all unit tests (Vitest)
npx vitest run src/App.test.tsx          # single unit test file
npm run test:e2e       # Playwright, all browsers (starts its own vite server)
npx playwright test --project=chromium   # e2e, chromium only
npm run build:tokens   # regenerate src/styles/tokens.css from design-tokens.json
npm run verify:csp     # verify vercel.json CSP connect-src includes VITE_SUPABASE_URL origin (skips if unset)
npm run data:br        # regenerate src/data/br/products.json from the official Bandai site (manual; never in CI)
npm run storybook      # component workshop on port 6006
```

Dev server port is **5175**, not Vite's default 5173 — 5173 is reserved for game-tracker and 5174 for tcg-tracker running alongside. `strictPort` is set, so a clash fails instead of shifting ports. Playwright's baseURL and webServer match 5175.

Git hooks (husky): pre-commit runs openspec validate + format:check + lint + test; pre-push runs build + test:e2e. E2e needs browsers installed once via `npx playwright install`.

## CI

GitHub Actions (`.github/workflows/`): `ci.yml` runs openspec validate (and fails on active changes with incomplete tasks), format:check, lint, `verify:csp` (against the `VITE_SUPABASE_URL` repo secret; skips when unset), unit tests, build, `npm audit --omit=dev` (production dependencies only), then a 3-browser Playwright job (with dummy Supabase env vars). No deploy step — deploys are handled outside CI. `codecov.yml` uploads coverage (needs `CODECOV_TOKEN`; upload failure doesn't fail CI).

## OpenSpec

Spec-driven development via [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec/` dir, `spec-driven` schema). Change proposals live in `openspec/changes/`, accepted specs in `openspec/specs/`. Start a change with `/opsx:propose "idea"`; archive completed changes with `npx openspec archive`. `npx openspec validate --all` runs in pre-commit. The `.claude/commands` and `.claude/skills` files it generates are git-ignored — regenerate on a fresh clone with `npx openspec init --tools claude`.

## Architecture

- **Styling via design tokens.** `src/styles/design-tokens.json` is the source of truth; Style Dictionary generates `src/styles/tokens.css` (git-ignored by Prettier, header says do not edit). Consume tokens as CSS variables (`var(--color-primary)`). Never edit `tokens.css` directly; edit the JSON and run `npm run build:tokens` (the dev script watches automatically).
- **Supabase client** is a singleton in `src/lib/supabase.ts`, configured with a 10-second fetch timeout. Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` come from `.env.local` (see `.env.example`). Migrations live in `supabase/migrations`, pushed with `npm run db:push`. The client throws at import when the URL is empty, so unit tests never import it unmocked: service tests mock `@/lib/supabase` and pass a client built by `src/test/supabase.ts` (pointed at a fake origin, intercepted with MSW); hook and component tests mock the service module or build state with `src/test/br-inventory.ts`.
- **Baraba Ride inventory is per-user Supabase data.** Tables `br_purchases` and `br_instances` reference `user_profiles(id)` with RLS scoped to `auth.uid()::text`, mirroring the profile table. One `br_instances` row is one physical item; `item_id` is a catalog part id (`cowl:…`) or accessory id (`charger:…`), stored as text with no FK, so catalog ids are frozen. Recording a purchase expands the product's mapping client-side into instances (`src/services/br/inventory.ts`, with a compensating delete if the instance insert fails); every write first upserts the profile row through `src/services/profile.ts`. Retiring is a status flip, never a delete. A nullable `condition` column (mint/used/worn) is reserved and unused. `src/hooks/useBrInventory.ts` loads once per user and refetches after each write; pure grouping lives in `src/lib/br/inventory.ts`. The Inventory segment also loads builds through `useBrBuilds`, to name the build holding an instance, show in-builds and free counts, and block retiring or deleting a held instance (and deleting a purchase that contains one).
- **Baraba Ride builds claim inventory instances.** `br_builds` is a named machine that is a `plan` or `built`; `br_build_parts` holds one row per filled position (`bumper`, `cowl`, `chassis`, `tire_fl`/`fr`/`rl`/`rr`; an absent row is an empty position) and is owned through its build, so its RLS policies check `br_builds`. A row with `instance_id` null is a plan's wish (part plus optional `variant_product_code`; null means any variant) and claims nothing; a row with `instance_id` set is a claim, and its `item_id` and `variant_product_code` are then the instance's own. The database guarantees the rest: a partial unique index keeps an instance in at most one build, the `instance_id` foreign key (no delete action, deferred to commit so a profile delete can still cascade) blocks deleting a claimed instance, trigger `br_build_parts_check_claim` rejects claiming a retired, foreign or wrong-part instance, and trigger `br_instances_block_retire_in_build` rejects retiring a claimed one. These are the project's only SQL functions and triggers and unit tests cannot reach them; the checklist at the top of the migration is run by hand. `src/services/br/builds.ts` writes single rows directly; only marking built and taking apart go through RPC (`br_mark_built`, `br_take_apart`) so they are atomic. `src/hooks/useBrBuilds.ts` mirrors `useBrInventory`. Plan checking and instance assignment are pure functions in `src/lib/br/builds.ts`: a plan is checked alone against free parts (active instances no build holds), variant-specific positions are served first, oldest free match wins. Tests and stories build state with `src/test/br-builds.ts`.
- **Directory roles:** `src/pages/` route-level components, `src/components/` reusable UI, `src/services/` data access wrappers, `src/lib/` clients and domain logic, `src/hooks/` custom hooks. Unit tests are colocated (`*.test.tsx` next to source); Playwright specs live in `tests/` and are excluded from Vitest.
- **Baraba Ride catalog is static JSON** under `src/data/br/`, read through `src/lib/br/catalog.ts`. `products.json` is generated by `npm run data:br` (`scripts/br/`, runs as TypeScript directly on Node) — never hand-edit it. `parts.json`, `accessories.json` and `product-parts.json` are hand-curated; `validateCatalog` (`src/lib/br/validate.ts`) checks them against the products in a unit test and inside the pipeline. Accessories (`charger:…`, `colosseum:…`) are the non-part box contents the app chooses to track; a mapping entry lists them under `accessories`, separate from `parts`, so they never enter the parts view or slot counts. Printed contents with no mapping line (stickers, the `body` label on BR-10) are deliberately untrackable. No Bandai image file or description prose enters the repo, and the fixtures in `scripts/br/__fixtures__/` are trimmed accordingly. The game's views are nested paths under `/baraba-ride/`, in three segments: Catalog (`/catalog`, `/catalog/products/BR-01`, `/catalog/parts`), Inventory (`/inventory` for Items, `/inventory/purchases`) and Builds (`/builds` for the list, `/builds/<id>` for one build, linked with `brRoutes.build(id)`). `App.tsx` mounts each game at `<path>/*` and `BrPage` owns the nested routes. The sign-in gate on a game page returns to the address that was opened (path and query), not the game root, so a link to a build survives signing in; the Supabase auth redirect allow-list must therefore hold a wildcard for each app origin (`<origin>/**`). Build links with `brRoutes` from `src/lib/br/routes.ts`, never string literals; the earlier query-string links (`?view=parts`, `?product=BR-01`) redirect to their paths.
- **Baraba Ride images live on ImageKit** (the game-tracker account, folder `baraba_ride`), never in the repo. `npm run data:br` uploads each product's official shots (skipping ones already there; `-- --reupload` replaces them) and records them in `products.json` as asset paths (`/assets/baraba-ride/products/BR-01/1.jpg`), not CDN URLs. `src/lib/imagekit.ts` resolves a path to a CDN URL and owns the transforms; it returns `null` when `VITE_IMAGEKIT_URL_ENDPOINT` is unset, and `CatalogImage` then renders a placeholder (this is what CI and unit tests exercise — `src/test/setup.ts` blanks the endpoint). A part variant (one part in one product: `variant` on a `product-parts.json` entry) is pictured by a hand-curated crop box into the product's breakdown shot, applied as a CDN transform that also removes the panel background (`e-bgremove`, a metered ImageKit extension: each new crop or transform change costs units and is slow on first request). The pipeline reads `IMAGEKIT_PRIVATE_KEY` from `.env.local`; never give that key a `VITE_` prefix, which would expose it to the client bundle.
- **Path alias:** `@/` maps to `src/` (configured in both Vite and tsconfig).
- **Test setup** (`src/test/setup.ts`) silences `console.warn`/`console.error` globally; MSW server lifecycle is managed per-test-file, not in global setup.
- **Vercel deploy:** `vercel.json` holds SPA rewrites and CSP headers. When adding an external service (Supabase project URL, image CDN), its origin must be added to `connect-src`/`img-src` there or production requests will be blocked. `npm run verify:csp` (also in CI) checks the Supabase origin is present in `connect-src`.

## Conventions

- TypeScript strict mode with `erasableSyntaxOnly`, `noUnusedLocals`, `verbatimModuleSyntax` — imports of types must use `import type`.
- Prettier enforced through ESLint (`prettier/prettier: error`); `no-console` warns except `warn`/`error`.
- Tests import Vitest APIs explicitly (`import { describe, it, expect } from 'vitest'`) even though `globals: true` is set, so `tsc -b` passes without vitest types in tsconfig.
