---
id: US-001
feature: FS-124
title: Fix Regex to Match All Increment Patterns (P1)
status: completed
priority: P1
created: 2025-12-08
project: specweave
external:
  github:
    issue: 866
    url: https://github.com/anton-abyzov/specweave/issues/866
---

# US-001: Fix Regex to Match All Increment Patterns (P1)

**Feature**: [FS-124](./FEATURE.md)

**As a** user creating increments via `/specweave:increment`
**I want** the spec-project-validator hook to trigger for ALL increment patterns
**So that** project/board validation always runs regardless of increment naming

---

## Acceptance Criteria

- [x] **AC-US1-01**: Regex matches `0001-feature-name/spec.md` (standard)
- [x] **AC-US1-02**: Regex matches `0001E-external-fix/spec.md` (E-suffix)
- [x] **AC-US1-03**: Regex matches `001-legacy-feature/spec.md` (3-digit edge case)
- [x] **AC-US1-04**: Hook correctly validates project field for 1-level structures
- [x] **AC-US1-05**: Hook correctly validates both project AND board for 2-level structures

---

## Implementation

**Increment**: [0124-spec-project-validator-regex-fix](../../../../increments/0124-spec-project-validator-regex-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Fix matcher_content regex in hooks.json
- [x] **T-002**: Add unit tests for regex pattern matching
