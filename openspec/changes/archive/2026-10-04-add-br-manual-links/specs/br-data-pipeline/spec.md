# Spec Delta

## ADDED Requirements

### Requirement: Official manual link is recorded when present

The pipeline SHALL record, for each product whose item page links an official instruction manual, that link as an optional manual URL on the product record. A product whose item page has no manual link SHALL be written without the field and SHALL NOT fail the run. The pipeline SHALL NOT request the manual URL or store the manual document.

#### Scenario: Manual link recorded

- **WHEN** the pipeline reads an item page that links an instruction manual (e.g. BR-01)
- **THEN** that product's record contains the manual URL on `toy.bandai.co.jp`

#### Scenario: Product without a manual

- **WHEN** an item page has no manual link
- **THEN** the product is written without a manual URL and the run succeeds

#### Scenario: Unrecognized manual link

- **WHEN** an item page's manual link does not point to the official manual location on `toy.bandai.co.jp`
- **THEN** the run fails naming the product and field, and the existing `products.json` is left untouched

#### Scenario: Manual document not stored

- **WHEN** the pipeline completes
- **THEN** the repository contains no manual document obtained from the source site
