---
id: US-003
feature: FS-135
title: Technical Debt & Inconsistency Detection
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 832
    url: https://github.com/anton-abyzov/specweave/issues/832
---

# US-003: Technical Debt & Inconsistency Detection

**Feature**: [FS-135](./FEATURE.md)

**As a** engineering manager
**I want** the system to identify technical debt and inconsistencies across repos
**So that** I can prioritize refactoring and improvements

---

## Acceptance Criteria

- [x] **AC-US3-04**: System generates technical debt report: `.specweave/docs/internal/technical-debt.md`
- [x] **AC-US3-05**: Each debt item tagged with: severity (P1/P2/P3), estimated effort, impact
- [x] **AC-US3-06**: Report includes actionable recommendations with file paths and line numbers
- [x] **AC-US3-04**: System generates technical debt report
- [x] **AC-US3-05**: Each debt item tagged with severity, estimated effort, impact
- [x] **AC-US3-06**: Report includes actionable recommendations

---

## Implementation

**Increment**: [0135-living-docs-visualization](../../../../increments/0135-living-docs-visualization/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-020**: Generate Technical Debt Report
