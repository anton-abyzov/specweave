---
id: US-003
feature: FS-074
title: "Background Job Support for Large Imports (DESCOPED)"
status: not_started
priority: P0
created: 2025-11-26
---

# US-003: Background Job Support for Large Imports (DESCOPED)

**Feature**: [FS-074](./FEATURE.md)

**As a** user importing from repos with many issues (100+)
**I want** imports to run in background
**So that** I can continue working while import completes

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Imports with >50 items trigger background job prompt
- [ ] **AC-US3-02**: Background job progress visible via `/specweave:jobs`
- [ ] **AC-US3-03**: Job can be paused/resumed
- [ ] **AC-US3-04**: Completion notification when done

---

## Implementation

**Increment**: [0074-fix-internal-feature-collision-and-import](../../../../../../increments/_archive/0074-fix-internal-feature-collision-and-import/spec.md)

**Tasks**: See increment tasks.md for implementation details.
