---
id: US-003
feature: FS-134
title: "Technical Debt & Inconsistency Detection"
status: not_started
priority: P1
created: 2025-12-09
project: specweave
related_projects: [MyApp (3 repos)]
---

# US-003: Technical Debt & Inconsistency Detection

**Feature**: [FS-134](./FEATURE.md)

**As a** engineering manager
**I want** the system to identify technical debt and inconsistencies across repos
**So that** I can prioritize refactoring and improvements

---

## Acceptance Criteria

- [ ] **AC-US3-01**: System detects pattern inconsistencies:
- [ ] **AC-US3-02**: System detects outdated dependencies (using `npm outdated`, `go list -u -m all`)
- [ ] **AC-US3-03**: System identifies code smells:
- [ ] **AC-US3-04**: System generates technical debt report: `.specweave/docs/internal/technical-debt.md`
- [ ] **AC-US3-05**: Each debt item tagged with: severity (P1/P2/P3), estimated effort, impact
- [ ] **AC-US3-06**: Report includes actionable recommendations with file paths and line numbers

---

## Implementation

**Increment**: [0134-intelligent-living-docs-deep-analysis](../../../../increments/0134-intelligent-living-docs-deep-analysis/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [ ] **T-009**: Create TechDebtDetector - Large Files
- [ ] **T-010**: Implement High Complexity Detection
- [ ] **T-011**: Detect Outdated Dependencies
- [ ] **T-012**: Implement Pattern Inconsistency Detection
- [ ] **T-020**: Generate Technical Debt Report
