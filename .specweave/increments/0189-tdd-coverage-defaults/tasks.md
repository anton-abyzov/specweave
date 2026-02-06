# 0189: Tasks

## Phase 1: DEFAULT_CONFIG Changes (US-001)

### T-001: [RED] Write tests for new DEFAULT_CONFIG.testing values
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given `DEFAULT_CONFIG.testing` → When accessed → Then `defaultTestMode` is `'TDD'`, `defaultCoverageTarget` is `90`, `coverageTargets` is `{ unit: 95, integration: 90, e2e: 100 }`

### T-002: [GREEN] Update DEFAULT_CONFIG.testing values
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04 | **Status**: [x] completed
**Depends On**: T-001
**Test**: Given updated DEFAULT_CONFIG → When tests run → Then all new value assertions pass

---

## Phase 2: 100% Coverage Option (US-002, US-003)

### T-003: [RED] Write tests for 100% coverage option and mode-aware defaults
**User Story**: US-002, US-003 | **Satisfies ACs**: AC-US2-01, AC-US2-03, AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given testing-config coverage options → When inspected → Then 100% option exists; Given TDD mode → When coverage prompted → Then default is 90%; Given test-after → default is 80%

### T-004: [GREEN] Add 100% option and mode-aware defaults to testing-config.ts
**User Story**: US-002, US-003 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US3-01, AC-US3-02, AC-US3-03 | **Status**: [x] completed
**Depends On**: T-003
**Test**: Given coverage prompt with TDD mode → When shown → Then 100% option present, default is 90%

---

## Phase 3: Self-Application & Verification (US-004)

### T-005: [GREEN] Update SpecWeave's own config.json
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given `.specweave/config.json` → When read → Then testing section has TDD mode with 90% coverage

### T-006: [REFACTOR] Full build and test verification
**User Story**: All | **Satisfies ACs**: All | **Status**: [x] completed
**Depends On**: T-002, T-004, T-005
**Test**: Given `npm run rebuild && npm run test:unit` → When executed → Then all tests pass
