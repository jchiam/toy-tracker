# Spec Delta

## Purpose

Serves Baraba Ride catalog images from the image CDN: resolves the asset paths stored in the catalog data to CDN URLs, pictures part variants as crops of a product shot, and falls back to a placeholder when an image is unavailable.

## ADDED Requirements

### Requirement: Catalog image paths resolve to the image CDN

`src/lib/imagekit.ts` SHALL resolve a catalog asset path (`/assets/baraba-ride/...`) to a URL on the ImageKit endpoint named by `VITE_IMAGEKIT_URL_ENDPOINT`. Catalog data SHALL store asset paths only, never CDN URLs. The mapping from asset path to CDN location SHALL be the same one the pipeline uses to upload.

#### Scenario: Product shot resolved

- **WHEN** the endpoint is configured and a product shot path is resolved for the product list
- **THEN** the result is a URL on that endpoint for the same shot, with a transform that caps its width without upscaling

#### Scenario: Catalog data holds no CDN URL

- **WHEN** the committed catalog data is inspected
- **THEN** every image reference is an `/assets/baraba-ride/` path and none contains the CDN host

### Requirement: Variant images are crops of a product shot

The resolver SHALL build a part variant's image URL from its product's shot and the variant's crop box, as a CDN transform that extracts that region, removes the background behind the part, and resizes the result onto a white background. No cropped image file SHALL be stored anywhere.

#### Scenario: Variant crop resolved

- **WHEN** the endpoint is configured and a variant with a shot and crop box is resolved
- **THEN** the result is a URL for that product's shot carrying an extract transform with the crop's x, y, width, and height

#### Scenario: Variant shown without its panel

- **WHEN** a variant image is resolved
- **THEN** its transform removes the background after the extract and places the part on white

### Requirement: Missing images degrade to a placeholder

When the endpoint is not configured, or an image fails to load, the catalog SHALL render a placeholder in the image's place and SHALL NOT request a path that cannot resolve.

#### Scenario: Endpoint not configured

- **WHEN** the catalog renders with `VITE_IMAGEKIT_URL_ENDPOINT` unset
- **THEN** each image position shows a placeholder and no image request is made for catalog shots

#### Scenario: Image fails to load

- **WHEN** a catalog image request fails
- **THEN** the placeholder replaces the broken image
