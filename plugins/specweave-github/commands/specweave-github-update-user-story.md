---
name: specweave-github-update-user-story
description: Update GitHub issue for user story with proper ACs and tasks
---

# Update User Story GitHub Issue

**Purpose**: Update an existing GitHub issue for a user story to include:
- ✅ Checkable acceptance criteria (GitHub task checkboxes)
- ✅ Task connections (links to increment tasks)
- ✅ Proper formatting and status

**Usage**:
```bash
/specweave-github:update-user-story FS-031 US-004
```

**What It Does**:

1. **Finds user story file**: `.specweave/docs/internal/specs/{project}/FS-031/us-004-*.md`
2. **Parses content**:
   - User story description (As a... I want... So that...)
   - Acceptance criteria with completion status
   - Tasks from increment tasks.md
3. **Finds existing GitHub issue**: Searches for `[FS-031][US-004]` or `[FS-031 US-004]`
4. **Updates issue body**: Replaces with properly formatted content including:
   - Checkable ACs
   - Task connections
   - Status and progress

**Arguments**:
- `featureId` - Feature ID (e.g., `FS-031`)
- `userStoryId` - User Story ID (e.g., `US-004`)

**Example**:
```bash
# Update US-004 in FS-031
/specweave-github:update-user-story FS-031 US-004

# Output:
# 🔍 Finding user story: FS-031/US-004
#    📄 Found: .specweave/docs/internal/specs/default/FS-031/us-004-bidirectional-status-sync.md
# 🔍 Searching for existing GitHub issue...
#    🔗 Found issue #501: [FS-031][US-004] Bidirectional Status Sync
# 📝 Building updated issue body...
#    ✅ 6 acceptance criteria (4 completed)
#    ✅ 6 tasks (3 completed)
# 🚀 Updating GitHub issue #501...
#    ✅ Updated successfully!
#    🔗 https://github.com/owner/repo/issues/501
```

**What Gets Updated**:

```markdown
**Feature**: [FS-031](../../_features/FS-031/FEATURE.md)
**Status**: complete
**Priority**: P1
**Project**: default

---

## User Story

**As a** PM
**I want** status changes in external tools to sync back to SpecWeave
**So that** both systems stay in sync without manual updates

📄 View full story: [`us-004-bidirectional-status-sync.md`](...)

---

## Acceptance Criteria

Progress: 4/6 criteria met (67%)

- [x] **AC-US4-01**: SpecWeave status change triggers external update (P1, testable)
- [x] **AC-US4-02**: External issue close triggers SpecWeave prompt (P1, testable)
- [x] **AC-US4-03**: External issue reopen triggers SpecWeave prompt (P2, testable)
- [x] **AC-US4-04**: Sync logs include timestamp and reason (P2, testable)
- [ ] **AC-US4-05**: Failed syncs retry with exponential backoff (P2, testable)
- [ ] **AC-US4-06**: Sync works for GitHub, JIRA, and ADO (P1, testable)

---

## Implementation Tasks

Progress: 3/6 tasks complete (50%)

**Increment**: [0031-external-tool-status-sync](../../increments/0031-external-tool-status-sync/)

- [x] [T-008: Create Status Sync Engine (Core)](../../increments/0031/tasks.md#t-008-create-status-sync-engine-core)
- [x] [T-009: Implement GitHub Status Sync](../../increments/0031/tasks.md#t-009-implement-github-status-sync)
- [x] [T-010: Implement JIRA Status Sync](../../increments/0031/tasks.md#t-010-implement-jira-status-sync)
- [ ] [T-011: Implement ADO Status Sync](../../increments/0031/tasks.md#t-011-implement-ado-status-sync)
- [ ] [T-018: Add Sync Event Logging](../../increments/0031/tasks.md#t-018-add-sync-event-logging)
- [ ] [T-021: Error Handling & Retry Logic](../../increments/0031/tasks.md#t-021-error-handling-retry-logic)

---

🤖 Auto-synced by SpecWeave User Story Sync
```

**When to Use**:

- ✅ After completing increment implementation (update task statuses)
- ✅ After modifying acceptance criteria
- ✅ When GitHub issue is missing proper formatting
- ✅ When you want to refresh issue content from living docs

**Related Commands**:
- `/specweave-github:sync-epic FS-031` - Sync entire epic (all user stories)
- `/specweave-github:create-issue 0031` - Create issue for increment
- `/specweave-github:sync 0031` - Bidirectional sync for increment

---

## Implementation

**File**: `plugins/specweave-github/lib/user-story-content-builder.ts`

**Workflow**:
1. Parse user story file with `UserStoryContentBuilder`
2. Search GitHub for existing issue (title pattern matching)
3. Build rich issue body with checkable ACs and task links
4. Update issue via `gh issue edit` with new body

**Error Handling**:
- ✅ Graceful fallback if user story file not found
- ✅ Clear error if GitHub issue doesn't exist
- ✅ Validation of required fields (epic, status, etc.)

---

## Execution

When user runs this command, the Claude Code assistant should:

1. Extract `featureId` and `userStoryId` from command arguments
2. Find user story file in living docs (search all projects)
3. Use `UserStoryContentBuilder` to parse and build issue body
4. Search for existing GitHub issue using `gh issue list --search`
5. Update issue using `gh issue edit --body`
6. Report success with issue URL

**Tech Stack**:
- TypeScript (UserStoryContentBuilder class)
- GitHub CLI (`gh issue list`, `gh issue edit`)
- YAML frontmatter parsing
- Markdown formatting

**Testing**:
- Test with FS-031/US-004 (bidirectional status sync)
- Verify ACs are checkable
- Verify tasks link to correct increment tasks.md
- Verify progress percentages are correct
