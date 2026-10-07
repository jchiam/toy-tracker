# Spec Delta

## Purpose

Lets a signed-in user record Baraba Ride machines as builds — either plans checked against the parts they have free, or built machines that hold specific inventory instances — and manage them from the Builds segment.

## ADDED Requirements

### Requirement: A build is a named machine of seven positions

A build SHALL have a name, a free-text note, a status of plan or built, and seven positions: bumper, cowl, chassis, and one tire for each of front-left, front-right, rear-left and rear-right. Each position SHALL accept only parts of its slot. Any tire part SHALL be accepted on any wheel. Accessories SHALL never be offered for a position.

#### Scenario: Mixed tires

- **WHEN** the user puts H36 on both front wheels and C36 on both rear wheels
- **THEN** the build is accepted with those four tires in those positions

#### Scenario: Left and right tires anywhere

- **WHEN** the user puts LW32 on the front-right wheel
- **THEN** it is accepted with no warning

#### Scenario: Slot enforced

- **WHEN** the user opens the choice for the cowl position
- **THEN** only cowls are offered

### Requirement: Builds are private to their owner

Every build SHALL belong to exactly one user and SHALL be readable and writable only by that user, enforced in the database the same way as the inventory. A build SHALL only ever hold instances owned by the same user.

#### Scenario: Foreign builds invisible

- **WHEN** a signed-in user loads their builds
- **THEN** only builds they own are returned, and writes against another user's builds fail

#### Scenario: Foreign instance refused

- **WHEN** a write tries to put another user's instance into a build
- **THEN** the write fails and the build is unchanged

### Requirement: Builds list shows every build with its state

The Builds segment SHALL show at `/baraba-ride/builds` every build the user has, with its name and whether it is built or a plan. A plan SHALL also show whether it is ready to build, incomplete, or short of parts. The list SHALL offer creating a build and SHALL link each build to its build view.

#### Scenario: Plans and built machines listed

- **WHEN** the user has one built build and one plan with every position filled from free parts
- **THEN** both are listed by name, the first marked built and the second marked as a plan that is ready to build

#### Scenario: Plan short of parts

- **WHEN** a plan has every position filled but two positions cannot be filled from free parts
- **THEN** the plan is marked as short of two parts

#### Scenario: No builds

- **WHEN** the user has no builds
- **THEN** a message says there are no builds yet and offers to create one

### Requirement: A build is created as an empty plan

The user SHALL be able to create a build by giving it a name. The name SHALL be required, SHALL not be blank, and SHALL be at most 60 characters; names need not be unique. A new build SHALL be a plan with no positions filled, and creating it SHALL open its build view.

#### Scenario: Create

- **WHEN** the user creates a build named "Silver idea"
- **THEN** a plan with that name and seven empty positions exists and its build view is shown

#### Scenario: Blank name refused

- **WHEN** the user submits a name of only spaces
- **THEN** no build is created and the name is reported as required

### Requirement: Each build has its own URL

A build SHALL be shown at `/baraba-ride/builds/<id>` with its name, status, note and seven positions, laid out with the bumper at the front, then the front tires, cowl, chassis and rear tires. Opening that URL directly SHALL show the build. An id that matches none of the user's builds SHALL show a message saying so together with the builds list. Any other path beneath `/baraba-ride/builds/` SHALL lead to `/baraba-ride/builds`, replacing the history entry.

#### Scenario: Unknown builds path

- **WHEN** a signed-in user opens `/baraba-ride/builds/x/y`
- **THEN** the address becomes `/baraba-ride/builds` and the builds list is shown

#### Scenario: Build opened by URL

- **WHEN** a signed-in user opens the URL of one of their builds directly
- **THEN** that build is shown with Builds indicated as the current segment

#### Scenario: Unknown build

- **WHEN** a signed-in user opens `/baraba-ride/builds/` followed by an id that is not one of their builds
- **THEN** a message says no such build exists and the builds list is shown

### Requirement: A plan position names a part and optionally a variant

In a plan, the user SHALL be able to set each position to any catalogued part of its slot, whether or not they own it, and optionally to one of that part's variants, identified by the product it ships in. A position with no variant SHALL mean any variant. The user SHALL be able to clear a position and to set all four tire positions to one choice in a single action. A plan MAY have empty positions.

#### Scenario: Any variant

- **WHEN** the user sets the bumper position to Dual Blade without choosing a variant
- **THEN** the position shows Dual Blade, any variant

#### Scenario: Specific variant

- **WHEN** the user sets a tire position to H36 from BR-07
- **THEN** the position shows H36 with the BR-07 variant's colour label and image

#### Scenario: Part not owned

- **WHEN** the user sets the cowl position to a cowl they have no instance of
- **THEN** the plan saves with that cowl

#### Scenario: Fill all four tires

- **WHEN** the user chooses C36 from BR-03 with the fill-all-tires action
- **THEN** all four tire positions hold C36 from BR-03

### Requirement: A plan claims nothing from the inventory

A plan SHALL NOT reserve, hold or otherwise remove any instance from the user's free parts, whatever its positions name. Saving, changing or deleting a plan SHALL leave every inventory count unchanged.

#### Scenario: Plan leaves parts free

- **WHEN** the user owns one free Storm Falcon and saves a plan that names Storm Falcon
- **THEN** the inventory still shows that Storm Falcon as free

### Requirement: A plan is checked against free parts

