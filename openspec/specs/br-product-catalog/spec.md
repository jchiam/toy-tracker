# br-product-catalog Specification

## Purpose

Lets a signed-in user browse the released Baraba Ride products, filter them by type and style, and see what each box contains.

## Requirements

### Requirement: Baraba Ride page lists released products

The signed-in Baraba Ride page SHALL list every product in the catalog, ordered by product code, each showing its code, English name, product type, style, price, and release date. The list SHALL be rendered from the committed catalog data; the only third-party requests it makes SHALL be image requests to the image CDN.

#### Scenario: Launch lineup shown

- **WHEN** a signed-in user opens `/baraba-ride`
- **THEN** products BR-01 through BR-10 are listed in code order with their type and style

#### Scenario: Tool has no style

- **WHEN** a product has no style (e.g. BR-10 Fold Colosseum)
- **THEN** it is listed without a style badge

### Requirement: Products can be filtered by type and style

The product list SHALL offer filters for product type and for style. Filters SHALL combine, and clearing them SHALL restore the full list.

#### Scenario: Filter by style

- **WHEN** the user selects the Spin style filter
- **THEN** only Spin-style products are shown

#### Scenario: No matches

- **WHEN** the active filters match no product
- **THEN** an empty-state message is shown instead of an empty grid

### Requirement: Product detail shows contents

Selecting a product SHALL show its slot-level contents and, when a part mapping exists, the named parts it contains, with a link to the official product page.

#### Scenario: Mapped product

- **WHEN** the user opens a product that has a part mapping
- **THEN** its named cowl, bumper, tires, and chassis (where included) are listed

#### Scenario: Unmapped product

- **WHEN** the user opens a product with no part mapping
- **THEN** only slot-level counts are shown, with no guessed part names

### Requirement: Product detail links to the official manual

The product detail view SHALL show a link to the product's official instruction manual when the catalog records one. The link SHALL open the official Bandai page in a new browser tab and SHALL NOT embed or proxy the manual. A product with no recorded manual SHALL show no manual link.

#### Scenario: Product with a manual

- **WHEN** the user opens a product that has a recorded manual URL
- **THEN** an "Instruction manual" link is shown that opens that URL in a new tab

#### Scenario: Product without a manual

- **WHEN** the user opens a product that has no recorded manual URL
- **THEN** no manual link is shown and the rest of the detail view is unchanged

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
