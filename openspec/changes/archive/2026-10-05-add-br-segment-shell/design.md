# Design

## Context

See `proposal.md` for motivation. The current state that shapes the approach:

- `src/App.tsx` mounts one route per registry game at `game.path` (`/baraba-ride`). `game.path` is also the link target in `GameSwitcher` and `SelectionPage`, the prefix `GameSwitcher` uses to find the active game (`pathname.startsWith(game.path)`), and the post-sign-in redirect.
- `src/pages/baraba-ride/BrPage.tsx` gates on the session, then picks a view from the query string (`?view=parts`, `?product=<code>`). `ProductCatalog`, `ProductDetail`, and `PartCatalog` link with `to={{ search: ... }}`.
- Product filters (type, style) are component state, not part of the URL.
- `vercel.json` rewrites every path to `index.html`, so deeper paths already resolve in production.
- Supabase holds only `user_profiles`. No per-user Baraba Ride data exists.

This document has two parts. **Decisions** covers how this change is built. **Reference model** records the three-segment design agreed during exploration, which the later Inventory and Builds changes build on; nothing in it is implemented here.

## Goals / Non-Goals

**Goals:**

- A URL shape that can address every view the three segments will need, including a saved build.
- Segment navigation and Catalog sub-navigation in place, with Catalog behaving as it does today.
- Earlier query-string links still reach the right view.
- A written reference for the Inventory and Builds changes.

**Non-Goals:**

- Any Supabase table, service, or data fetching.
- Owning products, parts on hand, the build editor, or "Owned" badges in Catalog.
- Making segments a concept of the shared game registry. They stay local to Baraba Ride until a second toy line needs them.
- Putting product filters in the URL.
- Returning a signed-out user to the exact deep link after sign-in (see Risks).

## Decisions

### D1. Nested paths instead of more query parameters

Views become paths under `/baraba-ride/`:

```
/baraba-ride                          -> /baraba-ride/catalog
/baraba-ride/catalog                  product list
/baraba-ride/catalog/products/:code   product detail
/baraba-ride/catalog/parts            parts view
/baraba-ride/inventory                Inventory (placeholder)
/baraba-ride/builds                   Builds (placeholder)
```

Reserved for the later changes: `/baraba-ride/inventory/parts`, `/baraba-ride/builds/new`, `/baraba-ride/builds/:id`.

Alternative considered: keep one route and add `?segment=`. It is a smaller diff, but three interacting parameters produce invalid combinations (`?segment=inventory&product=BR-01`) that each need handling, and a saved build has no clean address. This reverses the "game keeps one route" rule, so `CLAUDE.md` is updated in this change.

### D2. The registry path stays `/baraba-ride`; the route gains a splat in `App.tsx`

