---
id: US-006
feature: FS-134
title: "Incremental Update with Change Detection"
status: completed
priority: P1
created: 2025-12-09
project: specweave
---

# US-006: Incremental Update with Change Detection

**Feature**: [FS-134](./FEATURE.md)

**As a** SpecWeave user
**I want** living docs updates to be incremental and fast
**So that** I can run updates frequently without waiting

---

## Acceptance Criteria

- [x] **AC-US6-01**: System uses Git to detect changes since last update:
- [x] **AC-US6-02**: System caches analysis results in `.specweave/cache/analysis/`:
- [x] **AC-US6-03**: System updates only affected documentation sections
- [x] **AC-US6-01**: System uses Git to detect changes since last update
- [x] **AC-US6-02**: System caches analysis results
- [x] **AC-US6-03**: System updates only affected documentation sections

---

## Implementation

**Increment**: [0134-living-docs-core-engine](../../../../increments/0134-living-docs-core-engine/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: Create LivingDocsOrchestrator
- [x] **T-003**: Build Cache Infrastructure with Git-Based Invalidation
- [x] **T-004**: Implement Git Change Detection
