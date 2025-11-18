# ULTRATHINK: Correct GitHub Issue Format for User Stories

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Purpose**: Document the CORRECT GitHub issue format based on increment 0037 architecture
**Audience**: Contributors fixing GitHub sync bugs

---

## Executive Summary

**PROBLEM**: GitHub issues for user stories have inconsistent formats across different code paths, leading to:
- Wrong title format (`US-001: Title` instead of `[FS-043][US-001] Title`)
- Missing Tasks section (tasks.md content not synced)
- Broken links (404s on living docs)
- Status sync failures

**SOLUTION**: This document defines the ONE TRUE FORMAT based on increment 0037's 3-layer architecture (Increment → Living Docs → GitHub).

**KEY INSIGHT**: GitHub issues are created FROM living docs user stories, NOT directly from increments!

---

## 1. Correct Title Format

### Format Specification

**Pattern**: `[FS-XXX][US-XXX] {Title}`

**Examples**:
- `[FS-031][US-001] Rich External Issue Content`
- `[FS-043][US-001] Status Line Shows Correct Active Increment`
- `[FS-037][US-006] Copy ACs and Tasks to User Story Implementation Section`

**Code Location**: `plugins/specweave-github/lib/user-story-issue-builder.ts:94`

```typescript
// ✅ CORRECT FORMAT
const title = `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;
```

### Format Breakdown

```
[FS-043][US-001] Status Line Shows Correct Active Increment
 ^^^^^^  ^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |       |                    |
Feature   User                Title
  ID     Story               (from
        (from              frontmatter)
    featureId)
```

**Why This Format?**
1. **Feature Grouping**: GitHub search can find all issues for `FS-043`
2. **User Story Tracing**: Each US has unique identifier within feature
3. **Clarity**: Stakeholders see feature context immediately
4. **Consistency**: All SpecWeave issues follow same pattern

### Anti-Patterns (WRONG Formats)

❌ **Wrong Format #1**: `US-001: Title` (missing Feature ID)
- **Why Wrong**: No feature context, breaks search
- **Where Found**: Old code paths before increment 0034

❌ **Wrong Format #2**: `[Increment 0043] Title` (increment-centric)
- **Why Wrong**: Violates 3-layer architecture (bypasses living docs)
- **Where Found**: Direct increment creation (GitHub Manager agent)

❌ **Wrong Format #3**: `[FS-043] Title` (missing User Story ID)
- **Why Wrong**: Can't track individual user stories
- **Where Found**: Feature-level issues (acceptable for Feature overview, but not for US)

### Test Coverage

**Unit Tests**: `tests/unit/user-story-issue-builder.test.ts:74`

```typescript
it('should read feature: field from user story frontmatter (not epic:)', async () => {
  // ...
  const result = await builder.buildIssueBody();

  // ✅ VALIDATES CORRECT FORMAT
  expect(result.title).toBe('[FS-031][US-001] Test User Story');
  expect(result.body).toContain('**Feature**: FS-031');
});
```

**Integration Tests**: `tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts:110`

```typescript
{
  title: '[FS-999][US-001] Existing Issue Test',
  // ✅ Uses correct format in test data
}
```

---

## 2. Tasks Section Format

### Complete Example

```markdown
## Tasks

> **Source**: Copied from `.specweave/increments/0043/tasks.md`
> **Status**: Synced automatically when increment tasks change

- [ ] **T-001**: Setup API endpoint for /auth/login
- [ ] **T-003**: Add DB migration for users table
- [x] **T-005**: Implement JWT token generation (completed)

> **Last synced**: 2025-11-18 (auto-updates via living docs sync)
```

### Format Specification

**Pattern**: `- [{checkbox}] **{task-id}**: {task-title}`

**Checkbox States**:
- `[ ]` - Not started
- `[x]` - Completed

**Examples**:
- `- [ ] **T-001**: Setup API endpoint for /auth/login`
- `- [x] **T-005**: Implement JWT token generation`

### Code Location: Task Extraction

**File**: `plugins/specweave-github/lib/user-story-issue-builder.ts:216-252`

```typescript
/**
 * Extract tasks from user story's ## Tasks section (NEW architecture)
 *
 * Previously: Read from increment tasks.md (LEGACY)
 * Now: Read from user story's ## Tasks section directly
 */
