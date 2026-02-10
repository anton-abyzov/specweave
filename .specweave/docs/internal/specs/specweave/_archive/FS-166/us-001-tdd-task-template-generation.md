---
id: US-001
feature: FS-166
title: TDD Task Template Generation
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1004
    url: https://github.com/anton-abyzov/specweave/issues/1004
---

# US-001: TDD Task Template Generation

**Feature**: [FS-166](./FEATURE.md)

**As a** developer who selected TDD mode
**I want** `/sw:increment` to generate tasks in RED-GREEN-REFACTOR triplets
**So that** my tasks.md guides me through proper TDD discipline

---

## Acceptance Criteria

- [x] **AC-US1-01**: When `testMode: "TDD"` in config, increment-planner MUST use TDD task template
- [x] **AC-US1-02**: Each feature generates a triplet: T-001 [RED], T-002 [GREEN], T-003 [REFACTOR]
- [x] **AC-US1-03**: [GREEN] tasks have explicit `**Depends On**: T-XXX [RED]` field
- [x] **AC-US1-04**: [REFACTOR] tasks have explicit `**Depends On**: T-XXX [GREEN]` field
- [x] **AC-US1-05**: spec.md includes TDD Contract section explaining the workflow
- [x] **AC-US1-06**: When `testMode: "test-after"`, continue using current implementation-first template

---

## Implementation

**Increment**: [0166-tdd-enforcement-behavioral](../../../../increments/0166-tdd-enforcement-behavioral/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: [RED] Write test for increment-planner testMode handling
- [x] **T-008**: [GREEN] Implement testMode-aware template selection in increment-planner
- [x] **T-009**: [REFACTOR] Clean up template selection code
- [x] **T-010**: [RED] Write test for TDD dependency markers
- [x] **T-011**: [GREEN] Implement dependency markers in TDD template
- [x] **T-012**: [REFACTOR] Validate dependency chain consistency
- [x] **T-028**: Write integration test for full TDD workflow
- [ ] **T-029**: Update CLAUDE.md with TDD enforcement documentation
- [ ] **T-030**: Update increment-planner SKILL.md with TDD template selection
