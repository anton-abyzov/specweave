---
id: US-004
feature: FS-160
title: "Cache Invalidator"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-004: Cache Invalidator

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US4-01**: Soft invalidation: mark cache as stale in metadata (non-destructive)
- [ ] **AC-US4-02**: Hard invalidation: delete cache directory after creating backup
- [ ] **AC-US4-03**: Backup skill memories before invalidation to `~/.specweave/backups/`
- [ ] **AC-US4-04**: Restore skill memories after marketplace refresh completes
- [ ] **AC-US4-05**: `invalidatePlugin()` accepts strategy ('soft'|'hard') and options (preserveMemories, backupFirst)
- [ ] **AC-US4-06**: Validate backup completed successfully before deletion

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
