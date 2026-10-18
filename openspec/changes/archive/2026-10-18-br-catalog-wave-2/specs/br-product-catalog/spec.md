# Spec Delta

## MODIFIED Requirements

### Requirement: Baraba Ride page lists released products

The Catalog segment of the signed-in Baraba Ride page SHALL list every product in the catalog at `/baraba-ride/catalog`, ordered by product code, each showing its code, English name, product type, style, price, and release date. The list SHALL be rendered from the committed catalog data; the only third-party requests it makes SHALL be image requests to the image CDN.

#### Scenario: Launch lineup shown

- **WHEN** a signed-in user opens `/baraba-ride/catalog`
- **THEN** products BR-01 through BR-14 are listed in code order with their type and style

#### Scenario: Second-wave types labelled

- **WHEN** the list shows BR-12 and BR-14
- **THEN** BR-12 carries the type label "Set" and BR-14 the type label "Booster Pack"

#### Scenario: Tool has no style

- **WHEN** a product has no style (e.g. BR-10 Fold Colosseum or BR-14 Random Tire Collection Vol.1)
- **THEN** it is listed without a style badge

### Requirement: Products can be filtered by type and style

The product list SHALL offer filters for product type and for style. The type filter SHALL offer every product type the catalog model defines: Starter Set, Booster Set, Set, Booster Pack, and Tool. Filters SHALL combine, and clearing them SHALL restore the full list.

#### Scenario: Filter by style

- **WHEN** the user selects the Spin style filter
- **THEN** only Spin-style products are shown

#### Scenario: Filter by a second-wave type

- **WHEN** the user selects the Booster Pack type filter
- **THEN** only BR-14 is shown

#### Scenario: No matches

- **WHEN** the active filters match no product
- **THEN** an empty-state message is shown instead of an empty grid
