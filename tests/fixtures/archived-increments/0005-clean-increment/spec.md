# Spec: clean-increment

A baseline increment with no deprecated features. Serves as the control case against which the other four fixtures are compared.

## User Stories

### US-001: Happy-path increment loads cleanly
**As a** developer starting a new increment
**I want** spec.md, plan.md, tasks.md, and metadata.json to round-trip without changes
**So that** the 0669 alignment has no spurious side effects on clean state.

#### Acceptance Criteria
- [x] AC-US1-01: Loading this fixture does not emit migration warnings
- [x] AC-US1-02: All four standard files exist and parse
