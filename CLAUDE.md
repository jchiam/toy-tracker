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
- **Supabase client** is a singleton in `src/lib/supabase.ts`, configured with a 10-second fetch timeout. Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` come from `.env.local` (see `.env.example`). Migrations live in `supabase/migrations`, pushed with `npm run db:push`.
- **Directory roles:** `src/pages/` route-level components, `src/components/` reusable UI, `src/services/` data access wrappers, `src/lib/` clients and domain logic, `src/hooks/` custom hooks. Unit tests are colocated (`*.test.tsx` next to source); Playwright specs live in `tests/` and are excluded from Vitest.
- **Path alias:** `@/` maps to `src/` (configured in both Vite and tsconfig).
- **Test setup** (`src/test/setup.ts`) silences `console.warn`/`console.error` globally; MSW server lifecycle is managed per-test-file, not in global setup.
- **Vercel deploy:** `vercel.json` holds SPA rewrites and CSP headers. When adding an external service (Supabase project URL, image CDN), its origin must be added to `connect-src`/`img-src` there or production requests will be blocked. `npm run verify:csp` (also in CI) checks the Supabase origin is present in `connect-src`.

## Conventions

- TypeScript strict mode with `erasableSyntaxOnly`, `noUnusedLocals`, `verbatimModuleSyntax` — imports of types must use `import type`.
- Prettier enforced through ESLint (`prettier/prettier: error`); `no-console` warns except `warn`/`error`.
- Tests import Vitest APIs explicitly (`import { describe, it, expect } from 'vitest'`) even though `globals: true` is set, so `tsc -b` passes without vitest types in tsconfig.
