# Spec Delta

## MODIFIED Requirements

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
