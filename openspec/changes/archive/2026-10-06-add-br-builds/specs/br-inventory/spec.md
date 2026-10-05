# Spec Delta

## ADDED Requirements

### Requirement: Instance lists name the holding build

Wherever instances are listed, an instance held by a built build SHALL show that build's name, linking to the build. An instance not held by a built build SHALL show no build.

#### Scenario: Held instance

- **WHEN** the user expands an item one of whose instances is in the built build "Red Dash"
- **THEN** that instance shows "Red Dash" as a link to the build and the others show no build

#### Scenario: Purchase instances

- **WHEN** the user expands a purchase one of whose instances is in a built build
- **THEN** that instance shows the build's name

## MODIFIED Requirements

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
