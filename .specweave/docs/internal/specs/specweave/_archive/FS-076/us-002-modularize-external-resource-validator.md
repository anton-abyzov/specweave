---
id: US-002
feature: FS-076
title: "Modularize External Resource Validator"
status: in_progress
priority: P1
created: 2025-11-26
---

# US-002: Modularize External Resource Validator

**Feature**: [FS-076](./FEATURE.md)

**As a** developer
**I want** external-resource-validator.ts split into validators/ folder
**So that** each validator is independently editable

---

## Acceptance Criteria

- [x] **AC-US2-01**: Create `src/utils/validators/` folder structure
- [x] **AC-US2-03**: Barrel export maintains existing API
- [x] **AC-US2-04**: All imports continue to work

---

## Implementation

**Increment**: [0076-crash-prevention-refactor](../../../../../../increments/_archive/0076-crash-prevention-refactor/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Analyze external-resource-validator.ts structure
- [x] **T-005**: Create validators/ folder with modules
- [x] **T-006**: Create validators/index.ts barrel export
