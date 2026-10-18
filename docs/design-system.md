# The JonZone Toy Zone design system

Distilled from the app on 2026-10-18 (see [design-review.md](./design-review.md) for the evidence). This document names what the app already does well, settles the places where it disagrees with itself, and gives each decision a home. Where a rule is **new** it is marked as such; everything else is the current behaviour, written down.

Source of truth for values stays `src/styles/design-tokens.json` → `src/styles/tokens.css` (`npm run build:tokens`). This document is the source of truth for _meaning_: which token to reach for, and why.

## 1. Voice

The app is a workshop ledger for toy machines: dark, warm, quiet, with one bright metal and one hot colour. It inherits the **Temper** language from game-tracker: warm Ink / Slate / Porcelain neutrals, gold as the brand metal, and one accent per toy line.

Four principles:

1. **Ground is Ink, content is Porcelain, interaction is gold, identity is orange.** Every colour in the UI belongs to one of those four jobs.
2. **Surfaces are glass over Ink.** Cards, rows, navbar and dialogs are translucent slate with a 1px hairline border; depth comes from alpha and blur, not from drop shadows.
3. **Density over decoration.** Lists are tight, cards carry only what identifies the thing, and chrome does not move unless the pointer is on it.
4. **Native first.** System fonts, `<details>`, `<dialog>`, native selects and date inputs. Style them; do not replace them.

## 2. Colour

### 2.1 Roles

| Role                   | Token                              | Value               | Use                                                                                           |
| ---------------------- | ---------------------------------- | ------------------- | --------------------------------------------------------------------------------------------- |
| Ground                 | `--color-bg-base`                  | `#0e1014` Ink       | `body`, image letterboxes (`.br-image`)                                                       |
| Surface                | `--color-bg-surface`               | Slate glass 70%     | cards, rows, navbar, inputs, buttons at rest                                                  |
| Surface hover          | `--color-bg-surface-hover`         | Slate glass 80%     | the hovered card / row / button                                                               |
| Elevated               | `--color-bg-elevated`              | Slate glass 90%     | dialogs, dropdowns, in-place confirmation panels, neutral status chips                        |
| Text                   | `--color-text-primary`             | `#e9e4d8` Porcelain | names, values, headings                                                                       |
| Text secondary         | `--color-text-secondary`           | `#b3ad9e`           | dates, counts, notes, inactive tabs, descriptions                                             |
| Text dim               | `--color-text-dim`                 | `#9a9484`           | field labels (`dt`), Japanese names, attribution, retired items                               |
| Hairline               | `--color-ui-border`                | white 10%           | every border at rest                                                                          |
| Hairline strong        | `--color-ui-border-strong`         | white 20%           | dialog frame; chip hover                                                                      |
| Interaction            | `--color-brand-primary`            | `#d4af37` gold      | links, focus ring, hover borders, pressed/selected chips, the one primary button on a page    |
| Interaction glow       | `--color-brand-primary-glow`       | gold 40%            | `box-shadow` on hovered primary controls and cards                                            |
| Interaction tint       | `--color-brand-primary-muted`      | gold 15%            | background of a selected chip or active dropdown item                                         |
| Identity (Baraba Ride) | `--color-br-accent`                | `#ff5a1f` orange    | product codes, slot and position labels, current segment and tab, active/built status chips   |
| Danger                 | `--color-ui-danger` / `-danger-bg` | `#ff4d4f` / red 10% | destructive buttons, error panels, blocked position cards, "missing" and "in use" check lines |
| Ambient                | `--color-brand-accent`             | `#8b5cf6` violet    | the body wash only. Never on a control.                                                       |

**New rule: gold is the hand, orange is the badge.** Anything that responds to the pointer or keyboard (hover border, focus, pressed, selected, primary action) uses gold. Orange marks _what_ a thing is and _where_ you are (codes, slot labels, the current segment/tab, a status chip), and never changes on hover. This retires the orange hover on BR buttons and picker choices.

**New tokens** to add, so the neutral glass literals stop being guessed per file:

