---
id: US-007
feature: FS-132
title: Cross-Platform Compatibility
status: completed
priority: P1
created: 2025-12-09
project: specweave
external:
  github:
    issue: 876
    url: https://github.com/anton-abyzov/specweave/issues/876
---

# US-007: Cross-Platform Compatibility

**Feature**: [FS-132](./FEATURE.md)

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
- [x] **AC-US7-06**: CI tests run on all three platforms (GitHub Actions matrix)

---

## Implementation

**Increment**: [0132-process-lifecycle-integration](../../../../increments/0132-process-lifecycle-integration/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-009**: Implement Cross-Platform Utilities Layer
- [x] **T-013**: Implement Cross-Platform Notifications
- [x] **T-015**: Add CI Matrix Tests for All Platforms
