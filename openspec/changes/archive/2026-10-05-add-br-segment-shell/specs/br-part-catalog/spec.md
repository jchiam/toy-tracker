# Spec Delta

## MODIFIED Requirements

### Requirement: Parts are browsable by slot

The Catalog segment of the Baraba Ride page SHALL provide a parts view at `/baraba-ride/catalog/parts` listing every catalogued part grouped by slot: cowl, bumper, tire, chassis. Each part SHALL show its name and slot.

#### Scenario: Parts grouped

- **WHEN** a signed-in user opens the parts view
- **THEN** parts appear under their slot headings, with slots that have no parts omitted

#### Scenario: Parts view opened by URL

- **WHEN** a signed-in user opens `/baraba-ride/catalog/parts` directly
- **THEN** the parts view is shown

### Requirement: Parts show which products contain them

Each part SHALL list the products that include it, with the quantity per product, linking to those products.

#### Scenario: Part availability

- **WHEN** the user views a part contained in one or more mapped products
- **THEN** those products are listed with quantities

#### Scenario: Part with no known product

- **WHEN** a part is not referenced by any product mapping
- **THEN** it is shown with a "source product unknown" note

#### Scenario: Product link opens its detail

- **WHEN** the user selects BR-03 in a part's product list
- **THEN** the address becomes `/baraba-ride/catalog/products/BR-03` and that product's detail is shown
