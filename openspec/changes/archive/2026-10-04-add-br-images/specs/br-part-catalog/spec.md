# Spec Delta

## ADDED Requirements

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
