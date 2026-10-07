# Spec Delta

## REMOVED Requirements

### Requirement: Builds segment shows a placeholder

**Reason**: The Builds segment now has real features. Its behaviour is specified by the `br-builds` capability, which reads and stores the user's builds.

**Migration**: None for users. `/baraba-ride/builds` keeps its address and now shows the builds list; tests asserting the "not available yet" message and the absence of data requests are replaced by the `br-builds` scenarios.
