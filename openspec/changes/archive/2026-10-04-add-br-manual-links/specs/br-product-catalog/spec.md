# Spec Delta

## ADDED Requirements

### Requirement: Product detail links to the official manual

The product detail view SHALL show a link to the product's official instruction manual when the catalog records one. The link SHALL open the official Bandai page in a new browser tab and SHALL NOT embed or proxy the manual. A product with no recorded manual SHALL show no manual link.

#### Scenario: Product with a manual

- **WHEN** the user opens a product that has a recorded manual URL
- **THEN** an "Instruction manual" link is shown that opens that URL in a new tab

#### Scenario: Product without a manual

- **WHEN** the user opens a product that has no recorded manual URL
- **THEN** no manual link is shown and the rest of the detail view is unchanged