| Token                      | Value                    | Replaces                                                      |
| -------------------------- | ------------------------ | ------------------------------------------------------------- |
| `color.glass.faint`        | `rgba(255,255,255,0.03)` | `0.02` / `0.05` backgrounds in GameSwitcher, `.btn` gradient  |
| `color.glass.soft`         | `rgba(255,255,255,0.08)` | `0.08` / `0.1` hover backgrounds and badge fills              |
| `color.text.bright`        | `#ffffff`                | the `#fff` gradient stops in `.nav-brand`, `.selection-title` |
| `color.ui.ok` _(optional)_ | `#40c8a0` verdigris      | "Available", "Ready to build" if they ever need a colour      |
| `color.scrim`              | `rgba(0,0,0,0.6)`        | `.br-dialog-backdrop`                                         |

Pure black overlays over artwork (`.selection-card-overlay`, `.game-cover-image` drop shadow) stay literal; they darken foreign images, not app surfaces.

### 2.2 Adding a toy line

A new game `xx` adds a `color.xx` group with `accent`, `selStart`, `selMid`, a `.bg-xx-sel` gradient in `index.css`, and nothing else. Its accent takes the identity role in its own views, exactly as `--color-br-accent` does. Gold stays the interaction colour across all games.

### 2.3 Theme

Single dark theme by intent. **New:** set `:root { color-scheme: dark; }` so native selects, date pickers and scrollbars match, and add `<meta name="theme-color" content="#0e1014">` to `index.html`.

## 3. Typography

Three system faces, no web fonts:

| Role    | Token                              | Stack                               | Used for                                                                     |
| ------- | ---------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Display | `--typography-font-family-display` | Bahnschrift / Avenir Next Condensed | `h1`–`h4`, product and part names, build names, dialog titles                |
| Base    | `--typography-font-family-base`    | Segoe UI / system-ui                | everything else                                                              |
| Data    | `--typography-font-family-data`    | Cascadia Mono / Consolas            | codes (`BR-01`), slot and position labels; always uppercase, 0.05em tracking |

### 3.1 Scale and its jobs

The eleven size tokens exist; the **new** part is binding each heading level and component to one of them so nothing falls back to UA defaults.

