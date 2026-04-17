# Spec: with-state-markers

## User Stories

### US-001: Legacy state-marker increment
**As a** developer using an older SpecWeave
**I want** my existing state-marker files to stay valid
**So that** I can reopen this increment without re-planning.

#### Acceptance Criteria
- [x] AC-US1-01: State-marker files on disk do not cause startup errors
- [x] AC-US1-02: Increment can be reopened via `sw:increment 0001`

### US-002: Archived session resume
**As a** developer returning to a stale increment
**I want** the plan to still be loadable
**So that** I can pick up where I left off.

#### Acceptance Criteria
- [x] AC-US2-01: spec.md and plan.md are still readable after upgrade
