# br-part-catalog Specification

## Purpose

Lets a signed-in user browse Baraba Ride parts by slot and see which products contain each part.

## Requirements

### Requirement: Parts are browsable by slot

The Baraba Ride page SHALL provide a parts view listing every catalogued part grouped by slot: cowl, bumper, tire, chassis. Each part SHALL show its name and slot.

#### Scenario: Parts grouped

- **WHEN** a signed-in user opens the parts view
- **THEN** parts appear under their slot headings, with slots that have no parts omitted

### Requirement: Parts show which products contain them

Each part SHALL list the products that include it, with the quantity per product, linking to those products.

#### Scenario: Part availability

- **WHEN** the user views a part contained in one or more mapped products
- **THEN** those products are listed with quantities

#### Scenario: Part with no known product

- **WHEN** a part is not referenced by any product mapping
- **THEN** it is shown with a "source product unknown" note

### Requirement: Parts show their variants across releases

Each part in the parts view SHALL show one variant per product that contains it and records a variant, as an image with the variant's colour label and the product's code, linking to that product. Variants SHALL be ordered by product code. A part's first variant image SHALL serve as the part's own image.

#### Scenario: Part released in several colours

- **WHEN** the user views a part that three mapped products contain, each with a recorded variant
- **THEN** three variant images are shown in product-code order, each labelled with its colour and product code

#### Scenario: Variant links to its product

- **WHEN** the user selects a variant
- **THEN** the detail view of the product that variant ships in is shown

#### Scenario: Part with no recorded variant

- **WHEN** no mapping entry for a part records a variant
- **THEN** the part is shown with a placeholder image and its product list as before
