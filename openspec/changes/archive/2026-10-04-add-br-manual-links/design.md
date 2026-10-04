# Design

## Context

See proposal.md for motivation. Observed on 2026-10-04:

- The Japanese item page for BR-01 (`/ja/item/01_21000/`) contains one manual link:
  `<div class="manual_space"><a class="downloadBtn" href="https://toy.bandai.co.jp/manuals/pdf.php?id=2852278" ...>`.
  Only BR-01 was checked; the user confirmed this document is the sticker placement guide.
- `pdf.php?id=<n>` serves an HTML interstitial, not the PDF. Its "view manual" link is `manual.php?id=<n>&time=<t>&sig=<s>` — time-signed, so it expires.
- `products.json` is generated and never hand-edited, so the link has to come from the pipeline.
- The fixtures in `scripts/br/__fixtures__/` are trimmed and do not contain the `manual_space` block.
- The production CSP sets `object-src 'none'` and limits `frame-src` to self and Google.

## Goals / Non-Goals

**Goals:**

- One click from a product to Bandai's official manual page.
- No manual curation: a new release wave picks up its manual link from `npm run data:br`.

**Non-Goals:**

- Archiving, downloading, mirroring, or embedding the PDF.
- Opening the PDF directly, skipping Bandai's interstitial.
- Checking that recorded links are still alive.

## Decisions

1. **Scrape the link; do not hand-curate it.** `parseItemJa` reads `.manual_space a.downloadBtn` and the product gains `manualUrl?: string`. Alternative considered: a hand-curated `manuals.json` keyed by product code — rejected because the item page already carries the link, and curation would need repeating for every release.
2. **Store the stable `pdf.php?id=<n>` URL.** The signed `manual.php` URL expires, so it cannot be stored. Following the interstitial at click time would need a proxy or a cross-origin fetch, which the CSP blocks. The consequence — the link opens Bandai's interstitial and the PDF is one more click — is known and accepted as a non-issue.
3. **Read from the Japanese page only.** It is the page already parsed for facts and the one verified. The English mirror is not consulted for the manual.
4. **Absent link is valid; malformed link is an error.** No `.manual_space` link means the field is omitted. A link that is present but is not `https://toy.bandai.co.jp/manuals/pdf.php?id=<digits>` throws `CatalogParseError` with field `manualUrl`, in line with the pipeline's fail-loudly rule, so a markup change cannot write a wrong link.
5. **Field placement.** `manualUrl` follows `sourceUrl` in `buildProduct` and is left out entirely when absent (no `null`), keeping output deterministic and the diff for manual-less products empty.
6. **UI.** A second anchor after the "Official product page ↗" link in `ProductDetail`, labelled "Instruction manual ↗", with the same `target="_blank" rel="noopener noreferrer"` and `br-source` styling. A new-tab navigation needs no CSP change.

## Risks / Trade-offs

- [Bandai removes or renumbers a manual] → The link breaks until the next `npm run data:br`, or permanently if the manual is withdrawn. Accepted: this is a link, not an archive.
- [Only BR-01 was inspected] → Other products may have no link or a different shape. The first pipeline run after this change shows which products gain `manualUrl`; decision 4 turns an unexpected shape into a named failure.
- [Interstitial instead of PDF] → One extra click on Bandai's page. Accepted as a non-issue (decision 2).
- [`.manual_space` markup changes] → A missing block reads as "no manual" rather than an error. The `products.json` diff after a pipeline run makes dropped links visible in review.
