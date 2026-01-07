---
id: US-009
feature: FS-160
title: "Enhanced refresh-marketplace with Pre-check"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-009: Enhanced refresh-marketplace with Pre-check

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US9-01**: Before marketplace update, run cache health check
- [ ] **AC-US9-02**: Auto-invalidate caches with critical issues (merge conflicts, syntax errors)
- [ ] **AC-US9-03**: Show warning: `⚠️ {plugin}: {reason}` for each invalidation
- [ ] **AC-US9-04**: Preserve skill memories during auto-invalidation
- [ ] **AC-US9-05**: Continue with normal refresh flow after pre-check

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
