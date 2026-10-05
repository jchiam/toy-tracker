# br-inventory Specification

## Purpose

Records what a signed-in user physically owns for Baraba Ride as individual item instances with provenance and status, and lets the user add, retire, and review them.

## Requirements

### Requirement: Each owned item is an instance

The inventory SHALL store every physical item the user owns as its own instance, referencing one catalogued item id (a part id or an accessory id). An instance SHALL record the product it came from when known, the purchase it was expanded from when any, a status of active or retired, a free-text note, and SHALL reserve a condition of mint, used, or worn that MAY be empty. Counts SHALL be derived from instances, never stored.

#### Scenario: Two tires are two instances

- **WHEN** the user owns two tires of the same catalogued part from the same product
- **THEN** the inventory holds two separate instances with the same item id and source product

#### Scenario: Condition absent by default

- **WHEN** an instance is created by any flow in this capability
- **THEN** its condition is empty and no condition is shown or editable

### Requirement: Inventory is private to its owner

Every inventory row SHALL belong to exactly one user and SHALL be readable and writable only by that user, enforced in the database with row-level security scoped the same way as the user profile. The owner's profile row SHALL be created on their first inventory write if it does not exist.

#### Scenario: Foreign rows invisible

- **WHEN** a signed-in user loads their inventory
- **THEN** only instances and purchases they own are returned, and writes against another user's rows fail

#### Scenario: First write creates the profile

- **WHEN** a signed-in user with no profile row records their first purchase or item
- **THEN** the write succeeds and a profile row for that user exists afterwards

### Requirement: Recording a purchase expands a product into instances

The user SHALL be able to record a purchase of any catalogued product that has a mapping entry, with an acquisition date defaulting to today and an optional note. Recording it SHALL create one purchase and, for each mapped item in the box, as many instances as the mapping's quantity, each tagged with the product as its source and linked to the purchase. Unmapped contents SHALL create nothing.

#### Scenario: Starter set purchase

- **WHEN** the user records a purchase of a mapped starter set whose mapping lists one cowl, one bumper, two tires, one chassis, and one charger
- **THEN** one purchase and six active instances linked to it are created, each with that product as source

#### Scenario: Colosseum purchase

- **WHEN** the user records a purchase of BR-10 Fold Colosseum
- **THEN** one purchase and one active colosseum instance linked to it are created

#### Scenario: Product without a mapping

- **WHEN** the user looks for a product that has no mapping entry in the purchase picker
- **THEN** the product is not offered for purchase recording

#### Scenario: Stickers are ignored

- **WHEN** the user records a purchase of a product whose printed contents include stickers
- **THEN** no sticker instance is created and no error is shown

### Requirement: Standalone items can be added

The user SHALL be able to add one or more instances of any catalogued part or accessory without a purchase, choosing a quantity of one or more and, optionally, the source product from among the products that contain that item. Instances added this way SHALL have no purchase link.

#### Scenario: Add loose tires with known source

- **WHEN** the user adds three of a part and selects BR-03 as the source
- **THEN** three active instances of that part with source BR-03 and no purchase are created

#### Scenario: Add a part of unknown origin

- **WHEN** the user adds one of a part and leaves the source empty
- **THEN** one active instance with no source product and no purchase is created

#### Scenario: Only catalogued items offered

- **WHEN** the user opens the item picker
- **THEN** every catalogued part and accessory is offered and nothing else

### Requirement: Instances can be retired

The user SHALL be able to retire an active instance, optionally recording why in its note. A retired instance SHALL remain in the inventory, SHALL be excluded from active counts, and SHALL be distinguishable from active instances wherever instances are listed. The user SHALL be able to reactivate a retired instance. Retiring an instance held by a built build SHALL be refused, naming the build, until the instance is swapped out of the build or the build is taken apart; the database SHALL refuse it as well.

#### Scenario: Retire a broken tire

- **WHEN** the user retires one of two active instances of a part and notes "cracked"
- **THEN** that instance is shown as retired with the note, and the part's active count becomes one

#### Scenario: Reactivate

- **WHEN** the user reactivates a retired instance
- **THEN** it is shown as active again and counted

#### Scenario: Retire refused while in a build

- **WHEN** the user views an instance held by the built build "Red Dash"
- **THEN** retire is not available for it and the reason names "Red Dash"

