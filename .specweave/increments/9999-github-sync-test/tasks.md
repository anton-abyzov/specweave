# Tasks - GitHub Sync Test

## Phase 1: Test Tasks

### T-001: Test Task One
**Priority**: P0
**Estimate**: 1 hour
**Status**: pending

**Description**:
First test task to verify GitHub sync works.

**Subtasks**:
- [ ] S-001-01: Test subtask one (15min)
- [ ] S-001-02: Test subtask two (15min)

**Files to Create**:
- test1.txt

**Acceptance Criteria**:
- ✅ Issue created in GitHub
- ✅ Subtasks appear as checkboxes
- ✅ Linked to epic issue

---

### T-002: Test Task Two
**Priority**: P1
**Estimate**: 1 hour
**Status**: pending

**Description**:
Second test task with dependency on T-001.

**Dependencies**:
- T-001 (must complete first)

**Files to Create**:
- test2.txt

**Acceptance Criteria**:
- ✅ Issue created in GitHub
- ✅ Dependency link shows T-001
- ✅ Linked to epic issue

---

### T-003: Test Task Three
**Priority**: P2
**Estimate**: 1 hour
**Status**: pending

**Description**:
Third test task that blocks future work.

**Blocks**:
- T-999 (future task waiting on this)

**Files to Create**:
- test3.txt

**Acceptance Criteria**:
- ✅ Issue created in GitHub
- ✅ Blocks reference shows T-999
- ✅ Linked to epic issue

---

## Summary

**Total Tasks**: 3
**Total Estimate**: 3 hours
**Priority Breakdown**:
- P0: 1 task
- P1: 1 task
- P2: 1 task
