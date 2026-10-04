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
