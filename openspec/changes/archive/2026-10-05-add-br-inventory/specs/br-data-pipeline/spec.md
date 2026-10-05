# Spec Delta

## MODIFIED Requirements

### Requirement: Curated parts data is validated against the product catalog

Parts, accessories, and the product-to-contents mapping SHALL be maintained as hand-edited JSON under `src/data/br/`. Validation SHALL fail when a mapping references an unknown product code, part id, or accessory id, when an accessory line carries a variant, or when a part id or accessory id does not start with its own slot or kind, and SHALL report products that have no mapping.

#### Scenario: Unknown reference rejected

- **WHEN** the mapping references a product code, part id, or accessory id that does not exist
- **THEN** validation fails and names the offending reference

#### Scenario: Accessory with a variant rejected

- **WHEN** a mapping line for an accessory id carries a variant
- **THEN** validation fails and names the product and accessory

#### Scenario: Unmapped products reported

- **WHEN** a part-bearing product has no mapping entry
- **THEN** validation succeeds but lists the product as unmapped

#### Scenario: Slot counts still checked for parts only

- **WHEN** a mapping lists parts and a charger for a product
- **THEN** the per-slot part counts are compared against the printed slot contents and the charger line is not counted toward any slot
