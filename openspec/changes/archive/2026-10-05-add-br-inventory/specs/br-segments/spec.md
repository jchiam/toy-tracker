# Spec Delta

## MODIFIED Requirements

### Requirement: Catalog offers Products and Parts views

Within the Catalog segment the page SHALL show a sub-navigation offering Products and Parts and SHALL indicate the current one. Products SHALL be indicated on both the product list and a product's detail. The sub-navigation SHALL NOT appear in the Builds segment. Inventory has its own sub-navigation per "Inventory offers Items and Purchases views".

#### Scenario: Products current on the list

- **WHEN** a signed-in user opens `/baraba-ride/catalog`
- **THEN** the sub-navigation shows Products as current

#### Scenario: Products current on a product detail

- **WHEN** a signed-in user opens `/baraba-ride/catalog/products/BR-01`
- **THEN** the sub-navigation shows Products as current

#### Scenario: Parts current on the parts view

- **WHEN** the user selects Parts in the sub-navigation
- **THEN** the address becomes `/baraba-ride/catalog/parts` and Parts is shown as current

#### Scenario: Absent outside Catalog

- **WHEN** a signed-in user opens the Builds segment
- **THEN** no Products / Parts sub-navigation is shown

## REMOVED Requirements

### Requirement: Segments without features show a placeholder

**Reason**: Inventory now has features; only Builds remains a placeholder, covered by the new "Builds segment shows a placeholder" requirement.
**Migration**: None for users. Tests asserting the Inventory placeholder are replaced by Inventory view tests.

## ADDED Requirements

### Requirement: Builds segment shows a placeholder

Until its features exist, the Builds segment SHALL show a heading naming the segment and a message that the segment is not available yet. It SHALL NOT read or store any user data.

#### Scenario: Builds placeholder

- **WHEN** a signed-in user opens `/baraba-ride/builds`
- **THEN** a heading "Builds" and a not-available-yet message are shown

#### Scenario: No data requests

- **WHEN** the Builds placeholder is shown
- **THEN** the page makes no request for user data

### Requirement: Inventory offers Items and Purchases views

Within the Inventory segment the page SHALL show a sub-navigation offering Items and Purchases and SHALL indicate the current one. Items SHALL be served at `/baraba-ride/inventory` and Purchases at `/baraba-ride/inventory/purchases`. The sub-navigation SHALL NOT appear in other segments.

#### Scenario: Items current by default

- **WHEN** a signed-in user opens `/baraba-ride/inventory`
- **THEN** the sub-navigation shows Items as current

#### Scenario: Switch to Purchases

- **WHEN** the user selects Purchases in the sub-navigation
- **THEN** the address becomes `/baraba-ride/inventory/purchases`, Purchases is shown as current, and the page is not reloaded

#### Scenario: Absent outside Inventory

- **WHEN** a signed-in user opens the Catalog or Builds segment
- **THEN** no Items / Purchases sub-navigation is shown

#### Scenario: Unknown inventory path

- **WHEN** a signed-in user opens `/baraba-ride/inventory/nowhere`
- **THEN** the address becomes `/baraba-ride/inventory` and the Items view is shown
