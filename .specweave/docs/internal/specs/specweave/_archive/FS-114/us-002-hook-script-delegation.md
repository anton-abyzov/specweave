---
id: US-002
feature: FS-114
title: Hook Script Delegation
status: completed
priority: P1
created: 2025-12-06
external:
  github:
    issue: 781
    url: https://github.com/anton-abyzov/specweave/issues/781
---

# US-002: Hook Script Delegation

**Feature**: [FS-114](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: `user-prompt-submit.sh` detects status commands
- [x] **AC-US2-02**: Hook executes scripts from `scripts/` folder
- [x] **AC-US2-03**: Hook returns `{"decision":"block","reason":"<output>"}`
- [x] **AC-US2-04**: Execution completes in <1 second

---

## Implementation

**Increment**: [0114-slash-command-script-delegation](../../../../increments/0114-slash-command-script-delegation/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] **T-004**: Modify user-prompt-submit.sh
- [x] **T-006**: Test implementation
