# Spec: with-simple-flag

## User Stories

### US-001: Simple-mode increment pre-1.1.0
**As a** developer who used `--simple` mode in 1.0.x
**I want** my archived increment to resume correctly
**So that** I don't need to manually rewrite flags that are being deprecated.

#### Acceptance Criteria
- [x] AC-US1-01: Loading metadata.json does not reject the `--simple` flag
- [ ] AC-US1-02: Resume re-emits a migration hint instead of erroring

### US-002: Back-compat for simple-mode tasks.md
**As a** developer resuming a `--simple` increment
**I want** the task list to stay intact
**So that** my progress is preserved.

#### Acceptance Criteria
- [x] AC-US2-01: tasks.md entries with `--simple` references still parse