private async extractTasks(
  userStoryContent: string,
  userStoryId: string
): Promise<Task[]> {
  const tasks: Task[] = [];

  // ✅ NEW: Look for ## Tasks section in user story file
  const tasksMatch = userStoryContent.match(
    /##\s+Tasks\s*\n+([\s\S]*?)(?=\n##|>?\s*\*\*Note\*\*:|---+|$)/i
  );

  if (!tasksMatch) {
    // FALLBACK: Try old architecture (read from increment tasks.md)
    console.log(`   ℹ️  No ## Tasks section found in ${userStoryId}, falling back to legacy extraction`);
    return this.extractTasksLegacy(userStoryContent, userStoryId);
  }

  const tasksSection = tasksMatch[1];

  // Pattern: - [x] **T-001**: Task title or - [ ] **T-001**: Task title
  const taskPattern = /^[-*]\s+\[([x ])\]\s+\*\*(T-\d+)\*\*:\s+(.+)$/gm;

  let match;
  while ((match = taskPattern.exec(tasksSection)) !== null) {
    const completed = match[1] === 'x';
    const taskId = match[2];
    const taskTitle = match[3].trim();

    tasks.push({
      id: taskId,
      title: taskTitle,
      completed // ✅ Read checkbox state directly from user story!
    });
  }

  return tasks;
}
```

### Data Flow: Tasks Section

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: INCREMENT TASKS.MD (Source of Truth)              │
│                                                              │
│ ### T-001: Setup API endpoint                              │
│ **Status**: [ ] (0% - Not started)                         │
│ **AC**: AC-US1-01                                           │
│                                                              │
│ ### T-005: Implement JWT token generation                  │
│ **Status**: [x] (100% - Completed)                         │
│ **AC**: AC-US1-01                                           │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (COPY to living docs - filtered by AC-ID)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: LIVING DOCS USER STORY                             │
│                                                              │
│ specs/backend/FS-031/us-001-authentication.md               │
│                                                              │
│ ## Tasks                                                    │
│                                                              │
│ - [ ] **T-001**: Setup API endpoint for /auth/login        │
│ - [x] **T-005**: Implement JWT token generation            │
│                                                              │
│ > **Note**: Tasks are project-specific. See increment       │
│ > tasks.md for full list                                    │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (GitHub sync - read from user story file)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: GITHUB ISSUE                                       │
│                                                              │
│ Issue #123: [FS-031][US-001] Authentication (Backend)      │
│                                                              │
│ ## Tasks                                                    │
│                                                              │
│ - [ ] **T-001**: Setup API endpoint for /auth/login        │
│ - [x] **T-005**: Implement JWT token generation            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Task Sync Mechanism

**Three-Layer Bidirectional Sync** (from increment 0037):

**Flow 1: Developer completes task** (Increment → Living Docs → GitHub)

```
1. Developer marks task complete in increment tasks.md
   ↓
2. Living docs sync detects change (/specweave:sync-docs update)
   ↓
3. User Story file ## Tasks section updated (checkbox [x])
   ↓
4. GitHub sync detects change (/specweave-github:sync-spec)
   ↓
5. GitHub issue ## Tasks section updated (checkbox [x])
```

**Flow 2: Stakeholder checks task** (GitHub → Living Docs → Increment)

```
1. Stakeholder checks task checkbox in GitHub issue
   ↓
2. GitHub webhook/sync detects change
   ↓
3. User Story file ## Tasks section updated (checkbox [x])
   ↓
4. Increment tasks.md updated (source of truth)
```

**Code Locations**:
- Task generation: `src/core/living-docs/task-project-specific-generator.ts`
- GitHub sync: `plugins/specweave-github/lib/user-story-issue-builder.ts:216-252`
- Bidirectional sync: `plugins/specweave-github/lib/github-issue-updater.ts`

### Test Requirements

**Missing Tests** (Need to Create):

1. **Test: Tasks section exists in GitHub issue**
   ```typescript
   it('should include ## Tasks section with checkboxes', async () => {
     // Arrange: User story with tasks
     const userStoryPath = '...';
     const userStoryContent = `
       ## Tasks
       - [ ] **T-001**: Setup API
       - [x] **T-005**: Implement JWT
     `;

     // Act: Build issue body
     const builder = new UserStoryIssueBuilder(userStoryPath, projectRoot, 'FS-043');
     const result = await builder.buildIssueBody();

     // Assert: Tasks appear as checkboxes
     expect(result.body).toContain('## Tasks');
     expect(result.body).toContain('- [ ] **T-001**: Setup API');
     expect(result.body).toContain('- [x] **T-005**: Implement JWT');
   });
   ```

2. **Test: Tasks sync after increment change**
   ```typescript
   it('should sync tasks when increment tasks.md changes', async () => {
     // 1. Create increment with tasks
     // 2. Run /specweave:sync-docs update
     // 3. Verify user story ## Tasks section updated
     // 4. Run /specweave-github:sync-spec
     // 5. Verify GitHub issue ## Tasks updated
   });
   ```

3. **Test: Task checkbox state preserved**
   ```typescript
   it('should preserve task completion status during sync', async () => {
     // 1. Mark task complete in increment tasks.md
     // 2. Sync to user story
     // 3. Verify [x] checkbox in user story
     // 4. Sync to GitHub
     // 5. Verify [x] checkbox in GitHub issue
   });
   ```

---

## 3. Link Generation

### Link Format Specification

**Base URL Pattern**: `https://github.com/{owner}/{repo}/blob/{branch}/.specweave/...`

