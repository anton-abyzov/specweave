---
id: US-005
feature: FS-148
title: "Test-Driven Validation Gates"
status: completed
priority: P1
created: 2025-12-29
project: specweave
---

# US-005: Test-Driven Validation Gates

**Feature**: [FS-148](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: Before closing any increment, run full test suite (`npm test` or configured command)
- [x] **AC-US5-02**: If tests fail, auto pauses and attempts fix (up to 3 retries)
- [x] **AC-US5-03**: After 3 failed fix attempts, transition to `NEEDS_HUMAN_INTERVENTION` state
- [x] **AC-US5-04**: Unit tests must pass before integration tests run
- [x] **AC-US5-05**: Integration tests must pass before E2E tests run (if configured)
- [x] **AC-US5-06**: Coverage threshold enforcement: block if coverage drops below target
- [x] **AC-US5-07**: Test results logged to `.specweave/logs/auto-tests-{iteration}.json`
- [x] **AC-US5-08**: Playwright E2E integration: detect `playwright.config.ts` and run E2E suite

---

## Implementation

**Increment**: [0148-autonomous-execution-auto](../../../../increments/0148-autonomous-execution-auto/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-024**: Create test gate module
- [x] **T-025**: Implement test failure fix attempts
- [x] **T-026**: Implement human intervention escalation
- [x] **T-027**: Implement coverage threshold enforcement
- [x] **T-028**: Implement Playwright E2E integration
