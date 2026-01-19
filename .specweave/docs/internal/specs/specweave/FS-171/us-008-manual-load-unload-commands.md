---
id: US-008
feature: FS-171
title: "Manual Load/Unload Commands"
status: completed
priority: high
created: 2026-01-18
project: specweave
---

# US-008: Manual Load/Unload Commands

**Feature**: [FS-171](./FEATURE.md)

**As a** power user,
**I want** commands to manually load/unload plugin groups,
**So that** I have fine-grained control over my context.

---

## Acceptance Criteria

- [x] **AC-US8-01**: `specweave load-plugins [group]` loads specific plugin group
- [x] **AC-US8-02**: `specweave unload-plugins` removes loaded skills from active dir
- [x] **AC-US8-03**: Plugin groups: core, github, jira, ado, frontend, backend, infra, ml
- [x] **AC-US8-04**: Loading/unloading respects hot-reload (no restart needed)
- [x] **AC-US8-05**: Help text explains each plugin group's purpose

---

## Implementation

**Increment**: [0171-lazy-plugin-loading](../../../../increments/0171-lazy-plugin-loading/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-023**: Implement load-plugins Command
- [x] **T-024**: Implement unload-plugins Command
- [x] **T-026**: Add Plugin Group Help Text
- [x] **T-027**: Add Shell Completions for New Commands