`App.tsx` mounts each game at `` `${game.path}/*` `` instead of `game.path`. `Game.path` keeps its value and meaning (the game's base path), so `GameSwitcher`, `SelectionPage`, the sign-in redirect, `games.test.ts`, and the `game-selection` registry requirement are untouched. `GameSwitcher` already matches by prefix, so it stays active on sub-paths.

Alternative considered: change the registry value to `/baraba-ride/*`. That would break every use of `game.path` as a link target.

### D3. Sign-in gate first, routes second

`BrPage` keeps its current order: loading message, then `AuthGate`, then content. The nested routes and redirects live inside the signed-in branch. A signed-out user therefore sees the gate at whatever address they opened, with no redirect, and existing signed-out tests (`tests/smoke.spec.ts`) keep passing unchanged.

### D4. Shell and segment structure

```
BrPage            session gate (unchanged)
  BrShell         h1, segment navigation, nested routes, attribution footer
    index         legacy redirect (D6), else -> catalog
    catalog/*     CatalogSegment: Products | Parts sub-navigation
        index             ProductCatalog
        products/:code    ProductDetail, or "No product with code X." + ProductCatalog
        parts             PartCatalog
        *                 -> catalog
    inventory     SegmentPlaceholder "Inventory"
    builds        SegmentPlaceholder "Builds"
    *             -> catalog
```

- Segment navigation uses `NavLink`, which sets `aria-current="page"` on a prefix match, so Catalog stays current on product detail and parts.
- In the sub-navigation, Products is current on `/catalog` and `/catalog/products/*`; Parts on `/catalog/parts`. This matches today's behaviour, where Products is current on a product's detail.
- The attribution footer stays in the shell and appears under every segment.
- The existing `.br-tabs` style is reused for the sub-navigation. The segment navigation gets its own class and must read as the primary level, using existing design tokens only.
- All redirects use `replace`, so the back control does not bounce.
- Sub-paths of Inventory and Builds are not defined yet and fall through to the Catalog redirect. The later changes add them.

Segment components stay in `src/pages/baraba-ride/`. They are small in this change; splitting into sub-directories can wait until Inventory and Builds have real content.

### D5. One module builds Baraba Ride paths

A new `src/lib/br/routes.ts` exports the base path and path builders (catalog, product by code, parts, inventory, builds). Components link with these absolute paths instead of relative `to` values or string literals.

Why absolute: the catalog components are rendered in tests and stories under a bare `MemoryRouter`, where relative links resolve against whatever the test's location happens to be. Absolute paths behave the same everywhere.

The base is a constant in that module rather than a lookup in `GAMES`, because `games.ts` lazily imports `BrPage`, and `BrPage` would import the routes module back. A unit test asserts the constant equals the registry's path for `br`, so the two cannot drift silently.

### D6. Legacy query links are redirected in the index route

The index route under `/baraba-ride` reads the query string once: `product` leads to the product's path, otherwise `view=parts` leads to the parts path, otherwise Catalog. Product wins when both are present, matching today's precedence in `BrCatalog`. The redirect is client-side only; no `vercel.json` change is needed.

An unknown code carried over by the redirect lands on the product path and gets the same "No product with code X." message plus the list that the query form shows today.

### D7. Placeholders are static

`SegmentPlaceholder` renders a heading and one sentence. It does not import the Supabase client, so the placeholders cannot make data requests.

## Reference model (for the Inventory and Builds changes)

### Segments and the loop

```
 CATALOG (static, same for all)    INVENTORY (per user)       BUILDS (per user)
 +-------------------------+       +--------------------+     +-------------------+
 | Product  BR-01          |  own  | Owned product x qty|     | Build "Red Dash"  |
 |   contains              |------>|   derives          |     |  7 positions      |
 | Part variant            |       | Parts on hand      |---->|  each a variant   |
 |  (part + colour + box)  |       |  (variant x qty)   | use |                   |
 +-------------------------+       +--------------------+     +-------------------+
            ^                                                          |
            |              missing part: "which box has it?"           |
            +----------------------------------------------------------+
```

User flows:

- **Bought a box**: Catalog product detail, "I own this", Inventory shows the box and its parts.
- **What do I have**: Inventory parts, grouped by slot, per variant.
- **Make a machine**: Builds, new build, pick a part per position, save. A part not owned links to the Catalog products that contain it.
- **Browse with context**: Catalog shows "Owned xN" on products and "On hand N" on parts.

### Confirmed decisions

- **Ownership unit**: the user records products owned, with a quantity. Parts on hand are derived from `product-parts.json`. Loose-part adjustments (lost, broken, traded) are a possible later overlay. Mapping coverage is sufficient: 9 of 10 products are mapped, and the unmapped one (BR-10) is a tool with no parts.
- **Machine**: 1 bumper, 1 cowl, 1 chassis, and 4 tyres held by position (front-left, front-right, rear-left, rear-right). The bumper side is the front.
- **Why tyres are positional**: tyres ship as `h36` x4, `c36` x4, or `rw32` x2 with `lw32` x2, so a build cannot store "one tyre part x4".
- **Chassis is the scarce part**: only starter sets BR-01 to BR-06 contain one; booster sets BR-07 to BR-09 do not. Chassis owned caps how many machines can be built at once.
- **A position holds a variant**: a part id plus the product code it came from. Availability is counted per variant.
- **Build status**: a build is a `plan` or `built`.
  - `available = owned (derived from products) - used by built builds`. It is computed, never stored.
  - Marking a build as built is blocked unless all 7 positions are filled with free parts. The block lists the reasons, e.g. "chassis in use by Red Dash".
  - "Take apart" returns a built build to a plan and frees its parts.
  - A plan gets a soft check only. Each position shows one of: available; in use by a named built build; not owned, with links to the Catalog products containing it.
- **Inventory parts view** shows owned, in builds, and free per variant.

### Build editor layout

Front at the top, bumper leading:

```
                             FRONT
               [    bumper    ]
   FL [tyre]                    FR [tyre]
               [     cowl     ]
               [    chassis   ]
   RL [tyre]                    RR [tyre]
                             REAR
   [Fill all four tyres]
```

Tab order: bumper, FL, FR, cowl, chassis, RL, RR.

### Data sketch

Row-level security scoped by `auth.uid()::text`, as `user_profiles` does; `profile_id` references `user_profiles(id)`.

```
br_owned_products (profile_id, product_code, quantity)
br_builds         (id, profile_id, name, status, created_at, ...)   status: 'plan' | 'built'
br_build_parts    (build_id, position, part_id, product_code)
                  position: cowl | chassis | bumper | tire_fl | tire_fr | tire_rl | tire_rr
                  primary key (build_id, position)
```

Catalog ids (`BR-01`, `bumper:dual-blade`) are stored as text with no foreign key, because the catalog is static JSON. The catalog types already treat these ids as stable.

## Risks / Trade-offs

- **Sign-in from a deep link returns to the game root, not the deep link** → `App.tsx` passes `game.path` as the sign-in redirect, so a signed-out user who opens `/baraba-ride/builds` and signs in lands on Catalog. Accepted for this change; with only placeholders behind the other segments the loss is small. Revisit in the Builds change, where build links are worth returning to.
- **Tests that render `BrPage` in a bare `MemoryRouter` stop matching** → nested routes resolve relative to a parent route. `BrPage.test.tsx` must mount `BrPage` under a `/baraba-ride/*` route, as `App.tsx` does.
- **Hard-coded base path in `routes.ts` could drift from the registry** → a unit test compares the two (D5).
- **Bookmarks in the old form** → covered by the redirect (D6). Old links opened while signed out lose their query after sign-in and land on Catalog; same cause as the first risk.
- **Two navigation rows on narrow screens** → both rows wrap. The header already uses `flex-wrap`. Checked manually at a phone width in the integration task.
- **The reference model may change before it is built** → it records decisions as of this change. The Inventory and Builds proposals own their final specs and may revise it.

## Migration Plan

Client-only change, shipped in one deploy. No data migration. Rollback is a revert of the change. The earlier query-string links work again. Links in the new path form would then match no route and show only the navbar, which is acceptable for a single-user app where such links exist only in that user's own bookmarks.

## Open Questions

None affect this change. These defaults were proposed during exploration and are not yet confirmed; they are to be settled in the Inventory and Builds proposals:

- May any tyre go in any position, with no left/right check for `rw32` and `lw32`? (Proposed: yes. The catalog has no side data.)
- Is each plan checked alone against availability, so plans do not compete with each other? (Proposed: yes.)
- May an owned product count be lowered when a built build would then fall short? (Proposed: yes, and that build is flagged "missing parts".)
- May a built build be edited in place? (Proposed: yes, with the picker limited to free parts plus the ones it already holds.)
- Are availability rules enforced in the app only, or also as database constraints? (Proposed: app only.)
- What do RW and LW stand for on the 32 tyres? Not recorded in the catalog.
