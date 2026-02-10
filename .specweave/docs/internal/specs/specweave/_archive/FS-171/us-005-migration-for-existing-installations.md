---
id: US-005
feature: FS-171
title: "Migration for Existing Installations"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-005: Migration for Existing Installations

**Feature**: [FS-171](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: Migration script `specweave migrate-lazy` handles existing installs
- [x] **AC-US5-02**: Current plugins backed up before migration
- [x] **AC-US5-03**: User memories preserved during migration
- [x] **AC-US5-04**: Rollback command `specweave migrate-lazy --rollback` available
- [x] **AC-US5-05**: Migration is non-destructive and reversible

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-017**: Implement migrate-lazy Command
- [x] **T-018**: Implement Rollback Functionality
- [x] **T-019**: Preserve User Memories During Migration
- [x] **T-036**: Write E2E Tests for Full Flow
- [x] **T-037**: Write Migration Tests
