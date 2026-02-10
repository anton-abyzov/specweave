---
id: US-003
feature: FS-161
title: "Hook Status Dashboard"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-003: Hook Status Dashboard

**Feature**: [FS-161](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US3-01**: Command `specweave hook-status` shows table of all hooks
- [ ] **AC-US3-02**: Table columns: Hook Name | Last Run | Status | Success Rate (24h) | Avg Duration
- [ ] **AC-US3-03**: Status indicators: ✅ OK | ⚠️  DEGRADED | ❌ FAILED
- [ ] **AC-US3-04**: Degraded = timeout or warning in last 3 executions
- [ ] **AC-US3-05**: Failed = error or 3+ consecutive failures
- [ ] **AC-US3-06**: Summary line: "X/Y hooks healthy, Z issues detected"
- [ ] **AC-US3-07**: Recommendations section with auto-fix suggestions

---

## Implementation

**Increment**: [0161-hook-execution-visibility-and-command-reliability](../../../../increments/0161-hook-execution-visibility-and-command-reliability/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
