# Spec Delta

## MODIFIED Requirements

### Requirement: Baraba Ride page lists released products

The Catalog segment of the signed-in Baraba Ride page SHALL list every product in the catalog at `/baraba-ride/catalog`, ordered by product code, each showing its code, English name, product type, style, price, and release date. The list SHALL be rendered from the committed catalog data; the only third-party requests it makes SHALL be image requests to the image CDN.

#### Scenario: Launch lineup shown

- **WHEN** a signed-in user opens `/baraba-ride/catalog`
- **THEN** products BR-01 through BR-10 are listed in code order with their type and style

#### Scenario: Tool has no style

- **WHEN** a product has no style (e.g. BR-10 Fold Colosseum)
- **THEN** it is listed without a style badge

### Requirement: Product detail shows contents

Selecting a product SHALL show its slot-level contents and, when a part mapping exists, the named parts it contains, with a link to the official product page. Each product's detail SHALL have its own URL, `/baraba-ride/catalog/products/<code>`, and SHALL offer a link back to the product list.

#### Scenario: Mapped product

- **WHEN** the user opens a product that has a part mapping
- **THEN** its named cowl, bumper, tires, and chassis (where included) are listed

#### Scenario: Unmapped product

- **WHEN** the user opens a product with no part mapping
- **THEN** only slot-level counts are shown, with no guessed part names

#### Scenario: Product selected from the list

- **WHEN** the user selects BR-07 in the product list
- **THEN** the address becomes `/baraba-ride/catalog/products/BR-07` and that product's detail is shown

#### Scenario: Detail opened by URL

- **WHEN** a signed-in user opens `/baraba-ride/catalog/products/BR-01` directly
- **THEN** the detail of BR-01 is shown

#### Scenario: Back to the list

- **WHEN** the user activates the link back to the product list from a product's detail
- **THEN** the address becomes `/baraba-ride/catalog` and the product list is shown

#### Scenario: Unknown product code

- **WHEN** a signed-in user opens `/baraba-ride/catalog/products/BR-99` and no product has that code
- **THEN** a message naming the code is shown together with the product list

### Requirement: Products show their official shots

Each product in the list SHALL show its first recorded shot as a thumbnail. The product detail view SHALL show all of the product's recorded shots, in order, each with alternative text naming the product and the shot's position. Named parts in the detail view SHALL each show their variant image and colour label when the mapping records them.

#### Scenario: Thumbnail in the list

- **WHEN** a signed-in user opens `/baraba-ride/catalog` with the image CDN configured
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
