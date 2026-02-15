---
id: US-001
feature: FS-206
title: Fix Silent Event Drop in ProjectService
status: completed
priority: P1
created: 2026-02-15
tldr: Fix Silent Event Drop in ProjectService
project: specweave
external:
  github:
    issue: 1163
    url: "https://github.com/anton-abyzov/specweave/issues/1163"
---

# US-001: Fix Silent Event Drop in ProjectService

**Feature**: [FS-206](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: `getProjectForIncrement()` falls back to config-based project when spec.md has no `project:` field
- [x] **AC-US1-02**: `emitIncrementEvent()` no longer silently drops events for increments without project field
- [x] **AC-US1-03**: `increment.sync` event type handled as catch-all in ProjectService

---

## Implementation

**Increment**: [0206-universal-external-sync-fix](../../../../increments/0206-universal-external-sync-fix/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
