---
id: US-006
feature: FS-140
title: Migrate Existing Increments (Backward Compatibility)
status: completed
priority: P1
created: 2025-12-11
project: specweave
external:
  github:
    issue: 903
    url: https://github.com/anton-abyzov/specweave/issues/903
---

# US-006: Migrate Existing Increments (Backward Compatibility)

**Feature**: [FS-140](./FEATURE.md)

**As a** SpecWeave user with existing increments
**I want** my old specs to continue working
**So that** the upgrade doesn't break my workflow

---

## Acceptance Criteria

- [x] **AC-US6-01**: Migration script `migrate-project-frontmatter.ts` created
- [x] **AC-US6-02**: Script scans all increments and removes frontmatter `project:` field
- [x] **AC-US6-03**: Script validates per-US fields are present before removing frontmatter
- [x] **AC-US6-04**: Script backs up original spec.md before modification
- [x] **AC-US6-05**: Script logs all changes for review
- [x] **AC-US6-06**: Script is idempotent (can run multiple times safely)
- [x] **AC-US6-07**: Migration preserves all other frontmatter fields
- [x] **AC-US6-08**: Documentation explains migration process and backward compatibility

---

## Implementation

**Increment**: [0140-remove-frontmatter-project-field](../../../../increments/0140-remove-frontmatter-project-field/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-025**: Create Migration Script
- [x] **T-026**: Add Migration Logging and Reporting
- [x] **T-027**: Make Migration Idempotent
- [x] **T-028**: Test Migration on Copy of Data
- [x] **T-041**: Run Migration Script on Production
- [x] **T-042**: Monitor for Issues Post-Migration