Each filled plan position SHALL show one of: available, when a free matching instance can be assigned to it; in use, naming the built builds that hold matching instances, when none is left free; or missing, with links to the Catalog products that contain the part. Free means active and not held by a built build. An instance matches a position when it is the same part and, if the position names a variant, came from that product. Positions of one plan SHALL NOT share an instance.

#### Scenario: Demand is counted

- **WHEN** a plan names H36 on all four wheels and the user has two free H36 and no others
- **THEN** two tire positions show available and two show missing

#### Scenario: Held by a built build

- **WHEN** a plan names chassis Alpha and the user's only Alpha is in the built build "Red Dash"
- **THEN** the chassis position shows in use by "Red Dash"

#### Scenario: Variant narrows the match

- **WHEN** a plan names H36 from BR-07 and the user's only free H36 came from BR-02
- **THEN** the position shows missing and links to BR-07

#### Scenario: Unknown source matches only any-variant positions

- **WHEN** the user's only free H36 has no source product
- **THEN** a position naming H36 with no variant shows available, and a position naming H36 from BR-02 does not

#### Scenario: Retired parts do not count

- **WHEN** the user's only instance of a part is retired
- **THEN** a plan position naming that part shows missing

### Requirement: Plans do not compete with each other

A plan SHALL be checked on its own. What other plans name SHALL NOT affect a plan's check.

#### Scenario: Two plans want the same part

- **WHEN** the user has one free Storm Falcon and two plans that each name Storm Falcon
- **THEN** both plans show the cowl position as available

### Requirement: Marking a plan built claims specific instances

The user SHALL be able to mark a plan built. Before confirming, the user SHALL see, per position, the instance chosen for it — by default the oldest free matching instance — and SHALL be able to choose another free matching instance. On confirmation the build SHALL become built, holding those seven instances, and each position SHALL then show the part and source product of the instance it holds. The change SHALL apply completely or not at all.

#### Scenario: Automatic choice

- **WHEN** the user marks built a plan whose every position is available and confirms without changes
- **THEN** the build is built and holds seven distinct instances, each the oldest free match for its position

#### Scenario: Choose another instance

- **WHEN** two free instances match the chassis position and the user chooses the newer one before confirming
- **THEN** the built build holds the newer one and the older one stays free

#### Scenario: Any-variant position takes the instance's variant

- **WHEN** a position naming H36 with no variant is filled by an instance from BR-07
- **THEN** the built build shows that position as H36 from BR-07

#### Scenario: Failure leaves a plan

- **WHEN** confirming fails because a chosen instance is no longer free
- **THEN** the build is still a plan holding no instances, and an error says the build could not be marked built

### Requirement: Marking built is refused when a position cannot be filled

Marking a plan built SHALL be refused while any position is empty or is not available, and the refusal SHALL list every such position with its reason.

#### Scenario: Empty position

- **WHEN** the user tries to mark built a plan with no chassis chosen
- **THEN** it is refused and the chassis position is listed as empty

#### Scenario: Part held elsewhere

- **WHEN** the user tries to mark built a plan whose only matching chassis is in the built build "Red Dash"
- **THEN** it is refused and the chassis position is listed as in use by "Red Dash"

### Requirement: An instance is in at most one built build

An active instance SHALL be held by at most one position of one built build at a time, guaranteed by the database. A retired instance SHALL never be held by a build.

#### Scenario: Double use refused

- **WHEN** a write tries to put an instance already held by one built build into another
- **THEN** the write fails and both builds are unchanged

#### Scenario: Retired instance refused

- **WHEN** a write tries to put a retired instance into a build
- **THEN** the write fails

### Requirement: A built build's position can be swapped in place

In a built build, the user SHALL be able to replace the instance in a position with any free instance of that position's slot, of the same part or a different one. The replaced instance SHALL become free. A built build's position SHALL NOT be clearable; a built build always holds seven instances.

#### Scenario: Swap a tire

- **WHEN** the user replaces the front-left tire of a built build with a free C36 instance
- **THEN** the build holds the C36 instance there and the previous tire is free

#### Scenario: No clear on a built build

- **WHEN** the user views a position of a built build
- **THEN** no action to empty the position is offered

### Requirement: A built build can be taken apart

The user SHALL be able to take a built build apart after confirming. The build SHALL become a plan, every instance it held SHALL become free, and each position SHALL keep the part and source product of the instance it held. A position that held an instance with no source product SHALL keep the part with no variant.

#### Scenario: Take apart

- **WHEN** the user takes apart a built build and confirms
- **THEN** the build is a plan naming the same seven parts and variants, and its seven instances are free

### Requirement: Builds can be renamed, annotated and deleted

The user SHALL be able to change a build's name, under the same rules as on creation, and its note, in either status. The user SHALL be able to delete a build in either status after confirming; deleting a built build SHALL free the instances it held, and the confirmation SHALL say so.

#### Scenario: Rename

- **WHEN** the user renames a build to "Red Dash"
- **THEN** the build is shown as "Red Dash" in the build view and the builds list

#### Scenario: Delete a built build

- **WHEN** the user deletes a built build and confirms
- **THEN** the build no longer appears and its seven instances are free

### Requirement: Builds loading and failure states

The builds list and build view SHALL show a loading state while data is fetched and, when the fetch or a write fails, SHALL show an error message naming the action that failed and keep the previously shown data. A successful write SHALL be reflected without a full page reload.

#### Scenario: Load failure

- **WHEN** the builds fetch fails
- **THEN** an error message is shown instead of a no-builds message

#### Scenario: Write reflected

- **WHEN** the user sets a position in a plan
- **THEN** the position and its check are updated without reloading the page
