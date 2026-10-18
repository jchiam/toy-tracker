# Tasks

## 1. Clickable surfaces

- [x] 1.1 Stretch the choose button of `BuildPosition.tsx` over its card in `BrPage.css`, raising the card's links and Clear button above it; verify a click on an empty area of a plan position and of a built position opens the picker, and that the links and Clear keep their own action, in the `BuildView` stories
- [x] 1.2 Stretch the name link of a Builds list row over the row; verify a click on the row's readiness text opens the build in the `BuildList` stories
- [x] 1.3 Add hover emphasis and a card-wide focus ring to positions and rows from design tokens; verify `npm run lint` passes and the ring shows when tabbing to a position

## 2. Buttons

- [x] 2.1 Give the shared action buttons a 36px minimum height; verify the Inventory, Purchases and build view stories lay out without overflow

## 3. Tests

- [x] 3.1 Add an e2e case clicking a build row's far end and a position card's corner; verify it passes in all three browsers and fails against the previous styles
- [x] 3.2 Verify `npm run test` passes with the existing `BuildView` and `BuildList` tests unchanged