**Examples**:
- Feature Spec: `https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/_features/FS-043/FEATURE.md`
- User Story File: `https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line.md`
- Increment: `https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0043-spec-md-desync-fix`

### Code Location: Link Generation

**File**: `plugins/specweave-github/lib/user-story-issue-builder.ts:494-514`

```typescript
// Generate proper GitHub blob URLs
if (this.repoOwner && this.repoName) {
  const baseUrl = `https://github.com/${this.repoOwner}/${this.repoName}/blob/${this.branch}`;

  // Feature Spec link
  sections.push(`- **Feature Spec**: [${this.featureId}](${baseUrl}/.specweave/docs/internal/specs/_features/${this.featureId}/FEATURE.md)`);

  // User Story File link (relative to project root)
  const relativeUSPath = path.relative(this.projectRoot, this.userStoryPath);
  sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${baseUrl}/${relativeUSPath})`);

  // Increment link (extracted from Implementation section)
  const incrementMatch = implMatch?.[1]?.match(/\*\*Increment\*\*:\s*\[([^\]]+)\]/);
  if (incrementMatch) {
    const incrementId = incrementMatch[1];
    sections.push(`- **Increment**: [${incrementId}](${baseUrl}/.specweave/increments/${incrementId})`);
  }
} else {
  // Fallback to relative links if repo info not provided
  sections.push(`- **Feature Spec**: [${this.featureId}](../.specweave/docs/internal/specs/_features/${this.featureId}/FEATURE.md)`);
  sections.push(`- **User Story File**: [${path.basename(this.userStoryPath)}](${this.userStoryPath})`);
}
```

### Branch Configuration

**Default Branch**: `develop` (line 64)

```typescript
this.branch = repoInfo?.branch || 'develop';
```

**Why `develop`?**
- Living docs are synced to `develop` branch (not `main`)
- All active increments work on `develop`
- `main` is for stable releases only

### Link Validation

**Common 404 Causes**:

1. **Wrong branch**: Using `main` instead of `develop`
   ```
   ❌ https://github.com/.../blob/main/.specweave/...
   ✅ https://github.com/.../blob/develop/.specweave/...
   ```

2. **Missing `.specweave` prefix**: Linking to wrong path
   ```
   ❌ https://github.com/.../blob/develop/docs/internal/...
   ✅ https://github.com/.../blob/develop/.specweave/docs/internal/...
   ```

3. **Wrong file extension**: Using `.md` when file is directory
   ```
   ❌ https://github.com/.../increments/0043.md
   ✅ https://github.com/.../increments/0043-spec-md-desync-fix
   ```

### Test Requirements

**Missing Tests** (Need to Create):

1. **Test: Links don't 404**
   ```typescript
   it('should generate valid GitHub blob URLs', async () => {
     // Arrange: User story with repo info
     const builder = new UserStoryIssueBuilder(
       userStoryPath,
       projectRoot,
       'FS-043',
       { owner: 'anton-abyzov', repo: 'specweave', branch: 'develop' }
     );

     // Act: Build issue body
     const result = await builder.buildIssueBody();

     // Assert: Links are correctly formed
     expect(result.body).toContain('https://github.com/anton-abyzov/specweave/blob/develop');
     expect(result.body).toContain('/.specweave/docs/internal/specs/_features/FS-043/FEATURE.md');
     expect(result.body).not.toContain('blob/main'); // Should use develop
   });
   ```

2. **Test: Links point to existing files** (E2E)
   ```typescript
   it('should generate links to existing files (no 404s)', async () => {
     // 1. Create user story and increment
     // 2. Sync to living docs
     // 3. Build GitHub issue
     // 4. Extract all links from issue body
     // 5. Verify each file exists in repo
   });
   ```

---

## 4. Complete GitHub Issue Format

### Full Example

