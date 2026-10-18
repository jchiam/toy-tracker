# Spec Delta

## MODIFIED Requirements

### Requirement: Builds list shows every build with its state

The Builds segment SHALL show at `/baraba-ride/builds` every build the user has, with its name and whether it is built or a plan. A plan SHALL also show whether it is ready to build, incomplete, or short of parts. The list SHALL offer creating a build, and activating anywhere on a build's row SHALL open its build view.

#### Scenario: Plans and built machines listed

- **WHEN** the user has one built build and one plan with every position filled from free parts
- **THEN** both are listed by name, the first marked built and the second marked as a plan that is ready to build

#### Scenario: Plan short of parts

- **WHEN** a plan has every position filled but two positions cannot be filled from free parts
- **THEN** the plan is marked as short of two parts

#### Scenario: No builds

- **WHEN** the user has no builds
- **THEN** a message says there are no builds yet and offers to create one

#### Scenario: Row opens the build

- **WHEN** the user activates a build's row away from its name
- **THEN** that build's view opens

## ADDED Requirements

### Requirement: A build position opens its picker from anywhere on the position

Activating anywhere on a build position SHALL open its picker: on a plan, the picker that sets the position's part; on a built build, the picker that swaps its instance. Links within the position and its clear action SHALL keep their own behaviour and SHALL NOT open the picker. Each position SHALL be a single control that can be reached and activated from the keyboard.

#### Scenario: Choose from the card

- **WHEN** the user activates an empty plan position away from its choose action
- **THEN** the part picker for that position opens

#### Scenario: Swap from the card

- **WHEN** the user activates a position of a built build away from its swap action
- **THEN** the swap picker for that position opens

#### Scenario: Link inside the position

- **WHEN** the user activates the BR-07 link on a missing plan position
- **THEN** the BR-07 product opens and no picker opens

#### Scenario: Clear inside the position

- **WHEN** the user activates the clear action on a filled plan position
- **THEN** the position is emptied and no picker opens

#### Scenario: Keyboard

- **WHEN** the user tabs to a build position and activates it from the keyboard
- **THEN** its picker opens
