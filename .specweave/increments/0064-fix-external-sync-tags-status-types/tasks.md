# Tasks: Fix External Sync Tags, Status, and Types

## Overview

Fix critical gaps in GitHub, JIRA, and ADO synchronization for tags, statuses, priority fields, and work item types.

---

### T-001: Fix ADO Status Tags Application
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed

Update `ado-status-sync.ts` to apply status tags from config when updating work item state.

**Implementation**:
- Read tags from StatusMapper config
- Append new tags to existing System.Tags
- Update both state and tags in single PATCH request

---

### T-002: Add JIRA Native Priority Field
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

Update `jira-spec-sync.ts` to set native Priority field on issue creation/update.

**Implementation**:
- Add priority field mapping (P0→Highest, P1→High, P2→Medium, P3→Low)
- Set `priority` field in issue creation payload
- Update priority on issue updates

---

### T-003: Add ADO Native Priority Field
**User Story**: US-002
**Satisfies ACs**: AC-US2-02, AC-US2-03
**Status**: [x] completed

Update `ado-spec-sync.ts` to set Microsoft.VSTS.Common.Priority field.

**Implementation**:
- Add priority mapping (P0→1, P1→2, P2→3, P3→4)
- Set Priority field in work item creation
- Update priority on work item updates

---

### T-004: Add Bug Type Support to JIRA
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed

Update `jira-spec-sync.ts` to support Bug issue type.

**Implementation**:
- Check spec/increment type field
- Map "bug" → JIRA Bug issue type
- Map "feature" → Epic, "story" → Story (existing)

---

### T-005: Add Bug Type Support to ADO
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed

Update `ado-spec-sync.ts` to support Bug work item type.

**Implementation**:
- Check spec/increment type field
- Map "bug" → ADO Bug work item type
- Keep existing Feature/User Story mappings

---

### T-006: Add Bug Label to GitHub
**User Story**: US-003
**Satisfies ACs**: AC-US3-03, AC-US3-04
**Status**: [x] completed

Update `increment-issue-builder.ts` to add bug label when type is "bug".

**Implementation**:
- Check frontmatter.type field
- Replace default "enhancement" with "bug" when type="bug"
- Ensure consistent type labeling

---

### T-007: Fix GitHub Label Preservation
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed

Update `github-status-sync.ts` to preserve non-status labels.

**Implementation**:
- Fetch current labels before update
- Filter out status: labels
- Merge new status labels with preserved labels

---

### T-008: Add Priority to GitHub Increment Issues
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [x] completed

Update `increment-issue-builder.ts` to include priority labels.

**Implementation**:
- Extract priority from frontmatter or default to P2
- Add lowercase priority label (p0, p1, p2, p3)
- Ensure label format matches user story conventions

---

### T-009: Add Graceful JIRA Transition Handling
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

Update `jira-status-sync.ts` to handle missing transitions gracefully.

**Implementation**:
- Catch transition errors
- Log warning instead of throwing
- Return partial success status

---

### T-010: Run Tests and Validate
**User Story**: All
**Satisfies ACs**: All
**Status**: [x] completed

Run test suite and validate all changes work correctly.

**Implementation**:
- Run npm test
- Validate TypeScript compilation
- Test each sync manually if needed

---

## Progress

- Total: 10 tasks
- Completed: 10
- Remaining: 0
