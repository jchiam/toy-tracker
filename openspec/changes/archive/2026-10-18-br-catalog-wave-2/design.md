# Design

## Context

See proposal.md for motivation. What the live site looks like today (fetched 2026-10-18 and run through the current parsers):

- The lineup page lists 14 products. Lineup parsing already succeeds for all 14: codes, source ids and style classes (`-upper`, `-spin`, `-dash`, `-tool`) are unchanged.
- Japanese item titles follow the existing `バラバライド <type> BR-nn <name>` shape. BR-12's title has two spaces before its name (`BR-12  DXスターターセット`); the title regex already tolerates that.
- Type words: BR-11 スターターセット, BR-12 セット, BR-13 ブースターセット, BR-14 ブースターパック.
- Shots: BR-11 to BR-14 serve 5, 7, 5 and 8 shots from `https://bandai-a.akamaihd.net/bc/img/model/xl/<id>_<n>.jpg`. BR-01 to BR-10 still serve theirs from `assets-toy.bandai.co.jp`. The new shots are 1200×1200; the old ones are 1500×1500.
- Contents: BR-11 to BR-13 list `・本体…1`; BR-14 lists `・タイヤ…4`, `・シール…1` followed by a `※` note line. The contents parser already stops at the first non-`・<label>…<n>` line, so the note is skipped and no change is needed.
- None of the four pages has a manual link. The pipeline already writes such products without `manualUrl`.
- English titles: `BARABARIDE SET BR-12 DX STARTER SET` and `BARABARIDE BOOSTER PACK BR-14 RANDOM TIRE COLLECTION Vol.1`. Title-casing gives `Dx Starter Set` and `Random Tire Collection Vol.1`.

The pipeline writes nothing unless every product parses, so every blocker above must be cleared in one change.

## Goals / Non-Goals

**Goals:**

- Make the 14-product lineup parse with the smallest honest model change, and regenerate the catalog.
- Keep every existing guard: the shot host allowlist, the fail-loud behaviour, the fixture discipline (no prose, no image files).

**Non-Goals:**

- Any mapping, blind-box or accessory modelling (see proposal non-goals).
- Reworking crop validation for 1200px shots. Recorded here as a constraint on the next change.

## Decisions

**Two new `ProductType` values rather than folding into existing ones.**
`set` for セット and `booster-pack` for ブースターパック, with labels "Set" and "Booster Pack". Folding BR-12 into `starter-set` or BR-14 into `booster-set` would make the type filter and badges state something the official site does not, and BR-14 will need its own handling (random contents) that a shared type would obscure. `TYPE_LABELS` is a `Record<ProductType, string>`, so adding the union members makes `tsc` list every consumer; today those are the label map, the type filter and the two badge sites, which all iterate or index the map and need no further edits. Alternative considered: a free-form `type: string` carrying the Japanese word. Rejected: loses the exhaustive label check and leaks source-language strings into the UI.

**Allowlist the second shot host instead of accepting any `https://*.jpg`.**
`SHOT_URL` becomes an alternation over the two hosts, `assets-toy.bandai.co.jp` and `bandai-a.akamaihd.net`, each path matched with its existing `\S+\.jpg` shape. Both are Bandai-controlled (Akamai is their CDN). An open pattern would let a future markup change silently upload a tracking pixel or a layout arrow (`../../../images/common/arrow_prev_bk.png` sits in the same gallery markup today and is filtered only by the host check). CSP needs no change: the app never loads from either host, only from ImageKit.

**Acronym exception list in `titleCase`, seeded with `DX`.**
After lower-casing and capitalising each word, a word whose upper-case form is in a small `ACRONYMS` set is emitted in capitals. Alternatives: keep any all-caps word of two letters (would keep `OF`, `IN` capitalised if they ever appear); keep the English title verbatim (gives `STORM FALCON`, contradicting the existing catalog). The list is the only option that is explicit about what it knows.

**New fixtures: lineup entries for BR-11 to BR-14 and two item pages, BR-12 and BR-14.**
BR-12 covers the new type word, the new host and the absent manual button. BR-14 covers the other new type word, a `null` style on a non-tool-typed product, a two-line contents list, the trailing `※` note and the `Vol.1` name. BR-11 and BR-13 add nothing the existing BR-01 and BR-07 fixtures do not already prove, so they get lineup entries only. Fixtures are built the way the existing ones were: the official page with description prose cut to the `［セット内容］` block, gallery `<img>` elements keeping their `src`, no image bytes.

**The catalog run is a task, not a test.**
`npm run data:br` needs `IMAGEKIT_PRIVATE_KEY` from `.env.local` and the live site. It is run once by hand after the code change lands locally, and its output (`products.json`, 14 records) is committed. Verification of the run is the committed file plus the unit tests that read it. Shots are uploaded as plain files; no metered transform is triggered until a variant crop is added later.

**Tests that enumerate the catalog are updated, not loosened.**
`ProductCatalog.test.tsx` lists codes BR-01 to BR-10 and gains BR-11 to BR-14. `RecordPurchaseDialog.test.tsx` expects 10 options because it offers mapped products only; with the new products unmapped it stays at 10 and must not be touched. The pipeline tests keep asserting exact code lists so a future lineup change shows up as a failing test, not a silent count drift.

## Risks / Trade-offs

- [Shots are 1200px but crop validation assumes 1500px] → No crop is added for BR-11 to BR-14 in this change, so nothing is wrong yet. The wave-2 mapping change must either record each product's shot size in the catalog or validate against the real dimensions. Noted in the proposal as a non-goal so it is not forgotten.
- [Bandai may move BR-01 to BR-10 shots to the new host too] → The pipeline skips shots already on the CDN by asset path, so a host move costs nothing and changes no output. `--reupload` would re-fetch from the new host.
- [The new host rotates or expires its image paths] → Same exposure as today's `assets-toy` paths; the source URL is never persisted and the CDN copy is the one the app uses.
- [Type filter grows to five buttons] → Acceptable on the current layout; the filter group already wraps.
- [`DX` list is incomplete for future names] → A future acronym fails visibly as a miscased name in the catalog diff at regeneration time, and the fix is one list entry.

## Migration Plan

1. Land the code change with updated fixtures and tests (`npm run test` green against the old `products.json`).
2. Run `npm run data:br` locally with `.env.local` present; confirm it reports 14 products and 25 uploads (or skips), and writes `products.json`.
3. Run `npm run test` again against the new catalog; update the catalog enumeration test.
4. Commit code and data together so `main` never holds a catalog the UI tests disagree with.

Rollback: revert the commit. The uploaded CDN files are harmless if left in place and are reused by a later run.
