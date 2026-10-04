## Purpose

Lets the user pick which toy line ("game") to work in. Defines the game registry (which toy lines the app supports) and the landing page that presents them as selectable cards.

## Requirements

### Requirement: Game registry lists supported toy lines

The system SHALL maintain a registry of supported toy lines as the single source of truth for the landing page and routing. The initial registry SHALL contain exactly one game: Baraba Ride (publisher Bandai). Each registry entry SHALL provide a stable id, display name, route path, publisher, and a one-line description of what the user tracks for that game.

#### Scenario: Registry drives the landing page

- **WHEN** the landing page renders
- **THEN** it shows one selection card per registry entry, in registry order, with no hard-coded game list in the page itself

#### Scenario: Initial games present

- **WHEN** the registry is loaded
- **THEN** it contains Baraba Ride with id `br` and route `/baraba-ride`

### Requirement: Landing page presents selectable game cards

The landing page at `/` SHALL show a hero heading identifying the app and a grid of game selection cards. Each card SHALL display the game's name, publisher badge, and description, with a visually distinct per-game header treatment following the established selection-card design language (gradient header, hover emphasis, staggered entrance).

#### Scenario: Landing page renders the registry

- **WHEN** the user visits `/`
- **THEN** the page shows a hero heading and a card for Baraba Ride showing name, publisher, and description

#### Scenario: Cards are keyboard accessible

- **WHEN** the user tabs through the landing page
- **THEN** each game card is focusable and activatable via keyboard (rendered as a button or link, not a bare div)

### Requirement: Selecting a game navigates to its page

Activating a game card while signed in SHALL navigate to that game's route without a full page reload. Activating a card while signed out SHALL start Google sign-in that returns to that game's route. While signed out, each card SHALL display a "Requires Login" badge. Each game route SHALL render a page scoped to that game, for the route itself and for every path beneath it; until game-specific features exist, a placeholder page showing the game's name satisfies this. A game page MAY move a signed-in user from its route to a default view beneath it.

#### Scenario: Navigate to Baraba Ride

- **WHEN** a signed-in user activates the Baraba Ride card
- **THEN** the app navigates to `/baraba-ride` and shows the Baraba Ride page at its default view

#### Scenario: Signed-out activation starts sign-in

- **WHEN** a signed-out user activates a game card
- **THEN** Google sign-in starts with a redirect back to that game's route, and no in-app navigation occurs

#### Scenario: Requires Login badges

- **WHEN** a signed-out user views the landing page
- **THEN** every game card shows a "Requires Login" badge; signed in, no badge appears

#### Scenario: Direct URL access

- **WHEN** the user opens `/baraba-ride` directly
- **THEN** the app renders the Baraba Ride page (SPA rewrite), showing game content when signed in or the auth gate when signed out

#### Scenario: Direct URL access beneath a game route

- **WHEN** the user opens a path beneath a game's route directly, such as `/baraba-ride/catalog/parts`
- **THEN** the app renders that game's page (SPA rewrite), showing game content when signed in or the auth gate when signed out

### Requirement: Game art degrades gracefully

Game card artwork SHALL be served from the app's own origin only. When a registry entry has no cover image, or its image fails to load, the card SHALL still render its per-game gradient header, name, publisher, and description, and remain selectable.

#### Scenario: Missing cover image

- **WHEN** a registry entry has no cover image or its image fails to load
- **THEN** the card renders with its gradient header only and remains fully functional

#### Scenario: No external image origins

- **WHEN** the landing page loads in production
- **THEN** no image requests are made to origins outside the deployed app (Content Security Policy compliant)

### Requirement: Selection cards display official cover art

Each selection card SHALL display a self-hosted cover image sourced from the game's publisher: for Baraba Ride, the official key visual from the Bandai series site. Cover assets SHALL be web-optimized (WebP, sized for the card header at 2x DPR) with content unaltered beyond encoding and scaling — no cropping, recoloring, or compositing.

#### Scenario: Cards render cover art

- **WHEN** the landing page loads
- **THEN** the Baraba Ride card shows its cover image over the gradient header

#### Scenario: Assets are optimized

- **WHEN** a cover asset is served
- **THEN** it is WebP-encoded and no larger than needed for the 2x-DPR card header (≤ ~1000 px on the long edge)

### Requirement: Landing page shows licensing attribution

The landing page SHALL display a copyright attribution notice crediting `©BANDAI`, visible without interaction. Attribution SHALL appear on every render of the landing page, including when cover images are absent or fail to load.

#### Scenario: Attribution visible

- **WHEN** the user visits `/`
- **THEN** a footer notice shows `©BANDAI`

#### Scenario: Attribution survives image failure

- **WHEN** cover images fail to load
- **THEN** the attribution notice is still rendered
