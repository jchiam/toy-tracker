# Spec Delta

## MODIFIED Requirements

### Requirement: Product catalog is generated from the official Bandai site

The system SHALL provide a manually run pipeline (`npm run data:br`) that reads the official Baraba Ride lineup page and each linked item page on `toy.bandai.co.jp`, and writes a normalized product catalog to `src/data/br/products.json`. Each product record SHALL contain: BR code, English name, Japanese name, product type (starter set, booster set, set, booster pack, tool), style (upper, spin, dash, or none), price with currency, release date in ISO format, slot-level contents counts, and the source item id and URL.

#### Scenario: Launch lineup generated

- **WHEN** the pipeline runs against the official site
- **THEN** `products.json` contains one record per product code with no duplicates, including BR-01 through BR-14

#### Scenario: Second-wave types recognised

- **WHEN** an item page names its product a セット (e.g. BR-12) or a ブースターパック (e.g. BR-14)
- **THEN** the product is written with the type `set` or `booster-pack` respectively

#### Scenario: Acronym kept in the English name

- **WHEN** the English item page prints a name containing the acronym `DX` in capitals (e.g. `DX STARTER SET`)
- **THEN** the English name is title-cased with `DX` left in capitals (`DX Starter Set`)

#### Scenario: Output is deterministic

- **WHEN** the pipeline runs twice with no upstream change
- **THEN** the second run produces a byte-identical file, sorted by product code

### Requirement: Product shots are recorded and published to the image CDN

The pipeline SHALL record, for each product, the official shots listed on its item page as an ordered list of asset paths (`/assets/baraba-ride/products/<code>/<n>.jpg`, numbered from 1 in page order). A shot SHALL be accepted only when it is served from a Bandai-controlled host: `assets-toy.bandai.co.jp` or `bandai-a.akamaihd.net`. When image CDN credentials are configured, it SHALL ensure each shot exists on the CDN at the location that path maps to, uploading only shots that are not already present unless re-upload is requested. The source image URL SHALL NOT be persisted.

#### Scenario: Shots recorded

- **WHEN** the pipeline runs against an item page listing five shots
- **THEN** the product record lists five asset paths numbered 1 to 5 in page order

#### Scenario: Shots on the second host

- **WHEN** an item page lists its shots on `bandai-a.akamaihd.net` (e.g. BR-11 through BR-14)
- **THEN** the shots are recorded and published exactly as shots on `assets-toy.bandai.co.jp` are

#### Scenario: Shot on an unknown host

- **WHEN** an item page lists a shot on any other host
- **THEN** the run fails naming the product and the images field, and the existing `products.json` is left untouched

#### Scenario: Existing shot skipped

- **WHEN** the pipeline runs and a shot is already on the CDN
- **THEN** that shot is neither downloaded nor uploaded again

#### Scenario: Upload fails

- **WHEN** credentials are configured and a shot cannot be downloaded or uploaded
- **THEN** the run exits non-zero naming the product and shot, and the existing `products.json` is left untouched

#### Scenario: Credentials not configured

- **WHEN** the pipeline runs without image CDN credentials
- **THEN** it reports that uploads were skipped and still writes the product catalog with the asset paths

#### Scenario: Product with no shots

- **WHEN** an item page lists no shots
- **THEN** the run fails naming the product and the missing field
