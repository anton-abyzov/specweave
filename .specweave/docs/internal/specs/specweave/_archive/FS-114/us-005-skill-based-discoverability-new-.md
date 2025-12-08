---
id: US-005
feature: FS-114
title: Skill-Based Discoverability (NEW)
status: completed
priority: P1
created: 2025-12-06
external:
  github:
    issue: 784
    url: https://github.com/anton-abyzov/specweave/issues/784
---

# US-005: Skill-Based Discoverability (NEW)

**Feature**: [FS-114](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US5-01**: `skills/instant-status/SKILL.md` exists with execution instructions
- [x] **AC-US5-02**: Skill activates for `/specweave:status`, `/specweave:progress`, `/specweave:jobs`
- [x] **AC-US5-03**: Skill instructs ANY LLM to execute scripts via shell (portable)
- [x] **AC-US5-04**: Skill documents all three execution paths (hook, skill, CLI)

---

## Implementation

**Increment**: [0114-slash-command-script-delegation](../../../../increments/0114-slash-command-script-delegation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-007**: Create instant-status skill
