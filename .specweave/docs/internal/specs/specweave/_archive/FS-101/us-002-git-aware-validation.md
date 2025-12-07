---
id: US-002
feature: FS-101
title: "Git-Aware Validation"
status: completed
priority: P2
created: 2025-12-03
---

**Origin**: 🏠 **Internal**


# US-002: Git-Aware Validation

**Feature**: [FS-101](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US2-01**: `--staged` flag validates staged git changes
- [x] **AC-US2-02**: `--last-commit` validates most recent commit
- [x] **AC-US2-03**: `--diff <branch>` validates diff against branch
- [x] **AC-US2-04**: Shows which files are being validated
- [x] **AC-US2-05**: Graceful handling when no git repo present

---

## Implementation

**Increment**: [0101-judge-llm-command](../../../../increments/0101-judge-llm-command/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

- [x] [T-003](../../../../increments/0101-judge-llm-command/tasks.md#T-003): Implement git-aware input sources