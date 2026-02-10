---
id: US-001
feature: FS-196
title: "Reliable Auto Mode Blocking"
status: completed
priority: P1
created: 2026-02-10
tldr: "Reliable Auto Mode Blocking"
project: specweave
---

# US-001: Reliable Auto Mode Blocking

**Feature**: [FS-196](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US1-01**: Hook blocks exit when auto-mode.json active=true AND active increments have pending tasks
- [x] **AC-US1-02**: Hook approves exit when all tasks and ACs are complete
- [x] **AC-US1-03**: Hook approves exit silently when auto mode is not active
- [x] **AC-US1-04**: Block decisions are logged to decisions.jsonl with turn/increment context
- [x] **AC-US1-05**: Block message is concise (<500 chars) with increment ID, task count, and next command

---

## Implementation

**Increment**: [0196-auto-mode-v5-stop-hook](../../../../increments/0196-auto-mode-v5-stop-hook/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-001**: [RED] Write integration tests for simplified stop hook
- [x] **T-003**: [GREEN] Implement simplified stop-auto-v5.sh (~175 lines)
- [x] **T-009**: Run all tests and manual verification
