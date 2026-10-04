## Context

Baraba Ride (バラバライド, also written BARABARIDE) is a Bandai electric 4WD battle toy line released 2026-09-19. A machine is assembled from four part slots — cowl, chassis, bumper, and four tires (one per wheel position) — and each machine belongs to one of three styles: Upper, Spin, Dash. Bumpers and tires change behaviour depending on mounting orientation.

Launch lineup (verified against the official site on 2026-10-04):

| Code  | Product        | Type        | Style | Price (JPY, tax incl.) |
| ----- | -------------- | ----------- | ----- | ---------------------- |
| BR-01 | Storm Falcon   | Starter Set | Upper | 3,300                  |
| BR-02 | Lash Stallion  | Starter Set | Spin  | 3,300                  |
| BR-03 | Fury Lizard    | Starter Set | Dash  | 3,300                  |
| BR-04 | Storm Falcon   | Starter Set | Upper | 3,300                  |
| BR-05 | Lash Stallion  | Starter Set | Spin  | 3,300                  |
| BR-06 | Fury Lizard    | Starter Set | Dash  | 3,300                  |
| BR-07 | Falcon Kit     | Booster Set | Spin  | 1,540                  |
| BR-08 | Stallion Kit   | Booster Set | Dash  | 1,540                  |
| BR-09 | Lizard Kit     | Booster Set | Upper | 1,540                  |
| BR-10 | Fold Colosseum | Tool        | —     | 3,300                  |

Starter sets contain cowl ×1, bumper ×1, tire ×4, chassis ×1, Ride Charger ×1, sticker sheet. Booster sets contain cowl ×1, bumper ×1, tire ×4, sticker sheet (no chassis or charger). How BR-04–06 differ from BR-01–03 is not stated on the product pages and must be confirmed during curation.

Part names seen so far (from the official "Custom Encyclopedia" example builds): chassis `Alpha`; cowls `Storm Falcon`, `Lash Stallion`, `Fury Lizard`; bumpers `Dual Blade`, `Wide Shield`, `Mega Launcher`; tires `RW32`, `LW32`, `C36`, `H36`.

### Data source assessment

| Source                                                            | What it has                                                                 | Access                                                                                                                         | Verdict                             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Official lineup — `toy.bandai.co.jp/ja/series/barabaride/lineup/` | All products: code, name (JA + romanized), style, link to item page         | Static server-rendered HTML, no auth, no bot wall. Product list is duplicated in the markup (PC + SP blocks) — dedupe by code. | **Primary: product index**          |
| Official item pages — `toy.bandai.co.jp/{ja,en}/item/01_21xxx/`   | Price, release date, target age, description, slot-level contents, manual   | Static HTML. `/en/` mirror gives English names and descriptions.                                                               | **Primary: product detail**         |
| Official Custom Encyclopedia — `.../barabaride/custom/`           | Example builds naming the part in each slot, including per-wheel tire codes | Static HTML, 3 builds today                                                                                                    | **Secondary: seed for part names**  |
| Official instruction manuals (PDF, linked from item pages)        | Likely the only official place naming the exact parts in each box           | PDF download; not parsed yet                                                                                                   | Manual reference for curation       |
| Fandom wiki — `baraba-ride.fandom.com`                            | 16 articles, almost all anime episode stubs; no parts or product pages      | MediaWiki `api.php` works; page HTML returns 402 to bots                                                                       | **Rejected** for now; recheck later |
| News coverage (HOBBY Watch, Dengeki Hobby, toy-people)            | Launch announcements, style descriptions                                    | Unstructured articles                                                                                                          | Human cross-check only              |

There is no official JSON API, no companion-app data, and no published part stats.

### Constraints

- Bandai's site footer prohibits unauthorized reuse of its images, text, and data. The pipeline therefore extracts only factual fields (code, name, type, style, price, release date, contents counts) and never downloads images or stores description prose.
- Production CSP limits `img-src` and `connect-src` to the app's own origin, Supabase, and Google auth.
- `toy.bandai.co.jp` serves no `robots.txt` (404). Fetch politely regardless.

## Goals / Non-Goals

**Goals:**

- A committed, reviewable catalog JSON that the app imports statically.
- A re-runnable pipeline so each new release wave is a one-command update plus curation diff.
- Product and part browsing on `/baraba-ride`.

**Non-Goals:**

- Ownership tracking, custom builds, part stats, runtime scraping, image mirroring.

## Decisions

1. **Build-time scrape, committed output.** `npm run data:br` fetches lineup + item pages and writes `src/data/br/products.json`. The app never contacts Bandai. Alternative considered: Supabase tables as the catalog store — rejected for a ~10-row dataset that changes a few times a year; static JSON is diffable and needs no migration. Revisit when ownership tracking needs foreign keys.
2. **Two-layer data: scraped + curated.** Scraped facts live in `products.json` (generated, do not hand-edit). Parts and the product → parts mapping live in hand-edited `src/data/br/parts.json` and `src/data/br/product-parts.json`. The pipeline validates that every product code referenced by curation exists and reports products with no part mapping.
3. **Stable ids.** Products are keyed by BR code (`BR-01`). Parts are keyed `<slot>:<slug>` (`bumper:dual-blade`, `tire:rw32`). Bandai's item path (`01_21000`) is stored as `sourceId` only — it is not ordered by product code.
4. **English from the `/en/` mirror, Japanese kept.** Each product stores `nameEn` and `nameJa`.
5. **Parse with a real HTML parser** (`cheerio`, dev dependency) keyed on the lineup's `p-productsListLink` anchors and the item page's labelled lines (価格 / 発売日 / セット内容). Parsing failures fail the run loudly rather than writing partial data.
6. **Polite fetching.** Sequential requests, ≥1 s apart, identifying User-Agent, run manually — never in CI or at app build.
7. **No Bandai imagery.** Product cards use the `br` gradient and a style badge. Self-photographed art can be added later under `public/assets/baraba-ride/`.

## Risks / Trade-offs

- Bandai markup changes break the parser → fixture-based unit tests on saved HTML; the pipeline exits non-zero on any missing required field.
- Curated part mapping may be wrong or incomplete → mapping entries carry a `source` note (manual, packaging, encyclopedia); unmapped products are shown without a parts list rather than guessed.
- Site terms restrict data reuse → facts only, attribution shown, no images or prose; a personal, non-commercial fan project. If Bandai objects, the scraped layer can be replaced by hand entry with no app change.
- Region differences (prices are JPY MSRP; overseas releases may renumber) → store currency explicitly; treat Japan as the reference region.

## Open Questions

- What distinguishes BR-04–06 from BR-01–03 (colour variant, bundled extras)?
- Exact named bumper and tires in each starter and booster box — confirm from manuals or packaging.
- Is `Alpha` the only chassis at launch?
