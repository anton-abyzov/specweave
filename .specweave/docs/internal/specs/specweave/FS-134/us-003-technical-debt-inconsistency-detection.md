---
id: US-003
feature: FS-134
title: "Technical Debt & Inconsistency Detection"
status: completed
priority: P1
created: 2025-12-09
project: specweave
---

# US-003: Technical Debt & Inconsistency Detection

**Feature**: [FS-134](./FEATURE.md)

**As a** engineering manager
**I want** the system to identify technical debt and inconsistencies across repos
**So that** I can prioritize refactoring and improvements

---

## Acceptance Criteria

- [x] **AC-US3-01**: System detects pattern inconsistencies:
- [x] **AC-US3-02**: System detects outdated dependencies (using `npm outdated`, `go list -u -m all`)
- [x] **AC-US3-03**: System identifies code smells:
- [x] **AC-US3-01**: System detects pattern inconsistencies
- [x] **AC-US3-02**: System detects outdated dependencies
- [x] **AC-US3-03**: System identifies code smells (large files, high complexity)

---

## Implementation

**Increment**: [0134-living-docs-core-engine](../../../../increments/0134-living-docs-core-engine/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Create TechDebtDetector - Large Files
- [x] **T-010**: Implement High Complexity Detection
- [x] **T-011**: Detect Outdated Dependencies
- [x] **T-012**: Implement Pattern Inconsistency Detection