### Requirement: Instances and purchases can be deleted

The user SHALL be able to delete an instance outright. The user SHALL be able to delete a purchase, which SHALL also delete every instance linked to it, after confirming the number of instances that will be removed. Deleting is for correcting mistakes and SHALL require confirmation. Deleting an instance held by a built build SHALL be refused, naming the build. Deleting a purchase SHALL be refused while any of its instances is held by a built build, naming every such build. The database SHALL refuse both as well.

#### Scenario: Delete an instance

- **WHEN** the user deletes an instance and confirms
- **THEN** the instance no longer appears anywhere in the inventory

#### Scenario: Delete a purchase

- **WHEN** the user deletes a purchase with six linked instances and confirms
- **THEN** the purchase and all six instances are removed

#### Scenario: Delete refused while in a build

- **WHEN** the user views an instance held by the built build "Red Dash"
- **THEN** delete is not available for it and the reason names "Red Dash"

#### Scenario: Purchase delete refused

- **WHEN** the user tries to delete a purchase two of whose instances are in the built builds "Red Dash" and "Blue Spin"
- **THEN** the purchase is not deleted and the message names "Red Dash" and "Blue Spin"

### Requirement: Items view groups instances by catalogued item

The Inventory segment SHALL show an Items view at `/baraba-ride/inventory` listing every catalogued item the user has at least one instance of, grouped by slot for parts and by accessory kind for accessories, with the item's name, its active count, and its retired count when non-zero. When any active instance of an item is held by a built build, the item SHALL also show how many are in builds and how many are free. Expanding an item SHALL list its instances with source product, purchase date when linked, status, and note, and SHALL offer retire, reactivate, and delete on each.

#### Scenario: Grouped with counts

- **WHEN** the user has two active and one retired instance of a tire and one active charger
- **THEN** the tire appears under its slot showing two active and one retired, and the charger appears under chargers showing one active

#### Scenario: Expand an item

- **WHEN** the user expands an item
- **THEN** each of its instances is listed with its source product (or "unknown"), status, and note

#### Scenario: Empty inventory

- **WHEN** the user has no instances
- **THEN** a message says the inventory is empty and offers to record a purchase or add items

#### Scenario: In builds and free

- **WHEN** the user has six active instances of a tire, four of them held by a built build
- **THEN** the tire shows six active, four in builds and two free

#### Scenario: Nothing in builds

- **WHEN** none of an item's instances is held by a built build
- **THEN** the item shows its active count with no in-builds or free count

### Requirement: Purchases view lists recorded purchases

The Inventory segment SHALL show a Purchases view at `/baraba-ride/inventory/purchases` listing every recorded purchase, most recent acquisition date first, with product code, name, acquisition date, note, and the number of linked instances. Expanding a purchase SHALL list its instances with status and SHALL offer delete on the purchase.

#### Scenario: Purchases listed

- **WHEN** the user has recorded BR-01 on one date and BR-03 on a later date
- **THEN** BR-03 is listed before BR-01, each with its date and instance count

#### Scenario: Purchase opened by URL

- **WHEN** a signed-in user opens `/baraba-ride/inventory/purchases` directly
- **THEN** the Purchases view is shown with Purchases indicated as current

### Requirement: Inventory loading and failure states

Each inventory view SHALL show a loading state while data is fetched and, when the fetch or a write fails, SHALL show an error message naming the action that failed and keep the previously shown data. A successful write SHALL be reflected in the view without a full page reload.

#### Scenario: Load failure

- **WHEN** the inventory fetch fails
- **THEN** an error message is shown instead of an empty-inventory message

#### Scenario: Write reflected

- **WHEN** the user records a purchase from the Items view
- **THEN** the new instances appear in the Items view without reloading the page

### Requirement: Instance lists name the holding build

Wherever instances are listed, an instance held by a built build SHALL show that build's name, linking to the build. An instance not held by a built build SHALL show no build.

#### Scenario: Held instance

- **WHEN** the user expands an item one of whose instances is in the built build "Red Dash"
- **THEN** that instance shows "Red Dash" as a link to the build and the others show no build

#### Scenario: Purchase instances

- **WHEN** the user expands a purchase one of whose instances is in a built build
- **THEN** that instance shows the build's name
