# Design review — 2026-10-18

Scope: the web app as of `main` at `c5b319a` (Selection page, Navbar, GameSwitcher, AuthGate, and the Baraba Ride Catalog / Inventory / Builds segments). Method: read every stylesheet and page component, then screenshotted all 43 Storybook stories at 1280px and 390px widths (built with `npm run build:storybook`, driven by Playwright). The distilled system that follows from this review is in [design-system.md](./design-system.md).

Severity: **P1** ships broken, **P2** visibly inconsistent or an accessibility gap, **P3** polish and hygiene.

## P1

### 1. `npm run build:tokens` destroyed every transition (fixed on `main` in `a039c72`, residue remains)

At `c5b319a`, `style-dictionary` 5.7 applied `time/seconds` to tokens typed `duration` and treated a plain string as milliseconds: `"0.15s ease"` became `0.00015s` (easing dropped), so `prebuild` shipped `--transition-fast: .15ms` and every hover, lift and dropdown animation on the live site was effectively instant. `a039c72` moved `transition.*` to DTCG `$type: "transition"` objects referencing `duration.*`, and `npm run build:tokens` now regenerates the committed file byte-for-byte.

Residue:

- `duration.instant` is still the string `"0.01ms"`, which the generator reads as milliseconds and emits as `0.00001s`. Harmless (it is only the reduced-motion override) but write it as `{ "value": 0.01, "unit": "ms" }` so the intent and the output agree.
- Nothing stops the next drift. Add a CI step (or a Vitest case) that runs `build:tokens` and fails on `git diff --exit-code src/styles/tokens.css`.

## P2

### 2. Five unrelated button treatments

| Where                                          | Chrome                                                                                         | Hover                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| `.btn` + `.primary-action` (Navbar, AuthGate)  | gold gradient, 10/16px padding, blur, shimmer sweep                                            | glow, lift 2px                     |
| `.btn` + `.secondary-action` (Navbar)          | transparent, 1px border                                                                        | white border, white glow, lift 2px |
| BR buttons (`.br-toolbar-actions button` etc.) | surface glass, 1px border, `min-height: 36px`, 4/6px padding, `sm` text, no class of their own | orange border                      |
| `.br-filter-chip`                              | pill, `sm` text                                                                                | strong border; pressed = gold tint |
| `.br-picker-choice`                            | surface card button                                                                            | orange border                      |

The shell lifts and glows in gold, the game flashes orange and stays flat. Record purchase (the primary action of Inventory) looks identical to Cancel. There is no primary/secondary/danger hierarchy inside the game views, and nothing is reusable because the BR rules are selector-scoped to their containers rather than to a class.

### 3. Gold and orange compete for "interactive"

Gold (`--color-brand-primary`) means: links, focus ring, pressed filter chip, product card hover, build row hover, position card hover, primary button. Orange (`--color-br-accent`) means: product codes, slot labels, the current segment and tab, _and_ BR button hover, picker choice hover, the active status chip. Hover changes colour family depending on which stylesheet owns the element. Decide one rule and apply it (the design system proposes: gold is interaction, orange is identity).

### 4. Heading sizes come from the browser, not the scale

`h1` in `.br-header`, `.br-toolbar h2`, `.br-dialog h3`, `.br-picker-part h4` and `.auth-gate h2` have no font-size rule, so they render at UA defaults (2em / 1.5em / 1.17em / 1em). The result on the Items view: the page title "Items" (UA 1.5em) and the slot heading "Cowls" (`2xl` = 1.5rem) are the same size, so the hierarchy reads flat. Two of the eleven size tokens (`5xl` and `display`) are unused; `.game-name` hardcodes `1.6rem`, a size the scale does not have.

### 5. Same concept, different type treatment

- A part name is an `h3.br-part-name` (display face) in the catalog but a `p.br-part-name` (body face) on a build position card. Visible side by side in the Build view screenshots.
- `.br-item-name` (semibold body) names an inventory group, a purchase, and a build; a build name is also a gold link, so the builds list reads as a list of links while the items list reads as labels.
- Status chips (`.br-status`) use uppercase 0.7rem; badges (`.br-badge`) use mixed case 0.7rem; filter labels use uppercase bold dim. Three label grammars for one job.

### 6. Dialogs are not modal

