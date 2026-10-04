# Spec Delta

## ADDED Requirements

### Requirement: Products show their official shots

Each product in the list SHALL show its first recorded shot as a thumbnail. The product detail view SHALL show all of the product's recorded shots, in order, each with alternative text naming the product and the shot's position. Named parts in the detail view SHALL each show their variant image and colour label when the mapping records them.

#### Scenario: Thumbnail in the list

- **WHEN** a signed-in user opens `/baraba-ride` with the image CDN configured
- **THEN** each product card shows that product's first shot

#### Scenario: Gallery in the detail view

- **WHEN** the user opens a product with five recorded shots
- **THEN** all five shots are shown in order

#### Scenario: Named part with a variant

- **WHEN** the user opens a product whose mapping records a variant for a part
- **THEN** that part is listed with its variant image and colour label

#### Scenario: Named part without a variant

- **WHEN** a mapped part has no recorded variant
- **THEN** it is listed by name and quantity as before, with no image or colour

### Requirement: Catalog images load only from allowlisted origins

The catalog SHALL load images only from the app's own origin and the configured image CDN origin. It SHALL NOT load images from Bandai's hosts or any other origin. The production Content Security Policy SHALL allow the image CDN origin in `img-src`.

#### Scenario: CSP compliant

- **WHEN** the catalog renders in production
- **THEN** every image request goes to the app's own origin or the image CDN origin, and none is blocked by the Content Security Policy

#### Scenario: No source-site hotlinks

- **WHEN** the product list, a product detail, and the parts view are rendered
- **THEN** no image request is made to a Bandai host

## MODIFIED Requirements

### Requirement: Baraba Ride page lists released products

The signed-in Baraba Ride page SHALL list every product in the catalog, ordered by product code, each showing its code, English name, product type, style, price, and release date. The list SHALL be rendered from the committed catalog data; the only third-party requests it makes SHALL be image requests to the image CDN.

#### Scenario: Launch lineup shown

- **WHEN** a signed-in user opens `/baraba-ride`
- **THEN** products BR-01 through BR-10 are listed in code order with their type and style

#### Scenario: Tool has no style

- **WHEN** a product has no style (e.g. BR-10 Fold Colosseum)
- **THEN** it is listed without a style badge

## REMOVED Requirements

### Requirement: Product imagery is self-hosted

**Reason**: Official product shots are now served from the image CDN, so imagery is no longer limited to the app's own origin.

**Migration**: Replaced by "Catalog images load only from allowlisted origins". Add the image CDN origin to `img-src` in `vercel.json` and update the e2e check from "no image outside the app origin" to "no image outside the allowlist".
