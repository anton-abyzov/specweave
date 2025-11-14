# Hierarchical GitHub Issue Format Implementation

**Date**: 2025-11-14
**Issue**: #375 Updated
**Increment**: 0032-prevent-increment-number-gaps

## Problem Statement

GitHub issues for Feature Specs (FS-*) were showing:
1. ❌ Single "Increment:" field (but Epics span multiple increments!)
2. ❌ Flat task list (no visibility into which tasks implement which User Stories)
3. ❌ No User Story tracking (impossible to see US completion status)
4. ❌ No traceability (couldn't map tasks → user stories → increments)

**Old Format**:
```markdown
**Increment**: 0031-external-tool-status-sync  ← WRONG! Multiple increments possible

## Tasks
- [ ] T-001: Create Enhanced Content Builder
- [ ] T-002: Create Spec-to-Increment Mapper
...  ← Flat list, no grouping
```

## Solution

Implemented hierarchical GitHub issue format that:
1. ✅ Removes single "Increment:" field
2. ✅ Shows User Stories with status and increment(s)
3. ✅ Groups tasks by User Story
4. ✅ Shows which increment each US/task belongs to
5. ✅ Provides complete traceability (Epic → US → Tasks → Increments)

**New Format**:
```markdown
## User Stories

Progress: 7/7 user stories complete (100%)

- [x] **US-001: Rich External Issue Content** (✅ complete | Increment: [0031](link))
- [x] **US-002: Task-Level Mapping** (✅ complete | Increment: [0031](link))
- [x] **US-003: Status Mapping** (✅ complete | Increment: [0031](link))
...  ← Shows ALL user stories with their status and increment

---

## Tasks by User Story

Progress: 19/19 tasks complete (100%)

### US-001: Rich External Issue Content (Increment: [0031](link))
- [x] T-001: Create Enhanced Content Builder
- [x] T-003: Enhance GitHub Content Sync
- [x] T-004: Enhance JIRA Content Sync
- [x] T-005: Enhance ADO Content Sync

### US-002: Task-Level Mapping (Increment: [0031](link))
- [x] T-002: Create Spec-to-Increment Mapper

### US-003: Status Mapping (Increment: [0031](link))
- [x] T-006: Create Status Mapper
- [x] T-013: Update Configuration Schema
- [x] T-014: Create Default Status Mappings

...  ← Tasks grouped by User Story with increment links
```

## Implementation

### 1. EpicContentBuilder Class

**File**: `plugins/specweave-github/lib/epic-content-builder.ts`

**Responsibilities**:
- Read FEATURE.md (Epic metadata)
- Read all us-*.md files (User Stories)
- Extract tasks from increment's tasks.md files
- Map tasks to User Stories (via Implementation section)
- Generate hierarchical issue body

**Key Features**:
- Reads frontmatter from FEATURE.md and us-*.md files
- Extracts increment links from User Story Implementation sections
- Parses tasks.md to get task completion status
- Groups tasks by User Story automatically
- Generates checkable lists for both US and tasks

**Architecture**:
```
EpicContentBuilder
├── readEpicMetadata()        # Read FEATURE.md frontmatter
├── readUserStories()         # Read all us-*.md files
├── extractTasksForUserStory() # Parse tasks.md for each US
├── buildUserStoriesSection()  # Generate US section
└── buildTasksSection()        # Generate tasks grouped by US
```

### 2. Epic Issue Body Generator Script

**File**: `scripts/generate-epic-issue-body.ts`

**Usage**:
```bash
npx tsx scripts/generate-epic-issue-body.ts <epic-id> <increment-id>

# Example
npx tsx scripts/generate-epic-issue-body.ts FS-25-11-12-external-tool-status-sync 0031-external-tool-status-sync
```

**Responsibilities**:
- CLI wrapper for EpicContentBuilder
- Find Epic folder by ID (supports FS-XXX and date formats)
- Fallback to simple format if Epic folder doesn't exist yet
- Output hierarchical issue body to stdout

**Exit Codes**:
- `0` - Success
- `1` - Error (Epic not found, FEATURE.md missing, etc.)
- `2` - Fallback mode (Epic folder doesn't exist yet)

### 3. GitHubEpicSync Updates

**File**: `plugins/specweave-github/lib/github-epic-sync.ts`

**Changes**:
- Updated `createIssue()` method to use EpicContentBuilder
- Updated `updateIssue()` method to use EpicContentBuilder
- Both methods now generate hierarchical issue bodies

**Usage** (via command):
```bash
# Sync Epic to GitHub (creates Milestone + Issues)
/specweave-github:sync-epic FS-25-11-12
```

## Benefits

### For Stakeholders
✅ **Complete Visibility**: See all user stories and their status at a glance
✅ **Perfect Traceability**: Instantly see which increment implemented which US
✅ **Progress Tracking**: Two-level progress (US completion + task completion)
✅ **Context-Rich**: Each US shows status, increment, and related tasks

### For Developers
✅ **Clear Structure**: Tasks organized by User Story (not flat list)
✅ **Easy Navigation**: Click increment links to see implementation details
✅ **Accurate Status**: Tasks reflect actual completion from tasks.md
✅ **Multi-Increment Support**: Shows when US spans multiple increments

### For Team Collaboration
✅ **Better Planning**: See which USs are complete vs. which need work
✅ **Clearer Dependencies**: Understand which tasks implement which USs
✅ **Historical Record**: Track which increment delivered which features
✅ **LLM-Friendly**: AI assistants can understand the hierarchical structure

## Testing

### Test Case 1: FS-25-11-12 (Complete Epic)

**Command**:
```bash
npx tsx scripts/generate-epic-issue-body.ts FS-25-11-12-external-tool-status-sync 0031-external-tool-status-sync
```

**Result**: ✅ Success
- Generated hierarchical issue body
- 7 User Stories (all complete)
- 19 Tasks grouped by US
- All links work correctly

**Issue Updated**: #375 - https://github.com/anton-abyzov/specweave/issues/375

### Test Case 2: GitHub Issue Update

**Command**:
```bash
gh issue edit 375 --body-file <generated-body>
```

**Result**: ✅ Success
- Issue #375 updated with new format
- All sections render correctly in GitHub UI
- Checkboxes work (can check/uncheck)
- Links navigate correctly

## Multi-Increment Support

The new format supports Epics that span multiple increments:

```markdown
## User Stories

- [x] **US-001: Authentication** (✅ complete | Increment: [0031](link))
- [x] **US-002: Authorization** (✅ complete | Increment: [0031](link))
- [ ] **US-003: Session Management** (📋 planning | Increment: [0032](link))
- [ ] **US-004: Password Reset** (⏳ not-started | Increment: TBD)
```

**Key Feature**: Each User Story shows which increment it belongs to, allowing Epics to be implemented across multiple increments.

## Future Enhancements

### 1. Auto-Update Hook Integration

Update `post-increment-planning.sh` hook to use the new script:

```bash
# In post-increment-planning.sh
issue_body=$(npx tsx scripts/generate-epic-issue-body.ts "$epic_id" "$increment_id" 2>&1)
exit_code=$?

if [ $exit_code -eq 2 ]; then
  # Fallback: Epic folder doesn't exist yet
  # Use simple format for now, update later after living docs sync
  issue_body="..."
fi
```

### 2. Progress Bar Visualization

Add visual progress bars for US and task completion:

```markdown
## User Stories

Progress: 7/7 user stories complete (100%)
████████████████████████████████ 100%

## Tasks by User Story

Progress: 19/19 tasks complete (100%)
████████████████████████████████ 100%
```

### 3. Multi-Project Support

Extend to show which project each US/task belongs to:

```markdown
- [x] **US-001: Authentication** (✅ complete | Project: Backend | Increment: 0031)
- [x] **US-002: Login UI** (✅ complete | Project: Frontend | Increment: 0031)
```

### 4. Acceptance Criteria Display

Show AC status for each User Story:

```markdown
- [x] **US-001: Authentication** (✅ complete | Increment: 0031)
  - [x] AC-US1-01: User can log in with email
  - [x] AC-US1-02: User can log in with OAuth
  - [x] AC-US1-03: Invalid credentials show error
```

## Files Changed

**New Files**:
- `plugins/specweave-github/lib/epic-content-builder.ts` (373 lines)
- `scripts/generate-epic-issue-body.ts` (106 lines)
- `.specweave/increments/0032-prevent-increment-number-gaps/reports/HIERARCHICAL-GITHUB-ISSUE-FORMAT.md` (this file)

**Modified Files**:
- `plugins/specweave-github/lib/github-epic-sync.ts` (updated createIssue/updateIssue methods)

**Total**: 3 new files, 1 modified file, ~500 lines of code

## Conclusion

The hierarchical GitHub issue format provides:
1. ✅ **Complete Epic visibility** (all USs shown)
2. ✅ **Clear traceability** (tasks → USs → increments)
3. ✅ **Multi-increment support** (Epics can span multiple increments)
4. ✅ **Better team collaboration** (stakeholders see full picture)
5. ✅ **LLM-friendly structure** (AI can understand relationships)

**Demo**: See issue #375 for live example - https://github.com/anton-abyzov/specweave/issues/375

---

**Implementation Complete**: 2025-11-14
**Status**: ✅ Tested and deployed
