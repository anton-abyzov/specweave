---
id: US-001
feature: FS-142
title: Create Production-Ready Migration Script
status: completed
priority: P1
created: 2025-12-24
project: specweave
external:
  github:
    issue: 918
    url: https://github.com/anton-abyzov/specweave/issues/918
---

# US-001: Create Production-Ready Migration Script

**Feature**: [FS-142](./FEATURE.md)

**As a** SpecWeave maintainer
**I want** a safe, idempotent migration script
**So that** existing increments can be migrated without data loss

---

## Acceptance Criteria

- [x] **AC-US1-01**: Migration script `migrate-project-frontmatter.ts` created
- [x] **AC-US1-02**: Script scans all increments and removes frontmatter `project:` field
- [x] **AC-US1-03**: Script validates per-US fields exist before removing frontmatter
- [x] **AC-US1-04**: Script backs up original spec.md before modification
- [x] **AC-US1-05**: Script logs all changes for review
- [x] **AC-US1-06**: Script is idempotent (can run multiple times safely)
- [x] **AC-US1-07**: Dry-run mode shows changes without modifying
- [x] **AC-US1-08**: Tested successfully on copy of production data

---

## Implementation

**Increment**: [0142-frontmatter-removal-part2-migration](../../../../increments/0142-frontmatter-removal-part2-migration/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-025**: Create Migration Script
- [x] **T-026**: Add Migration Logging and Reporting
- [x] **T-027**: Make Migration Idempotent
- [x] **T-028**: Test Migration on Copy of Data
