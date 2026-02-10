---
id: US-006
feature: FS-161
title: "Restore Stop Hook Reflection"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-006: Restore Stop Hook Reflection

**Feature**: [FS-161](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US6-01**: Stop hook calls reflection system when session ends gracefully
- [ ] **AC-US6-02**: Reflection analyzes: commands run | files modified | errors encountered | patterns
- [ ] **AC-US6-03**: Learnings saved to `.specweave/memory/*.md` categorized files
- [ ] **AC-US6-04**: User sees: "Session reflection complete. X learnings captured."
- [ ] **AC-US6-05**: Reflection skipped if session <5 minutes (too short to learn from)
- [ ] **AC-US6-06**: Manual trigger: `specweave reflect --session=current`
- [ ] **AC-US6-07**: Reflection disabled if `SPECWEAVE_REFLECT_OFF=1` env var set

---

## Implementation

**Increment**: [0161-hook-execution-visibility-and-command-reliability](../../../../increments/0161-hook-execution-visibility-and-command-reliability/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
