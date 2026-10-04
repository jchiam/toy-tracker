# Spec Delta

## ADDED Requirements

### Requirement: Product shots are recorded and published to the image CDN

The pipeline SHALL record, for each product, the official shots listed on its item page as an ordered list of asset paths (`/assets/baraba-ride/products/<code>/<n>.jpg`, numbered from 1 in page order). When image CDN credentials are configured, it SHALL ensure each shot exists on the CDN at the location that path maps to, uploading only shots that are not already present unless re-upload is requested. The source image URL SHALL NOT be persisted.

#### Scenario: Shots recorded

- **WHEN** the pipeline runs against an item page listing five shots
- **THEN** the product record lists five asset paths numbered 1 to 5 in page order

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

### Requirement: Part variant data is validated

Each product-to-part mapping entry MAY carry a variant: a colour label and an image reference made of a shot number and a crop box. Validation SHALL fail when a variant's shot number is not one of its product's recorded shots, when a crop box is not made of non-negative integers with positive width and height, or when the box extends beyond the shot's 1500 by 1500 pixels. Validation SHALL report mapping entries that have no variant image.

#### Scenario: Shot out of range

- **WHEN** a variant references shot 6 of a product with five shots
- **THEN** validation fails naming the product, part, and shot

#### Scenario: Crop outside the shot

- **WHEN** a variant's crop box extends beyond the shot's bounds
- **THEN** validation fails naming the product and part

#### Scenario: Variant image missing

- **WHEN** a mapping entry has no variant image
- **THEN** validation succeeds but lists the entry as lacking an image

## MODIFIED Requirements

### Requirement: Only factual fields are extracted

The pipeline SHALL NOT store image files in the repository and SHALL NOT persist descriptive prose from the source. Images obtained from the source SHALL go only to the image CDN. The pipeline SHALL fetch sequentially with at least one second between requests, including image downloads, and SHALL NOT run in CI or as part of the app build. Image CDN upload credentials SHALL be read only from variables that are not exposed to client code.

#### Scenario: No source assets stored

- **WHEN** the pipeline completes
- **THEN** the repository contains no image files or description text obtained from the source site

#### Scenario: Upload key not exposed

- **WHEN** the app is built
- **THEN** the image CDN private key is not present in the client bundle
