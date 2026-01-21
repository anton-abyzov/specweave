---
id: US-005
feature: FS-170
title: "Cross-Platform Compatibility"
status: completed
priority: P0
created: 2026-01-20
project: specweave-dev
---

# US-005: Cross-Platform Compatibility

**Feature**: [FS-170](./FEATURE.md)

**As a** developer on any OS,
**I want** parallel auto mode to work consistently,
**So that** I can use it on macOS, Linux, or Windows.

---

## Acceptance Criteria

- [x] **AC-US5-01**: All git commands work cross-platform
- [x] **AC-US5-02**: Path handling uses forward slashes for git
- [x] **AC-US5-03**: Process spawning works on cmd.exe, PowerShell, bash
- [x] **AC-US5-04**: File locking works on all filesystems
- [x] **AC-US5-05**: Test suite passes on all platforms (CI matrix)
- [x] **AC-US5-06**: Test coverage for platform utils ≥90%

---

## Implementation

**Increment**: [0170-parallel-auto-mode](../../../../increments/0170-parallel-auto-mode/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-002**: Create Platform Utils Module
- [x] **T-003**: Create Platform Utils Tests (90%+ coverage)
- [x] **T-030**: Verify Cross-Platform Compatibility
