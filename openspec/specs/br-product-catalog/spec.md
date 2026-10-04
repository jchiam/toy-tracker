# br-product-catalog Specification

## Purpose

Lets a signed-in user browse the released Baraba Ride products, filter them by type and style, and see what each box contains.

## Requirements

### Requirement: Baraba Ride page lists released products

The signed-in Baraba Ride page SHALL list every product in the catalog, ordered by product code, each showing its code, English name, product type, style, price, and release date. The list SHALL be rendered from the committed catalog data with no network request to third-party origins.

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

### Requirement: Product imagery is self-hosted

Product presentation SHALL NOT load images from Bandai or any external origin.

#### Scenario: CSP compliant

- **WHEN** the catalog renders in production
- **THEN** no image request is made outside the app's own origin
