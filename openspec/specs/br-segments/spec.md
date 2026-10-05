# br-segments Specification

## Purpose

Organises the signed-in Baraba Ride page into three segments — Catalog, Inventory, and Builds — each with its own URL, and provides the navigation between them.

## Requirements

### Requirement: Baraba Ride page offers three segments

The signed-in Baraba Ride page SHALL show a segment navigation offering Catalog, Inventory, and Builds, in that order, on every Baraba Ride view. The navigation SHALL indicate the current segment. Selecting a segment SHALL open it without a full page reload.

#### Scenario: Navigation present in every segment

- **WHEN** a signed-in user opens any of the Catalog, Inventory, or Builds segments
- **THEN** the segment navigation is shown with Catalog, Inventory, and Builds in that order

#### Scenario: Current segment indicated

- **WHEN** a signed-in user is viewing a product's detail in Catalog
- **THEN** Catalog is indicated as the current segment and the other two are not

#### Scenario: Switch segment

- **WHEN** the user selects Builds in the segment navigation
- **THEN** the Builds segment is shown, the address becomes `/baraba-ride/builds`, and the page is not reloaded

### Requirement: Each segment has its own URL

Catalog SHALL be served at `/baraba-ride/catalog`, Inventory at `/baraba-ride/inventory`, and Builds at `/baraba-ride/builds`. Opening a segment's URL directly SHALL show that segment.

#### Scenario: Direct access to a segment

- **WHEN** a signed-in user opens `/baraba-ride/inventory` directly
- **THEN** the Inventory segment is shown with Inventory indicated as current

#### Scenario: Browser history moves between segments

- **WHEN** the user goes from Catalog to Inventory and then uses the browser's back control
- **THEN** the Catalog segment is shown again

### Requirement: Catalog is the default segment

Opening `/baraba-ride` while signed in SHALL show the Catalog segment at `/baraba-ride/catalog`. A path beneath `/baraba-ride/` that matches no view SHALL also lead to `/baraba-ride/catalog`. These redirects SHALL replace the history entry rather than add one.

#### Scenario: Game root opens Catalog

- **WHEN** a signed-in user opens `/baraba-ride`
- **THEN** the address becomes `/baraba-ride/catalog` and the product list is shown

#### Scenario: Unknown path

- **WHEN** a signed-in user opens `/baraba-ride/nowhere`
- **THEN** the address becomes `/baraba-ride/catalog` and the product list is shown

#### Scenario: Back does not loop

- **WHEN** the user arrives at `/baraba-ride/catalog` by redirect from `/baraba-ride` and uses the browser's back control
- **THEN** the browser leaves the Baraba Ride page instead of returning to the redirect

### Requirement: Earlier query-string links redirect

Links in the earlier query-string form SHALL lead to the matching view: `/baraba-ride?product=<code>` to `/baraba-ride/catalog/products/<code>`, and `/baraba-ride?view=parts` to `/baraba-ride/catalog/parts`. When both parameters are present, the product SHALL take precedence.

#### Scenario: Earlier product link

- **WHEN** a signed-in user opens `/baraba-ride?product=BR-01`
- **THEN** the address becomes `/baraba-ride/catalog/products/BR-01` and that product's detail is shown

#### Scenario: Earlier parts link

- **WHEN** a signed-in user opens `/baraba-ride?view=parts`
- **THEN** the address becomes `/baraba-ride/catalog/parts` and the parts view is shown

#### Scenario: Both parameters present

- **WHEN** a signed-in user opens `/baraba-ride?view=parts&product=BR-01`
- **THEN** the address becomes `/baraba-ride/catalog/products/BR-01`

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

### Requirement: Segments require sign-in

Every Baraba Ride segment URL SHALL be subject to the same sign-in gate as the Baraba Ride page. A signed-out user SHALL see the gate and no segment navigation or segment content, and the address SHALL be left as opened.

#### Scenario: Signed-out access to a segment

- **WHEN** a signed-out user opens `/baraba-ride/builds` directly
- **THEN** the sign-in gate is shown, no segment navigation is shown, and the address stays `/baraba-ride/builds`

#### Scenario: Signed-out access to the game root

- **WHEN** a signed-out user opens `/baraba-ride`
- **THEN** the sign-in gate is shown and the address stays `/baraba-ride`

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