```markdown
Title: [FS-043][US-001] Status Line Shows Correct Active Increment

Body:
**Feature**: FS-043
**Status**: Active
**Priority**: P1
**Project**: specweave

## Progress

**Overall**: 60% complete (3/5 ACs, 6/10 tasks)
- ✅ Acceptance Criteria: 60% (3/5)
- ⏳ Tasks: 60% (6/10)

## User Story

**As a** developer using SpecWeave
**I want** the status line to show the correct active increment
**So that** I always know which increment I'm working on

## Acceptance Criteria

- [x] **AC-US1-01**: Status line reads increment ID from correct source
- [ ] **AC-US1-02**: Status line handles missing increment gracefully
- [x] **AC-US1-03**: Status line updates when increment changes
- [ ] **AC-US1-04**: Error messages show helpful debugging info
- [x] **AC-US1-05**: Status parser validates increment format

## Tasks

> **Source**: Copied from `.specweave/increments/0043/tasks.md`
> **Status**: Synced automatically when increment tasks change

- [x] **T-001**: Identify root cause of status line bug
- [x] **T-002**: Add debug logging to status parser
- [ ] **T-003**: Update status parser to use correct source
- [x] **T-004**: Add error handling for missing increment
- [ ] **T-005**: Write unit tests for status parser
- [x] **T-006**: Write integration tests for status line
- [ ] **T-007**: Update documentation
- [x] **T-008**: Verify fix works in E2E scenarios
- [ ] **T-009**: Deploy to production
- [x] **T-010**: Monitor for regressions

> **Last synced**: 2025-11-18 (auto-updates via living docs sync)

## Business Rationale

The status line is critical for developer UX. When it shows the wrong increment, developers:
- Edit the wrong files
- Commit to wrong branches
- Waste time debugging confusion

This bug has a high impact despite being small in scope.

## Implementation

**Increment**: [0043-spec-md-desync-fix](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0043-spec-md-desync-fix)

**Source Tasks**: See increment tasks.md for complete task breakdown

---

## Links

- **Feature Spec**: [FS-043](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/_features/FS-043/FEATURE.md)
- **User Story File**: [us-001-status-line-shows-correct-active-increment.md](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line-shows-correct-active-increment.md)
- **Increment**: [0043-spec-md-desync-fix](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/increments/0043-spec-md-desync-fix)

---

🤖 Auto-created by SpecWeave User Story Sync | Updates automatically
```

---

## 5. Code Locations to Fix

### Primary Code Paths

**1. User Story Issue Builder** (CORRECT PATH - Already Works)
- **File**: `plugins/specweave-github/lib/user-story-issue-builder.ts`
- **Lines**: 94 (title), 216-252 (tasks), 494-514 (links)
- **Status**: ✅ CORRECT - No fixes needed

**2. GitHub Manager Agent** (WRONG PATH - Needs Deprecation)
- **File**: `plugins/specweave-github/agents/github-manager/AGENT.md`
- **Lines**: 148, 246, 390
- **Status**: ❌ WRONG - Uses `[Increment XXXX]` format
- **Action**: Add warning to deprecate direct increment issue creation

**3. Feature Sync** (Orchestrator)
- **File**: `plugins/specweave-github/lib/github-feature-sync.ts`
- **Status**: ✅ CORRECT - Uses UserStoryIssueBuilder
- **Action**: Ensure all sync paths go through this

### Test Locations

**Existing Tests** (Already Correct):
1. `tests/unit/user-story-issue-builder.test.ts:74` - Title format
2. `tests/unit/user-story-issue-builder.test.ts:113-194` - Project field
3. `tests/unit/user-story-issue-builder.test.ts:200+` - AC checkbox state
4. `tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts:110` - Title format

**Missing Tests** (Need to Create):

1. **File**: `tests/integration/external-tools/github/github-issue-format-validation.test.ts`
   - Test title format `[FS-XXX][US-XXX]`
   - Test Tasks section exists
   - Test Tasks checkbox state
   - Test Links don't 404

2. **File**: `tests/e2e/github-user-story-sync.test.ts` (enhance existing)
   - Add assertion for Tasks section
   - Add assertion for task sync after increment change
   - Add assertion for link validation

---

## 6. Validation Checklist

Use this checklist to validate GitHub issues for user stories:

### Title Format ✅
- [ ] Format is `[FS-XXX][US-XXX] Title`
- [ ] Feature ID matches user story frontmatter
- [ ] User Story ID matches user story frontmatter
- [ ] Title matches user story frontmatter

### Tasks Section ✅
- [ ] `## Tasks` section exists
- [ ] Tasks are formatted as `- [{checkbox}] **{task-id}**: {task-title}`
- [ ] Checkbox state matches increment tasks.md
- [ ] Only project-specific tasks included (filtered by AC-ID)
- [ ] Source note present: `> **Source**: Copied from ...`
- [ ] Last synced timestamp present

