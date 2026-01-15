---
id: US-002
feature: FS-166
title: TDD Template Files
status: completed
priority: P1
created: 2026-01-09
project: specweave
external:
  github:
    issue: 1005
    url: https://github.com/anton-abyzov/specweave/issues/1005
---

# US-002: TDD Template Files

**Feature**: [FS-166](./FEATURE.md)

**As a** framework maintainer
**I want** dedicated TDD task templates
**So that** the TDD structure is consistent and maintainable

---

## Acceptance Criteria

- [x] **AC-US2-01**: Create `templates/tasks-tdd-single-project.md` with TDD triplet structure
- [x] **AC-US2-02**: Create `templates/tasks-tdd-multi-project.md` for umbrella projects
- [x] **AC-US2-03**: Create `templates/spec-tdd-contract.md` snippet for TDD guidance
- [x] **AC-US2-04**: Templates use consistent phase markers: `[RED]`, `[GREEN]`, `[REFACTOR]`

---

## Implementation

**Increment**: [0166-tdd-enforcement-behavioral](../../../../increments/0166-tdd-enforcement-behavioral/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: [RED] Write test for TDD task template loading
- [x] **T-002**: [GREEN] Create TDD task template file
- [x] **T-003**: [REFACTOR] Improve TDD template maintainability
- [x] **T-004**: [RED] Write test for TDD spec contract section
- [x] **T-005**: [GREEN] Create TDD spec contract template
- [x] **T-006**: [REFACTOR] Consolidate TDD template snippets
- [ ] **T-030**: Update increment-planner SKILL.md with TDD template selection
