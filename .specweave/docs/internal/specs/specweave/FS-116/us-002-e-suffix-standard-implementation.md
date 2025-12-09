---
id: US-002
feature: FS-116
title: E-Suffix Standard Implementation
status: completed
priority: P1
external:
  github:
    issue: 801
    url: https://github.com/anton-abyzov/specweave/issues/801
---

# US-002: E-Suffix Standard Implementation

## Description

As a **sync system maintainer**, I want **consistent E-suffix rules for external items** so that **imported items are clearly distinguished from internal ones**.

## Acceptance Criteria

- [x] **AC-US2-01**: EP-XXXE pattern for external Epics documented
- [x] **AC-US2-02**: FS-XXXE pattern for external Features documented
- [x] **AC-US2-03**: US-XXXE pattern for external User Stories documented
- [x] **AC-US2-04**: AC-XXXE pattern for external Acceptance Criteria documented
- [x] **AC-US2-05**: T-XXXE pattern for external Tasks documented
- [x] **AC-US2-06**: Propagation rules (parent E → children E) documented
- [x] **AC-US2-07**: Immutability rules documented
- [x] **AC-US2-08**: Validation requirements documented

## Implementation

### Tasks

| Task | Description | Status |
|------|-------------|--------|
| [T-003](../../../../increments/0116-livingspec-universal-standard/tasks.md#t-003) | Document E-Suffix Rules | [x] Completed |

### Satisfies ACs

- T-003 → AC-007 (E-suffix validation in all ID generators)

## E-Suffix Rules Summary

| Level | Internal Pattern | External Pattern |
|-------|-----------------|------------------|
| Epic | EP-{NNN} | EP-{NNN}E |
| Feature | FS-{NNN} | FS-{NNN}E |
| User Story | US-{NNN} | US-{NNN}E |
| Acceptance Criterion | AC-{parent}-{NN} | AC-{parent}-{NN}E |
| Task | T-{NNN} | T-{NNN}E |
| Increment | {NNNN}-name | {NNNN}E-name |
