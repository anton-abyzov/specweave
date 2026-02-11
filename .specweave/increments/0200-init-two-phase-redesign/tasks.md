# Tasks: 0200 — Redesign Init Flow

## US-001: Phase 1 — Project Identity

### T-001: [RED] Write tests for project topology prompt
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-04 | **Status**: [ ] pending
**Test**: Given init starts → When promptProjectTopology() is called → Then asks greenfield/brownfield and mono/multi-repo
**Test**: Given user selects brownfield + multi-repo → When result returned → Then topology object contains correct values

### T-002: [GREEN] Implement promptProjectTopology()
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [ ] pending
**Depends On**: T-001

### T-003: [REFACTOR] Extract Phase 1 into standalone projectIdentity() function
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [ ] pending
**Depends On**: T-002

## US-002: Phase 2 — Topology-Driven Platform Setup

### T-004: [RED] Write tests for topology-driven question branching
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [ ] pending
**Test**: Given greenfield topology → When platformSetup() runs → Then living docs and external import are skipped
**Test**: Given single-repo topology → When platformSetup() runs → Then repo selection/cloning steps are skipped
**Test**: Given multi-repo topology → When platformSetup() runs → Then provider + repo selection flow is shown

### T-005: [GREEN] Implement topology-driven platformSetup()
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04 | **Status**: [ ] pending
**Depends On**: T-004

### T-006: [REFACTOR] Unify repo hosting + issue tracker credential flow
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [ ] pending
**Depends On**: T-005

## US-003: Smart Defaults

### T-007: [RED] Write tests for smart defaults application
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [ ] pending
**Test**: Given no user input → When applySmartDefaults() runs → Then config has TDD, standard gates, no interview, LSP on
**Test**: Given brownfield topology → When defaults applied → Then living docs config is prepared

### T-008: [GREEN] Implement applySmartDefaults()
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05 | **Status**: [ ] pending
**Depends On**: T-007

### T-009: [GREEN] Add specweave config subcommand for post-init customization
**User Story**: US-003 | **Satisfies ACs**: AC-US3-06 | **Status**: [ ] pending
**Depends On**: T-008

## US-004: Break Up God Function

### T-010: [RED] Write integration tests for new init flow end-to-end
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-05 | **Status**: [ ] pending
**Test**: Given greenfield + single-repo → When initCommand() runs → Then only Phase 1 + minimal Phase 2 questions asked

### T-011: [GREEN] Rewire initCommand() to use phase functions
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04 | **Status**: [ ] pending
**Depends On**: T-003, T-005, T-008, T-010

### T-012: [REFACTOR] Clean up dead code from old wizard loop
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04 | **Status**: [ ] pending
**Depends On**: T-011
