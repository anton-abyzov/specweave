---
id: US-004
feature: FS-143
title: Create Migration Script
status: completed
priority: P1
created: 2026-01-14
project: specweave
external:
  github:
    issue: 926
    url: https://github.com/anton-abyzov/specweave/issues/926
---

# US-004: Create Migration Script

**Feature**: [FS-143](./FEATURE.md)

**As a** SpecWeave user with existing increments
**I want** a safe migration script for my old specs
**So that** the upgrade doesn't break my workflow

---

## Acceptance Criteria

- [x] **AC-US4-01**: Migration script created and tested (T-025)
- [x] **AC-US4-02**: Migration logging implemented (T-026)
- [x] **AC-US4-03**: Script is idempotent (T-027)
- [x] **AC-US4-04**: Tested on copy of data (T-028)

---

## Implementation

**Increment**: [0143-frontmatter-removal-code-templates-tests](../../../../increments/0143-frontmatter-removal-code-templates-tests/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-018**: Update Single-Project Template
- [x] **T-019**: Update Multi-Project Template
- [x] **T-020**: Update All Other Templates
- [x] **T-021**: Update Template Documentation
