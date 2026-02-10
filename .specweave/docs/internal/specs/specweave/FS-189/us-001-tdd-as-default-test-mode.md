---
id: US-001
feature: FS-189
title: "TDD as Default Test Mode"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** developer creating a new SpecWeave project
**I want** TDD to be the default test mode
**So that** new projects start with best testing practices out of the box."
project: specweave
---

# US-001: TDD as Default Test Mode

**Feature**: [FS-189](./FEATURE.md)

**As a** developer creating a new SpecWeave project
**I want** TDD to be the default test mode
**So that** new projects start with best testing practices out of the box

---

## Acceptance Criteria

- [x] **AC-US1-01**: `DEFAULT_CONFIG.testing.defaultTestMode` is `'TDD'` (was `'test-after'`)
- [x] **AC-US1-02**: `DEFAULT_CONFIG.testing.defaultCoverageTarget` is `90` (was `50`)
- [x] **AC-US1-03**: `DEFAULT_CONFIG.testing.coverageTargets` updated to `{ unit: 95, integration: 90, e2e: 100 }` (was `{ unit: 55, integration: 50, e2e: 60 }`)
- [x] **AC-US1-04**: Init wizard test mode prompt defaults to `TDD` (was `TDD` already in wizard, but code default was `test-after`)

---

## Implementation

**Increment**: [0189-tdd-coverage-defaults](../../../../increments/0189-tdd-coverage-defaults/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
