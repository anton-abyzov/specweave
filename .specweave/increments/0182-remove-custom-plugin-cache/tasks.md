# Tasks: 0182-remove-custom-plugin-cache

## Phase 1: Remove Cache Module (US-001)

### T-001: [RED] Write tests verifying cache module removal
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 through AC-US1-06 | **Status**: [x] completed
**Test**: Given deleted cache modules → When building → Then no import errors occur

### T-002: [GREEN] Delete cache-manager.ts
**Depends On**: T-001 | **User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given `cache-manager.ts` deleted → When checking imports → Then no references remain

### T-003: [GREEN] Delete cache-health-monitor.ts
**Depends On**: T-001 | **User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Test**: Given `cache-health-monitor.ts` deleted → When building → Then build succeeds

### T-004: [GREEN] Delete cache-invalidator.ts
**Depends On**: T-001 | **User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Test**: Given `cache-invalidator.ts` deleted → When building → Then build succeeds

### T-005: [GREEN] Delete cache-metadata.ts
**Depends On**: T-001 | **User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Test**: Given `cache-metadata.ts` deleted → When building → Then build succeeds

### T-006: [GREEN] Delete startup-checker.ts
**Depends On**: T-001 | **User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [x] completed
**Test**: Given `startup-checker.ts` deleted → When building → Then no throttle file created

### T-007: [REFACTOR] Clean up types.ts - keep only shared types
**Depends On**: T-002, T-003, T-004, T-005, T-006 | **User Story**: US-001 | **Satisfies ACs**: AC-US1-06 | **Status**: [x] completed
**Test**: Given unused types removed → When building → Then types.ts only has necessary exports

## Phase 2: Remove Cache Commands (US-002)

### T-008: [RED] Write tests verifying commands removed from CLI
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given `specweave cache-status` → When running → Then "unknown command" error

### T-009: [GREEN] Delete cache-status command
**Depends On**: T-008 | **User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given command deleted → When running `specweave --help` → Then cache-status not shown

### T-010: [GREEN] Delete cache-refresh command
**Depends On**: T-008 | **User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Test**: Given command deleted → When running `specweave --help` → Then cache-refresh not shown

### T-011: [GREEN] Update CLI help and command registration
**Depends On**: T-009, T-010 | **User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed
**Test**: Given commands removed → When running `specweave --help` → Then no mention of cache commands

## Phase 3: Simplify refresh-marketplace (US-003)

### T-012: [RED] Write test for simplified refresh-marketplace
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given refresh-marketplace → When running → Then uses `claude plugin install --force`

### T-013: [GREEN] Refactor refresh-marketplace to use native commands
**Depends On**: T-012 | **User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Test**: Given plugin update needed → When running refresh-marketplace → Then claude plugin commands used

### T-014: [REFACTOR] Remove unused cache imports from refresh-marketplace
**Depends On**: T-013 | **User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed
**Test**: Given imports cleaned → When checking file → Then no cache module imports

## Phase 4: Remove State Pollution (US-004)

### T-015: [RED] Write test verifying no custom state files created
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
**Test**: Given startup → When session starts → Then no plugins-loaded.json or throttle file

### T-016: [GREEN] Remove plugins-loaded.json usage
**Depends On**: T-015 | **User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
**Test**: Given lazy-loading → When tracking plugins → Then uses installed_plugins.json

### T-017: [GREEN] Remove .cache-check-throttle creation
**Depends On**: T-015 | **User Story**: US-004 | **Satisfies ACs**: AC-US4-02 | **Status**: [x] completed
**Test**: Given startup-checker deleted → When session starts → Then no throttle file

### T-018: [GREEN] Update hooks to use native registry
**Depends On**: T-016, T-017 | **User Story**: US-004 | **Satisfies ACs**: AC-US4-03 | **Status**: [x] completed
**Test**: Given hook runs → When checking plugins → Then reads installed_plugins.json

## Phase 5: Update Tests (US-005)

### T-019: [RED] Identify all tests referencing deleted modules
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [x] completed
**Test**: Given grep for imports → When searching tests → Then list all affected files

### T-020: [GREEN] Remove/update cache module tests
**Depends On**: T-019 | **User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02 | **Status**: [x] completed
**Test**: Given tests updated → When running npm test → Then no import errors

### T-021: [GREEN] Verify all tests pass
**Depends On**: T-020 | **User Story**: US-005 | **Satisfies ACs**: AC-US5-03 | **Status**: [x] completed
**Test**: Given all changes → When running npm test:all → Then 100% pass rate

## Final Verification

### T-022: [REFACTOR] Final build and verification
**Depends On**: T-021 | **Status**: [x] completed
**Test**: Given all tasks complete → When running build + tests → Then everything passes