### Links ✅
- [ ] Feature Spec link exists and is valid
- [ ] User Story File link exists and is valid
- [ ] Increment link exists and is valid
- [ ] All links use `blob/develop` (not `blob/main`)
- [ ] All links include `.specweave/` prefix
- [ ] No links return 404

### Sync Behavior ✅
- [ ] Task completion in increment → syncs to user story → syncs to GitHub
- [ ] Task completion in GitHub → syncs to user story → syncs to increment
- [ ] AC completion in increment → syncs to user story → syncs to GitHub
- [ ] Status changes trigger sync

### Metadata ✅
- [ ] `**Feature**: FS-XXX` field present
- [ ] `**Status**: {status}` field present
- [ ] `**Priority**: {priority}` field present
- [ ] `**Project**: {project}` field present (if not "default")
- [ ] Progress section shows accurate completion %

---

## 7. Examples from Real Increments

### Increment 0031 (External Tool Status Sync)

**Living Docs User Story**:
`.specweave/docs/internal/specs/specweave/FS-031/us-001-rich-external-issue-content.md`

**GitHub Issue**:
`#565: [FS-031][US-001] Rich External Issue Content`

**Tasks Section**:
```markdown
## Tasks

- [x] **T-001**: Define standard issue body format
- [x] **T-002**: Create issue body builder class
- [x] **T-003**: Add acceptance criteria formatting
- [x] **T-004**: Add task list formatting
- [x] **T-005**: Add progress indicators
```

### Increment 0034 (GitHub AC Checkboxes Fix)

**Living Docs User Story**:
`.specweave/docs/internal/specs/specweave/FS-034/us-001-github-issue-creation.md`

**GitHub Issue**:
`#599: [FS-034][US-001] GitHub Issue Creation with Checkable Task Lists`

**Tasks Section**:
```markdown
## Tasks

- [x] **T-001**: Add project-specific task generator
- [x] **T-002**: Update spec-distributor to generate ## Tasks section
- [x] **T-003**: Modify user-story-issue-builder to read ## Tasks
- [x] **T-004**: Add backward compatibility fallback
```

---

## 8. Migration Guide

### For Existing Issues with Wrong Format

**Step 1: Identify issues with wrong format**
```bash
# Search for issues with wrong title format
gh issue list --label specweave --json number,title | \
  jq '.[] | select(.title | test("^\\[Increment") or test("^US-"))'
```

**Step 2: Sync to living docs**
```bash
# Ensure living docs are up to date
/specweave:sync-docs update
```

**Step 3: Re-sync to GitHub**
```bash
# Re-create issues with correct format
/specweave-github:sync-spec specweave/FS-XXX
```

**Step 4: Close old issues**
```bash
# Close old issues with wrong format
gh issue close {old-issue-number} --comment "Replaced by #{new-issue-number} with correct format"
```

---

## 9. Summary

### The ONE TRUE FORMAT

**Title**: `[FS-XXX][US-XXX] Title`

**Body Structure**:
1. Metadata (Feature, Status, Priority, Project)
2. Progress (Overall completion %)
3. User Story statement
4. Acceptance Criteria (checkboxes)
5. **Tasks** (checkboxes, synced from increment)
6. Business Rationale (optional)
7. Implementation (increment link)
8. Links (Feature Spec, User Story File, Increment)
9. Auto-creation footer

**Key Rules**:
- ✅ Created FROM living docs user stories (3-layer architecture)
- ✅ Tasks copied from increment tasks.md (filtered by AC-ID)
- ✅ Links use `blob/develop` (not `blob/main`)
- ✅ Bidirectional sync (GitHub ↔ Living Docs ↔ Increment)

### Code Locations

**Correct Implementation**:
- `plugins/specweave-github/lib/user-story-issue-builder.ts:94` - Title
- `plugins/specweave-github/lib/user-story-issue-builder.ts:216-252` - Tasks
- `plugins/specweave-github/lib/user-story-issue-builder.ts:494-514` - Links

**Wrong Implementation** (Deprecate):
- `plugins/specweave-github/agents/github-manager/AGENT.md` - Direct increment creation

### Tests Needed

1. ✅ Title format validation (exists)
2. ❌ Tasks section validation (missing)
3. ❌ Task sync validation (missing)
4. ❌ Link validation (missing)

---

**End of Report**

**Next Steps**:
1. Create missing tests
2. Add warnings to GitHub Manager agent
3. Update documentation
4. Validate all existing GitHub issues
