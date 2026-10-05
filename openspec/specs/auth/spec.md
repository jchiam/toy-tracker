## Purpose

User identity and session management: Google sign-in via Supabase, session lifecycle across reloads and tabs, in-page gating of game content, and the per-user profile row that anchors row-level security for all future per-game data.

## Requirements

### Requirement: Google OAuth is the only sign-in method

The system SHALL authenticate users exclusively through Supabase's Google OAuth flow. No email/password, magic-link, or other provider UI SHALL be offered. Starting sign-in SHALL accept an optional app path and redirect the user back to that path on the app's own origin after authentication; without a path, the user returns to the origin root.

#### Scenario: Sign-in round trip

- **WHEN** a signed-out user starts Google sign-in and completes the Google consent flow
- **THEN** they return to the app on the same origin, signed in, with their session active

#### Scenario: Sign-in preserves intent

- **WHEN** sign-in is started with a game path (e.g. `/baraba-ride`)
- **THEN** the OAuth redirect returns the user to that path after authentication

### Requirement: Session persists and stays current

The system SHALL persist the session in browser storage, restore it on page load, refresh tokens automatically before expiry, and reflect auth state changes (including sign-out and changes from other tabs) without a page reload. While the initial session check is in flight, the UI SHALL present a distinct loading state rather than treating the user as signed out.

#### Scenario: Session survives reload

- **WHEN** a signed-in user reloads the app
- **THEN** they remain signed in without re-authenticating

#### Scenario: Sign out clears state

- **WHEN** a signed-in user signs out
- **THEN** the session is cleared and the UI returns to its signed-out presentation immediately

#### Scenario: Auth check in progress

- **WHEN** the app is still resolving the persisted session
- **THEN** pages show an authentication-loading indicator instead of the signed-out gate

### Requirement: Navbar shows auth controls

The navbar SHALL show a "Sign In with Google" action when signed out, and the signed-in user's email plus a "Sign Out" action when signed in.

#### Scenario: Signed out

- **WHEN** no session exists
- **THEN** the navbar shows a "Sign In with Google" button and no sign-out control

#### Scenario: Signed in

- **WHEN** a session exists
- **THEN** the navbar shows the user's email and a "Sign Out" button, and no sign-in control

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

### Requirement: Per-user profile row with owner-scoped RLS

The database SHALL have a `user_profiles` table keyed by the Supabase auth user id stored as TEXT, with row-level security enabled and select/insert/update/delete policies each scoped to `auth.uid()::text`. Profile rows SHALL be created lazily by the app on first write, not by a signup trigger. Future per-game tables SHALL reference `user_profiles(id)` and scope their policies the same way.

#### Scenario: Own row accessible

- **WHEN** an authenticated user reads or writes their `user_profiles` row
- **THEN** the operation succeeds

#### Scenario: Foreign rows invisible

- **WHEN** an authenticated user queries `user_profiles`
- **THEN** rows belonging to other users are neither returned nor writable

### Requirement: CSP admits Google auth origins

The production Content Security Policy SHALL allow `https://accounts.google.com` in `script-src`, `connect-src`, and `frame-src`, and `https://*.googleusercontent.com` in `img-src`, alongside the Supabase project origin in `connect-src`.

#### Scenario: OAuth not blocked in production

- **WHEN** a user signs in on the deployed app
- **THEN** no request in the Google OAuth flow or to Supabase auth endpoints is blocked by CSP
