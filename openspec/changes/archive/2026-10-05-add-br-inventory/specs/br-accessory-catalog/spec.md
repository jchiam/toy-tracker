# Spec Delta

## Purpose

Catalogues the non-part box contents that the app chooses to track bespokely (chargers, colosseums) and defines that only contents with a mapping entry are trackable.

## ADDED Requirements

### Requirement: Accessories are catalogued by kind

Trackable non-part contents SHALL be maintained as hand-edited accessory entries under `src/data/br/`, each with a stable id of the form `<kind>:<slug>`, its kind, and English and Japanese names. The initial kinds SHALL be `charger` and `colosseum`. Accessory kinds SHALL never collide with part slots.

#### Scenario: Charger entry

- **WHEN** the accessories data is loaded
- **THEN** it contains a charger accessory with id `charger:<slug>` and both names

#### Scenario: Colosseum entry

- **WHEN** the accessories data is loaded
- **THEN** it contains the Fold Colosseum as an accessory with id `colosseum:<slug>`

### Requirement: Mapping entries may reference accessories

A product's mapping entry SHALL be able to list accessory ids with quantities alongside part ids. Accessory lines SHALL NOT carry variants or variant images. A product whose printed contents are only accessories, such as BR-10, SHALL be mappable.

#### Scenario: Starter set with charger

- **WHEN** a starter set's mapping lists `charger:<slug>` with quantity one
- **THEN** resolving that product's contents yields its parts plus one charger

#### Scenario: BR-10 mapped as a colosseum

- **WHEN** BR-10's mapping lists one `colosseum:<slug>` and no parts
- **THEN** resolving BR-10's contents yields exactly one colosseum

### Requirement: Only mapped contents are trackable

Contents printed on a product page that have no corresponding mapping line SHALL NOT be trackable. The generic `body` contents label SHALL NOT become an item; a product listing it is tracked only through a bespoke accessory line. Stickers SHALL NOT be catalogued.

#### Scenario: Sticker not an item

- **WHEN** a product's printed contents include stickers and its mapping lists no sticker line
- **THEN** no item exists for the stickers and the product's resolved contents omit them

#### Scenario: Body label not an item

- **WHEN** a product's printed contents are `body: 1` and it has no mapping entry
- **THEN** the product's resolved contents are empty and it is not offered for purchase recording

### Requirement: Catalog parts view excludes accessories

The parts view at `/baraba-ride/catalog/parts` SHALL continue to list only parts in the four slots; accessories SHALL NOT appear there.

#### Scenario: Charger absent from parts view

- **WHEN** a signed-in user opens the parts view
- **THEN** no charger or colosseum is listed
