---
id: US-002
feature: FS-196
title: "Safety Mechanisms"
status: completed
priority: P1
created: 2026-02-10
tldr: "Safety Mechanisms"
project: specweave
---

# US-002: Safety Mechanisms

**Feature**: [FS-196](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: Turn counter hard-stops session at maxTurns (default 20) with informative message
- [x] **AC-US2-02**: Stale sessions (>maxSessionAge) are cleaned up and exit is approved
- [x] **AC-US2-03**: Dedup prevents rapid-fire blocks (<30s apart) using write-first pattern
- [x] **AC-US2-04**: Session state files are cleaned up on successful completion

---

## Implementation

**Increment**: [0196-auto-mode-v5-stop-hook](../../../../increments/0196-auto-mode-v5-stop-hook/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: [RED] Write integration tests for simplified stop hook