`RecordPurchaseDialog`, `AddItemsDialog`, `NewBuildDialog`, `MarkBuiltDialog`, `InstancePicker` and `PlanPartPicker` render `<dialog open>` inside a hand-made backdrop `div`. Nothing calls `showModal()`, so: focus is not trapped and does not move into the dialog (except `NewBuildDialog`'s `autoFocus`), Escape does not close, clicking the backdrop does nothing, the page behind still scrolls, and screen readers are not told the rest of the page is inert. The backdrop also shares `--z-index-modal` with the GameSwitcher dropdown.

### 7. Expandable rows have no disclosure affordance

`.br-item-group > summary` and `.br-purchase > summary` are `display: flex`, which removes the default `::marker` in Chromium. The Items and Purchases rows show nothing that says they open (see the InventoryItems and InventoryPurchases screenshots). No `::marker`, no chevron, no open-state styling.

### 8. Native form controls fall back to light UI

`color-scheme` is never set, so the `<select>` popups and the `<input type="date">` picker in the dialogs open as white-on-white system widgets over a dark page. The quantity spinner and the select arrows also render in the light scheme. One line, `:root { color-scheme: dark; }`, fixes all of it.

### 9. Touch targets under 44px

BR buttons are `min-height: 36px`; filter chips are ~26px tall; instance-row Retire / Delete buttons sit 8px apart. On the 390px screenshots the toolbar buttons and chips are tappable but tight. Set 40px minimum, 44px under `(pointer: coarse)`.

### 10. Invalid interactive nesting

`GameCard` is a `<button>` that contains `<div>`, `<h2>` and `<p>`. Buttons permit phrasing content only; heading semantics inside a button are dropped by most screen readers. Make the card an `<article>` with one `<a>` or `<button>` that stretches over it, the way `.br-build-row` already does.

## P3

### 11. Two overlapping spacing scales

`spacing.1,2,3,5,6` (2/4/6/10/12px, no 4) coexist with `xs…3xl` (4/8/16/24/32/48/64px). `spacing.2` and `spacing.xs` are both 4px. Stylesheets mix them freely (`var(--spacing-2) var(--spacing-6)` next to `var(--spacing-sm)`). Collapse to one named scale.

### 12. Unused and duplicate tokens

Unused: `color.brand.accent` is used only by the body wash; `color.text.onPrimary`, `shadow.sm`, `shadow.md`, `shadow.glowSm`, `zIndex.base`, `zIndex.toast`, `duration.pulse`, `fontSize.5xl` (only in the hero), `fontSize.display`, `lineHeight.tight/base/loose`. Duplicates: `transition.*` and `duration.*` express the same three durations twice; `borderRadius.badge` (10px) sits between `md` and `lg` for one pill.

### 13. Literal colours outside tokens

All sixteen literals are neutral white/black glass (`rgba(255,255,255,0.02…0.1)`, `rgba(0,0,0,0.3…0.8)`, `#fff`), which the sibling Temper rules sanction, but five distinct white alphas (0.02, 0.05, 0.08, 0.1, 0.2) and the `#fff` gradient stops deserve two tokens (`glass.1`, `glass.2`) and a `text.bright` rather than per-file guesses.

### 14. Lift and hover motion is not systematised

`.btn` lifts 2px, `.br-product-card` lifts 3px, `.selection-card` lifts 5px and scales 1.02, `.dropdown-item` slides 4px right, `.br-build-row` does not move. Pick one lift for cards, none for rows, and none for buttons inside dense lists.

### 15. Loading and empty states are plain sentences

`Loading inventory...`, `Checking authentication...`, `Your inventory is empty.` render as unstyled `<p>` text at the top of an otherwise blank page. Fine functionally, but with no vertical rhythm or icon they read as an error. A single `.state` block (centered, dim text, optional action) covers loading, empty and not-found.

### 16. Generated `tokens.css` is committed but unchecked

`npm run build` (through `prebuild`) and `npm run dev` (through the token watcher) both rewrite `src/styles/tokens.css`. Today the output matches the committed file, but only by convention; the drift check from finding 1 is what makes that a guarantee.

### 17. Small things

- `.br-product-card:hover` sets `text-shadow: none` to cancel the global `a:hover` glow; the glow rule is too broad and should be scoped to inline text links.
- The ProductDetail gallery opens full shots in a new tab; a lightbox is the expected pattern but not required.
- BR-01 and BR-04 both render as "Storm Falcon" in the product grid with no visible differentiator except the image; the catalog has a `variant.color` per part but not per product. Consider showing the box colour in the card.
- `index.html` has no `theme-color` meta, so mobile browser chrome stays white above a dark app.
- `.selection-card-header` is a fixed 320px; at 390px the cover art is cropped hard on both sides.

## What is working

- Token discipline is real: every stylesheet consumes CSS variables, `color-mix` derivations are used instead of new hues, and the only literals are neutral glass.
- The Temper palette (Ink / Slate / Porcelain + gold) with the orange game accent gives the app a recognisable, consistent dark voice across all four surfaces.
- Semantic HTML is good: `nav` with `aria-label`, `aria-current` on tabs, `aria-pressed` on chips, `role="alert"` on errors, `<details>` for groups, `<dl>` for facts, `lang="ja"` on Japanese names.
- The global `:focus-visible` ring and the `:has()` ring transfer on stretched-link cards mean keyboard focus is visible everywhere, including the stretched rows.
- `prefers-reduced-motion` is honoured globally.
- The build layout grid (bumper / cowl / chassis with tires flanking) is a genuinely good spatial metaphor and reflows sensibly at 640px.
- Danger is consistently red text + red border, confirmations are in place rather than modal, and destructive actions name their consequence.
