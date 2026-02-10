---
id: US-005
feature: FS-161
title: "Fix Skill Routing for Core Commands"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-005: Fix Skill Routing for Core Commands

**Feature**: [FS-161](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US5-01**: `/sw:progress` shows increment progress table (not just "62%")
- [ ] **AC-US5-02**: `/sw:status` shows full status with metadata, not generic text
- [ ] **AC-US5-03**: Skill routing validates `CLAUDE_PLUGIN_ROOT` matches current cache location
- [ ] **AC-US5-04**: Routing fallback: if skill fails, try direct CLI command
- [ ] **AC-US5-05**: Error messages distinguish: skill not found | skill execution failed | CLI failed
- [ ] **AC-US5-06**: Cache staleness detection: warn if `CLAUDE_PLUGIN_ROOT` != latest refresh

---

## Implementation

**Increment**: [0161-hook-execution-visibility-and-command-reliability](../../../../increments/0161-hook-execution-visibility-and-command-reliability/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
