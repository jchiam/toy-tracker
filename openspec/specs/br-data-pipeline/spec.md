# br-data-pipeline Specification

## Purpose

Where Baraba Ride catalog data comes from: a manually run pipeline that reads the official Bandai site into a committed product catalog, plus hand-curated parts data validated against it.

## Requirements

### Requirement: Product catalog is generated from the official Bandai site

The system SHALL provide a manually run pipeline (`npm run data:br`) that reads the official Baraba Ride lineup page and each linked item page on `toy.bandai.co.jp`, and writes a normalized product catalog to `src/data/br/products.json`. Each product record SHALL contain: BR code, English name, Japanese name, product type (starter set, booster set, tool), style (upper, spin, dash, or none), price with currency, release date in ISO format, slot-level contents counts, and the source item id and URL.

#### Scenario: Launch lineup generated

- **WHEN** the pipeline runs against the official site
- **THEN** `products.json` contains one record per product code with no duplicates, including BR-01 through BR-10

#### Scenario: Output is deterministic

- **WHEN** the pipeline runs twice with no upstream change
- **THEN** the second run produces a byte-identical file, sorted by product code

### Requirement: Pipeline fails loudly on unparseable input

The pipeline SHALL exit with a non-zero status and write no output when a product is missing a required field or the lineup yields zero products.

#### Scenario: Markup change detected

- **WHEN** an item page no longer exposes a parseable price or release date
- **THEN** the run fails naming the product and field, and the existing `products.json` is left untouched

### Requirement: Only factual fields are extracted

The pipeline SHALL NOT download images or persist descriptive prose from the source. It SHALL fetch sequentially with at least one second between requests and SHALL NOT run in CI or as part of the app build.

#### Scenario: No source assets stored

- **WHEN** the pipeline completes
- **THEN** the repository contains no image files or description text obtained from the source site

### Requirement: Curated parts data is validated against the product catalog

Parts and the product-to-parts mapping SHALL be maintained as hand-edited JSON under `src/data/br/`. Validation SHALL fail when a mapping references an unknown product code or part id, and SHALL report products that have no part mapping.

#### Scenario: Unknown reference rejected

- **WHEN** the mapping references a product code or part id that does not exist
- **THEN** validation fails and names the offending reference

#### Scenario: Unmapped products reported

- **WHEN** a part-bearing product has no mapping entry
- **THEN** validation succeeds but lists the product as unmapped
