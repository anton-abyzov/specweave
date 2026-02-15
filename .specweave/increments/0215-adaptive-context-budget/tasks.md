# Tasks — 0215 Adaptive Context Budget

### T-001: ContextBudgetConfig type + defaults
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given config types → When ContextBudgetConfig imported → Then has level and autoAdapt fields with correct defaults

### T-002: PreCompact hook script
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given PreCompact fires → When hook runs → Then context-pressure.json created with escalation

### T-003: Register PreCompact in hooks.json + fail-fast-wrapper
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given hooks.json → When parsed → Then PreCompact entry exists with correct wrapper

### T-004: Turn deduplication in user-prompt-submit
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given identical consecutive prompts → When hook runs → Then 2nd outputs bare approve

### T-005: Budget resolution with config + pressure adaptation
**User Story**: US-003, US-002 | **Satisfies ACs**: AC-US3-01, AC-US3-03, AC-US2-03 | **Status**: [x] completed
**Test**: Given config level + pressure state → When hook resolves budget → Then correct char budget used

### T-006: Session cleanup (pressure + hash)
**User Story**: US-001, US-003 | **Satisfies ACs**: AC-US1-03, AC-US3-04 | **Status**: [x] completed
**Test**: Given session start → When hook runs → Then pressure and hash files cleared
