---
id: US-004
feature: FS-189
title: "SpecWeave Self-Application"
status: completed
priority: P1
created: 2026-02-10
tldr: "**As a** SpecWeave maintainer
**I want** the project's own config to use TDD with 90% coverage
**So that** the framework practices what it preaches."
project: specweave
---

# US-004: SpecWeave Self-Application

**Feature**: [FS-189](./FEATURE.md)

**As a** SpecWeave maintainer
**I want** the project's own config to use TDD with 90% coverage
**So that** the framework practices what it preaches

---

## Acceptance Criteria

- [x] **AC-US4-01**: `.specweave/config.json` updated: `testing.defaultTestMode: "TDD"`
- [x] **AC-US4-02**: `.specweave/config.json` updated: `testing.defaultCoverageTarget: 90`
- [x] **AC-US4-03**: `.specweave/config.json` updated: `testing.coverageTargets: { unit: 95, integration: 90, e2e: 100 }`

---

## Implementation

**Increment**: [0189-tdd-coverage-defaults](../../../../increments/0189-tdd-coverage-defaults/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
