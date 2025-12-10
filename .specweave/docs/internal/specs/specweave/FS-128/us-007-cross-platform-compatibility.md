---
id: US-007
feature: FS-128
title: Cross-Platform Compatibility
status: in_progress
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 816
    url: https://github.com/anton-abyzov/specweave/issues/816
---

# US-007: Cross-Platform Compatibility

**Feature**: [FS-128](./FEATURE.md)

**As a** SpecWeave developer on any platform
**I want** zombie prevention to work on macOS, Linux, and Windows
**So that** all team members benefit from automated cleanup

---

## Acceptance Criteria

- [x] **AC-US7-01**: Process existence check works on macOS (`kill -0`), Linux (`kill -0`), Windows (`tasklist`)
- [x] **AC-US7-02**: File locking uses cross-platform atomic operations (`mkdir` for directories)
- [x] **AC-US7-03**: Timestamp extraction works on macOS (`stat -f %m`), Linux (`stat -c %Y`), Windows PowerShell
- [x] **AC-US7-04**: Notifications work on macOS (`osascript`), Linux (`notify-send`), Windows (PowerShell toast)
- [x] **AC-US7-05**: Path separators handled correctly (POSIX `/` vs Windows `\`)

---

## Implementation

**Increment**: [0128-process-lifecycle-zombie-prevention](../../../../increments/0128-process-lifecycle-zombie-prevention/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-013**: Abstract Platform-Specific Operations
- [x] **T-014**: Implement Cross-Platform Notifications
- [ ] **T-015**: Add CI Matrix Tests for All Platforms
