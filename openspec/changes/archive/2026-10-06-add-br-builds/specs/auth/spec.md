# Spec Delta

## MODIFIED Requirements

### Requirement: Game pages are auth-gated in-page

Game routes SHALL always mount (no router-level guards). When signed out, a game page SHALL render a sign-in gate — a welcome heading, a short explanation of cross-device sync, and a "Sign In with Google" button that starts OAuth returning to the address the user opened, path and query string included — instead of game content.

#### Scenario: Signed-out direct access

- **WHEN** a signed-out user opens a game route directly
- **THEN** the page renders the sign-in gate, not game content

#### Scenario: Signed-in access

- **WHEN** a signed-in user opens a game route
- **THEN** the game content renders with no gate

#### Scenario: Sign-in returns to a deep link

- **WHEN** a signed-out user opens the URL of a build, such as `/baraba-ride/builds/<id>`, and signs in from the gate
- **THEN** sign-in is started with that path as its return address, not `/baraba-ride`

#### Scenario: Sign-in keeps the query string

- **WHEN** a signed-out user opens `/baraba-ride?product=BR-01` and signs in from the gate
- **THEN** sign-in is started with `/baraba-ride?product=BR-01` as its return address
