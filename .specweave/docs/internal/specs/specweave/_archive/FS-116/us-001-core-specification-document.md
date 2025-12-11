---
id: US-001
feature: FS-116
title: Core Specification Document
status: in-progress
priority: P1
external:
  github:
    issue: 800
    url: https://github.com/anton-abyzov/specweave/issues/800
---

# US-001: Core Specification Document

## Description

As a **documentation architect**, I want a **comprehensive LivingSpec specification document** so that **any tool can implement the standard**.

## Acceptance Criteria

- [ ] **AC-US1-01**: Directory structure schema defined with all folder categories
- [ ] **AC-US1-02**: 6 document type definitions complete (Epic, Feature, US, Task, AC, ADR)
- [ ] **AC-US1-03**: E-suffix conventions documented for all external entities
- [ ] **AC-US1-04**: Status lifecycles defined for all entity types
- [ ] **AC-US1-05**: Sync protocol documented with E-suffix enforcement
- [ ] **AC-US1-06**: AI context protocol documented with origin tracking

## Implementation

### Tasks

| Task | Description | Status |
|------|-------------|--------|
| [T-001](../../../../increments/0116-livingspec-universal-standard/tasks.md#t-001) | Write Core Specification Document | [x] Completed |
| [T-002](../../../../increments/0116-livingspec-universal-standard/tasks.md#t-002) | Create Terminology Glossary | [ ] Pending |

### Satisfies ACs

- T-001 → AC-001 (Specification document complete)
- T-002 → AC-001 (Terminology glossary)

## Notes

The core specification includes:
- Directory structure schema with delivery/strategy folders
- Document type definitions
- E-suffix conventions for external entities
- Status lifecycles
- Sync protocol
- AI context protocol
