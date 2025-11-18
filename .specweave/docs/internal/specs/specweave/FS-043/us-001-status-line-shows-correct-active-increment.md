---
id: US-001
feature: FS-043
title: Status Line Shows Correct Active Increment
status: planning
project: specweave
priority: P1
created: 2025-11-18
external:
  github:
    issue: 617
    url: https://github.com/anton-abyzov/specweave/issues/617
---

# US-001: Status Line Shows Correct Active Increment

**Epic**: FS-043
**Priority**: P1
**Status**: Planning
**Story Points**: 5

---

## User Story

**As a** developer working on SpecWeave
**I want** the status line to always show the CURRENT active increment
**So that** I know which increment I'm working on without manually checking folders

---

## Acceptance Criteria

- [ ] **AC-US1-01**: When closing increment via `/specweave:done`, status line updates to next active increment
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (E2E test: close increment → verify status line)

- [ ] **AC-US1-02**: Status line never shows completed increments as active
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (scan all completed increments → verify status line excludes them)

- [ ] **AC-US1-03**: Status line hook reads spec.md and finds correct status (not stale "active")
  - **Tests**: (placeholder - filled by test-aware-planner)
  - **Tasks**: (placeholder - filled by test-aware-planner)
  - **Priority**: P1
  - **Testable**: Yes (integration test: call status line hook → verify parses spec.md correctly)

---

## Example Scenario

```bash
# Before fix (BUG):
$ /specweave:done 0038
✅ Increment 0038 completed
# metadata.json: "status": "completed" ✅
# spec.md: status: active ❌ (STALE!)

$ claude-code  # Start new session
Status line: [0038-serverless-template-verification] ████░░ 12/15 tasks (2 open)
# ❌ WRONG! 0038 is completed, should show 0042

# After fix (CORRECT):
$ /specweave:done 0038
✅ Increment 0038 completed
# metadata.json: "status": "completed" ✅
# spec.md: status: completed ✅ (UPDATED!)

$ claude-code  # Start new session
Status line: [0042-test-infrastructure-cleanup] ████████░ 45/50 tasks (1 open)
# ✅ CORRECT! Shows actual active increment
```

---

## Implementation Notes

No additional implementation notes beyond what's specified in the acceptance criteria.

---

## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-014**: Test /specweave:done Updates spec.md
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
- [ ] **T-023**: Manual Testing Checklist Execution
- [ ] **T-024**: Update User Guide (Troubleshooting Section)