| Token  | Size   | Job                                                                                                                                                |
| ------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `5xl`  | 3rem   | Selection hero title only (4xl under 768px)                                                                                                        |
| `4xl`  | 2.2rem | Product detail title (`.br-detail-title`)                                                                                                          |
| `3xl`  | 1.8rem | Game page `h1` ("Baraba Ride")                                                                                                                     |
| `2xl`  | 1.5rem | View title (`.br-toolbar h2`: Items, Purchases, Builds, a build's name)                                                                            |
| `xl`   | 1.2rem | Section heading inside a view (`.br-slot-heading`: Cowls, Bumpers…), card names (`.br-product-name`, `.br-part-name`), dialog titles, navbar brand |
| `lg`   | 1.1rem | Segment links, AuthGate copy, sub-section titles (`.br-section-title`)                                                                             |
| `md`   | 1rem   | Input text, `.btn` text                                                                                                                            |
| `base` | 0.9rem | Body, list rows, facts values, descriptions                                                                                                        |
| `sm`   | 0.8rem | Secondary metadata: dates, counts, notes, BR buttons, chips, field labels                                                                          |
| `xs`   | 0.7rem | Codes, slot labels, badges, status chips, attribution                                                                                              |

Drop `display` (4rem, unused) and the `1.6rem` literal on `.game-name` (use `2xl`).

Weights: `semibold` (600) for headings and names, `medium` (500) for buttons, tabs and chips, `normal` for body. `bold` only on the uppercase filter labels. Line height: `relaxed` (1.5) for descriptions, `base` (1.4) elsewhere.

### 3.2 Label grammar

Three small-text treatments, each with one meaning:

- **Code** — data face, `xs`, uppercase, orange. Product codes, slot/position labels. (`.br-code`, `.br-slot`)
- **Status** — base face, `xs`, semibold, uppercase, 0.04em, pill. Active / Retired / Plan / Built. (`.br-status`)
- **Badge** — base face, `xs`, mixed case, hairline border, 10px radius. Type, style, publisher, "Requires login". (`.br-badge`, `.game-tag-badge`)

Field labels in forms and facts (`dt`, dialog `label`) are base face, `sm`, secondary colour, mixed case. Filter group labels are the only uppercase bold dim text.

## 4. Space, shape, depth

### 4.1 Spacing

One scale. **New:** retire the numeric aliases (`spacing.1,2,3,5,6`) and fold their two useful stops into the named scale:

| Token | Value | Use                                                            |
| ----- | ----- | -------------------------------------------------------------- |
| `2xs` | 2px   | chip padding block, status pill padding                        |
| `xs`  | 4px   | gap between stacked small lines, label-to-input                |
| `sm`  | 8px   | gap between badges, buttons in a group, list rows              |
| `md`  | 16px  | card padding, grid gap, toolbar gap, dialog form gap           |
| `lg`  | 24px  | between sections of a view, dialog padding, page header bottom |
| `xl`  | 32px  | page padding (`.main-content`), slot group bottom margin       |
| `2xl` | 48px  | hero bottom, attribution top                                   |
| `3xl` | 64px  | reserved                                                       |

The 6px, 10px and 12px stops become `sm` or `xs` on a case-by-case basis; a control's height is set with `min-height`, not with odd padding.

### 4.2 Radius

| Token   | Value  | Use                                                    |
| ------- | ------ | ------------------------------------------------------ |
| `sm`    | 4px    | icons, inline tags                                     |
| `md`    | 8px    | buttons, inputs, rows, position cards, dropdown items  |
| `badge` | 10px   | badges and status pills; dropdown panel                |
| `lg`    | 16px   | product/part cards, dialogs, AuthGate, selection cards |
| `xl`    | 20px   | "Requires login" pill                                  |
| `full`  | 9999px | filter chips                                           |

Rule of thumb: the bigger the box, the rounder.

### 4.3 Elevation

Three levels, each a surface alpha plus blur, not a shadow:

| Level    | Surface               | Blur | Shadow                        | Examples                                      |
| -------- | --------------------- | ---- | ----------------------------- | --------------------------------------------- |
| Flat     | `--color-bg-surface`  | none | none                          | rows, position cards, BR buttons              |
| Raised   | `--color-bg-surface`  | 8px  | `--shadow-lg` on hover only   | product cards, selection cards, navbar (12px) |
| Floating | `--color-bg-elevated` | 16px | `--shadow-lg` / `--shadow-xl` | GameSwitcher dropdown, dialogs                |

Gold glow (`--shadow-glow-primary`, `--shadow-card-hover`) is reserved for the hovered primary control and hovered raised cards. `--shadow-sm` and `--shadow-md` are unused and can go.

### 4.4 Layering

`--z-index-card` (1) for stretched-link escape hatches inside a card, `--z-index-sticky` (100) for the navbar, `--z-index-modal` (1000) for dialogs. **New:** give the GameSwitcher dropdown its own `popover` level (500) between sticky and modal.

## 5. Motion

Three durations, one easing. `transition.*` tokens are DTCG transition objects that reference `duration.*` and emit `<duration> ease 0s`; use `--transition-*` in `transition:` shorthands and `--duration-*` in `animation` and keyframe timing.

| Token                                       | Value | Use                                                 |
| ------------------------------------------- | ----- | --------------------------------------------------- |
| `--transition-fast` / `--duration-fast`     | 150ms | colour, border, background on hover; chevron rotate |
| `--transition-normal` / `--duration-normal` | 300ms | card lift, glow, `.btn` chrome                      |
| `--transition-slow` / `--duration-slow`     | 500ms | cover image zoom, shimmer sweep, page entrance      |

Keyframes live in `src/styles/animations.css`: `fade-in-up` (cards, staggered by `nth-child` up to a 0.5s cap), `fade-in-down` (hero), `slide-in-down` (dropdown). `prefers-reduced-motion` collapses all of it to `--duration-instant`.

**New rules.** Only _raised_ cards lift (3px, `--duration-normal`); rows and buttons change border and background only. The `.btn` shimmer and 2px lift stay on the shell's primary/secondary actions and are not used inside game views.

## 6. Layout

- **Shell:** sticky navbar (`.navbar`), then `main.main-content` at `max-width: 1200px`, `padding: var(--spacing-xl)`. The selection page widens to 1400px.
- **Game page:** `.br-header` (h1 + segment nav, flex, wrap, bottom hairline), then the segment's `.br-tabs`, then the view. The view opens with a `.br-toolbar` (h2 left, actions right) and closes with `.br-attribution`.
- **Grids:** `repeat(auto-fill, minmax(240px, 1fr))` for product and part cards; `minmax(140px, 1fr)` for gallery shots; `minmax(72px, 1fr)` for variant strips; `minmax(120px, 1fr)` for picker choices. The build layout is a named-area 3-column grid (bumper centred on top, tires flanking cowl and chassis) collapsing to 2 columns at 640px.
- **Reading width:** product detail is capped at 640px; dialogs at 420px (`.br-dialog`) or 640px (`.br-dialog-wide`).
- **Breakpoints:** 768px (navbar stacks, hero shrinks, AuthGate tightens) and 640px (build grid). Phone gutter is the 16px dialog backdrop padding; `.main-content` should drop to `--spacing-md` under 768px (**new**, the 32px gutter is wasteful at 390px).

## 7. Components

Each component names its current class, its states, and any change the system asks for. Classes prefixed `br-` are Baraba Ride's today; the shell-level ones (`.btn`, `.selection-card`, `.navbar`) are shared. **New:** promote the generic BR patterns (button, chip, status, row, card, dialog, state) to un-prefixed shared classes in a `src/styles/components.css` so the next toy line inherits them.

### 7.1 Buttons

| Variant   | Today                                  | System                                                                                                           |
| --------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Primary   | `.btn.primary-action`                  | gold gradient, Ink text, semibold. One per view: Sign in, Record purchase, New build, Mark built, dialog submit. |
| Secondary | `.btn.secondary-action`, BR buttons    | surface glass, hairline, Porcelain text, medium. Hover: gold border + surface-hover. Everything else.            |
| Danger    | `button.br-danger`                     | secondary chrome with red text; hover red border + red 10% fill. Delete, Confirm delete.                         |
| Ghost     | `.br-filter-chip` (pill), `.br-tabs a` | hairline only, secondary text; selected = gold border + gold tint (chips) or orange border + orange tint (tabs). |

Shared rules: `min-height: 40px` (44px under `(pointer: coarse)`), `sm` text in dense lists and `md` in the shell, `--border-radius-md`, `opacity: 0.5; cursor: not-allowed` when disabled, focus from the global ring. The shimmer and lift belong to the shell `.btn` only.

### 7.2 Chips, badges, status

See §3.2. Filter chips are `<button aria-pressed>`; status pills are `<span data-status>` with `active`/`built` in orange tint, `plan`/`retired` on elevated glass with secondary or dim text.

### 7.3 Cards

- **Catalog card** (`.br-product-card`, `.br-part-card`): raised, `lg` radius, `md` padding, image on top at `aspect-ratio: 1` letterboxed on Ink, then code → name → badges → facts (`dl.br-facts` pushed to the bottom with `margin-top: auto`). Product cards are links and lift; part cards are static.
- **Selection card** (`.selection-card`): raised, 320px art header with game gradient, body with name + publisher badge + description. **New:** make it an `article` with a stretched link rather than a `button` wrapping block content.
- **Position card** (`.br-position`): flat, `md` radius, data-face label, named part with 64px thumbnail, check line, actions. `data-state="in-use|missing"` paints the border red. The Choose/Change/Swap button stretches over the card.

### 7.4 Rows and groups

- **Row** (`.br-build-row`, `.br-item-group > summary`, `.br-purchase > summary`): flat, `md` radius, `6px 16px` padding, baseline-aligned flex with `sm`/`md` gaps, trailing metadata pushed right with `margin-left: auto`. Hover: gold border + surface-hover. Stretched name link where the row is a link.
- **Disclosure group** (`<details>`): **new:** add a chevron via `summary::before` (rotates 90° when `[open]`, `--duration-fast`) since `display: flex` removes the native marker.
- **Instance list** (`.br-instance-list`): nested rows separated by top hairlines, `6px` padding, actions right. Retired rows strike the source and dim it.

### 7.5 Forms

Inputs and selects: surface glass, hairline, `md` radius, `4px 6px` padding, `font: inherit`. Labels stack above at `sm` secondary. Errors are `.br-form-error` (red text in red 10% panel, `role="alert"`) placed after the fields and before the actions. **New:** `color-scheme: dark`, and a gold border on `:focus-visible` in addition to the ring.

### 7.6 Dialogs

`.br-dialog` on `.br-dialog-backdrop`: elevated glass, strong hairline, `lg` radius, `lg` padding, `--shadow-xl`, title `h3` at `xl`, form with `md` gaps, actions right-aligned with Cancel first and the primary last. **New:** open with `showModal()` (native backdrop, focus trap, Escape, inert page), close on backdrop click, lock scroll. The mark-built blocked state and the two pickers are the same dialog with a list body.

### 7.7 Confirmations

Destructive and state-changing actions confirm **in place**, never in a dialog: `.br-instance-confirm` is an elevated panel under the row with a sentence naming the consequence, an optional reason field, then Confirm (danger or secondary) and Cancel. Blocked actions show the same panel with the blocker named and linked and only a Close button.

### 7.8 States

| State     | Today                                  | System                                                                                    |
| --------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Loading   | `p.br-loading` / plain text            | **new** `.state` block: centered, secondary text, `xl` top margin; copy "Loading <noun>…" |
| Empty     | `p.br-empty`                           | `.state` with one sentence and, when there is an action, the view's primary button        |
| Not found | `p.br-empty` + fallback list           | `.state` sentence above the list, as today                                                |
| Error     | `p.br-error[role=alert]`               | red panel at the top of the view; stays until the next successful load                    |
| Busy      | `disabled` on every button in the view | keep; add `aria-busy` on the section                                                      |

### 7.9 Images

`CatalogImage` renders a lazy `<img>` or a dashed-hairline placeholder (`.br-image-placeholder`) with `role="img"`; always square, `object-fit: contain`, Ink background. Sizes: card (full width), gallery thumb (140px grid), variant (64px, or 72px grid in strips), picker (64px). Variant crops come from ImageKit transforms; nothing is resized in CSS.

### 7.10 Navigation

- **Segments** (`.br-segments`): `lg` semibold links, 2px bottom border, orange when current.
- **Tabs** (`.br-tabs`): ghost buttons, orange border + tint when current.
- **Filters** (`.br-filters`): labelled chip groups, gold when pressed; "All" is a chip.
- **Back link** (`.br-back-link`): gold text link with a leading arrow, first element of a detail view.
- **GameSwitcher**: glass trigger with 24px icon and chevron; floating dropdown with header, items (32px icons, gold tint when active, 4px slide on hover) and a footer back link.

## 8. Accessibility rules

- Focus is the global 2px gold `:focus-visible` ring with 2px offset; stretched-link cards move the ring to the card with `:has()`. Never `outline: none` without that transfer.
- Contrast: Porcelain, secondary and dim text all clear 4.5:1 on Ink and on the three slate glasses (inherited from Temper's verified values). Gold on Ink is for text ≥ `sm`; orange on Ink is for `xs` uppercase labels only because the data face is heavier.
- Every list has an accessible name (`aria-label` or `aria-labelledby`); every icon-only control has text; every error is `role="alert"`; every toggle is `aria-pressed`; current location is `aria-current="page"`.
- Japanese text carries `lang="ja"`.
- Touch targets: 40px minimum, 44px on coarse pointers, 8px between adjacent targets.
- Motion respects `prefers-reduced-motion`; nothing conveys state by motion alone (status pills and red borders carry it).

## 9. Token discipline

- Edit `design-tokens.json`, never `tokens.css`. The generated file is committed; CI must regenerate and fail on drift (**new**).
- Colour literals are allowed only for neutral white/black glass over foreign imagery. Hue-carrying values are tokens; shades of a token are `color-mix(in srgb, var(--token) N%, transparent | black)`.
- Game colours live under `color.<gameId>` and are consumed only inside that game's views and its selection gradient.
- Font sizes, radii, spacing, shadows and durations come from tokens; no `px`/`rem` literals in component CSS except layout dimensions (grid minimums, image sizes, `max-width`).
- New shared patterns go in `src/styles/components.css` with un-prefixed class names; game stylesheets add only game-specific layout.

## 10. Roadmap

In order of value for effort:

1. Add the token drift check to CI and fix `duration.instant` (review 1, 16).
2. `color-scheme: dark`, `theme-color`, `showModal()` dialogs, disclosure chevrons (review 6–8).
3. Bind the heading scale (§3.1) and unify part/build/item name treatment (review 4–5).
4. Promote BR button, chip, status, row, card, dialog and state classes to shared `components.css`; apply the gold/orange rule (review 2–3).
5. Collapse the spacing scale and prune unused tokens (review 11–12).
6. Touch target minimums and the phone gutter (review 9).
