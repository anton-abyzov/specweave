---
id: US-005
feature: FS-166
title: Auto Mode TDD Injection
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1008
    url: https://github.com/anton-abyzov/specweave/issues/1008
---

# US-005: Auto Mode TDD Injection

**Feature**: [FS-166](./FEATURE.md)

**As a** developer using `/sw:auto` with TDD mode
**I want** auto mode to inject TDD workflow guidance
**So that** autonomous execution follows test-first discipline

---

## Acceptance Criteria

- [x] **AC-US5-01**: Auto mode reads `testMode` from metadata before execution
- [x] **AC-US5-02**: When TDD, inject TDD workflow prompt into Claude's context
- [x] **AC-US5-03**: Create `.specweave/prompts/tdd-workflow-injection.md` prompt template
- [x] **AC-US5-04**: Auto mode validates test exists before marking GREEN complete

---

## Implementation

**Increment**: [0166-tdd-enforcement-behavioral](../../../../increments/0166-tdd-enforcement-behavioral/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-022**: [RED] Write test for auto mode TDD detection
- [ ] **T-023**: [GREEN] Implement testMode detection in auto setup
- [ ] **T-024**: [REFACTOR] Clean up auto TDD detection code
- [ ] **T-025**: [RED] Write test for TDD prompt injection
- [ ] **T-026**: [GREEN] Create TDD prompt injection template
- [ ] **T-027**: [REFACTOR] Optimize prompt injection for token efficiency
