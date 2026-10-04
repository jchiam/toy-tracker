## Purpose

Persistent navigation chrome for the app: a navbar with a brand link home and a switcher for moving between games without returning to the landing page.

## Requirements

### Requirement: Persistent navbar with brand link

The system SHALL render a navbar on every route, containing the brand mark and app name "The JonZone Toy Zone" as a link to `/`, and an auth section on the right (per the `auth` capability).

#### Scenario: Navbar on landing page

- **WHEN** the user visits `/`
- **THEN** the navbar is visible with the brand link

#### Scenario: Navbar on game pages

- **WHEN** the user visits `/baraba-ride`
- **THEN** the navbar is visible and clicking the brand returns to `/`

### Requirement: Game switcher on game routes

The navbar SHALL include a game switcher that is hidden on `/` and visible on game routes. The switcher SHALL show the current game's icon, and when opened SHALL list every registry game with its icon and name, indicate the active game, and offer a "Back to Selection" link to `/`. Selecting a game SHALL navigate to that game's route without a full page reload. The switcher SHALL close when a selection is made or when the user clicks outside it.

#### Scenario: Hidden on landing

- **WHEN** the user is on `/`
- **THEN** no switcher trigger is rendered

#### Scenario: Select a game from the switcher

- **WHEN** the user is on a game route, opens the switcher, and selects a listed game
- **THEN** the app navigates to that game's route and the dropdown closes

#### Scenario: Back to selection

- **WHEN** the user opens the switcher and activates "Back to Selection"
- **THEN** the app navigates to `/`

#### Scenario: Click outside closes

- **WHEN** the dropdown is open and the user clicks outside it
- **THEN** the dropdown closes without navigating

### Requirement: Per-game icons

Each registry game SHALL provide a self-hosted icon used by the switcher trigger and dropdown list. Icons SHALL be served from the app's own origin (Content Security Policy compliant).

#### Scenario: Icons render in switcher

- **WHEN** the switcher dropdown is open
- **THEN** each listed game shows its icon from the app's own origin
