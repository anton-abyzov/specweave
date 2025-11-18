# ULTRATHINK: Task Sync Architecture - Increment → Living Docs → GitHub

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Epic**: FS-043
**Critical Gap**: Tasks from tasks.md NOT synced to GitHub issues

---

## Executive Summary

**CRITICAL FINDING**: The current GitHub sync implementation is INCOMPLETE.

**What's Missing**:
1. ✅ Acceptance Criteria synced to GitHub issues
2. ❌ **Tasks NOT synced** - GitHub issues missing implementation tasks
3. ❌ **Bidirectional status tracking** - Task completion NOT synced

**Impact**: HIGH - Stakeholders see only ACs, not actual implementation tasks

**Root Cause**: `UserStoryIssueBuilder` extracts tasks from user story file's `## Tasks` section, but living docs sync doesn't populate that section from increment tasks.md

---

## Current Implementation Analysis

### What Works ✅

**File**: `plugins/specweave-github/lib/user-story-issue-builder.ts`

**Lines 216-252**: Task extraction from user story file
```typescript
private extractTasks(content: string): Task[] {
  const tasksMatch = content.match(/##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/);
  if (!tasksMatch) return [];

  const tasksSection = tasksMatch[1];
  const taskLines = tasksSection.split('\n').filter(line =>
    line.trim().match(/^-\s+\[([ x])\]\s+\*\*([T]-\d+)\*\*/)
  );

  return taskLines.map(line => {
    const match = line.match(/^-\s+\[([ x])\]\s+\*\*([T]-\d+)\*\*:\s+(.+)/);
    return {
      id: match[2],          // e.g., "T-001"
      description: match[3], // e.g., "Create SpecFrontmatterUpdater Class Foundation"
      completed: match[1] === 'x'
    };
  });
}
```

**Result**: Tasks ARE extracted and included in GitHub issue body
**Problem**: Living docs user story files DON'T have tasks yet!

### What's Broken ❌

**File**: `.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line-shows-correct-active-increment.md`

**Current content** (line 86-89):
```markdown
## Tasks

> **Note**: Tasks will be filled by test-aware-planner during increment planning
```

**Expected content**:
```markdown
## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-014**: Test /specweave:done Updates spec.md
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)

> **Sync Status**: Last synced from increment 0043-spec-md-desync-fix at 2025-11-18 08:55:00
```

**Why missing**: `LivingDocsSync.syncIncrement()` doesn't populate tasks section!

---

## Complete Data Flow (What SHOULD Happen)

### Phase 1: Increment → Living Docs

```
increment/0043-spec-md-desync-fix/tasks.md (24 tasks)
  ↓
TaskProjectSpecificGenerator.filterTasksByUserStory()
  ↓ Filter: T-013, T-014, T-020 belong to US-001
living docs/us-001-status-line-shows-correct-active-increment.md
  ## Tasks
  - [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
  - [ ] **T-014**: Test /specweave:done Updates spec.md
  - [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
```

### Phase 2: Living Docs → GitHub

```
living docs/us-001-*.md (## Tasks section populated)
  ↓
UserStoryIssueBuilder.extractTasks()
  ↓ Parse checkboxes
GitHub Issue #617
  ## Tasks
  - [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
  - [ ] **T-014**: Test /specweave:done Updates spec.md
  - [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)
```

### Phase 3: Bidirectional Sync

```
Developer completes T-013 in increment:
  tasks.md: - [x] T-013 (completed)
    ↓ Sync trigger
  living docs: - [x] **T-013** (updated)
    ↓ GitHub sync
  GitHub: - [x] **T-013** (checkbox checked)

OR

Stakeholder checks T-013 in GitHub:
  GitHub: - [x] **T-013** (checkbox checked)
    ↓ Webhook/polling
  living docs: - [x] **T-013** (updated)
    ↓ Increment sync
  tasks.md: - [x] T-013 (updated)
```

---

## Missing Implementation

### Component 1: TaskProjectSpecificGenerator Integration

**File**: `src/core/living-docs/task-project-specific-generator.ts`
**Status**: ✅ **EXISTS** (from increment 0037)

**Verified**:
```typescript
export class TaskProjectSpecificGenerator {
  /**
   * Filter tasks from increment tasks.md by User Story ID
   */
  async filterTasksByUserStory(
    incrementId: string,
    userStoryId: string,
    projectFilter?: string
  ): Promise<Task[]> {
    // Read tasks.md
    const tasksFile = path.join('.specweave/increments', incrementId, 'tasks.md');
    const tasks = await this.parseTasksFile(tasksFile);

    // Filter by User Story ID
    return tasks.filter(task => {
      const belongsToUS = task.metadata.userStory === userStoryId;
      const matchesProject = !projectFilter || task.metadata.project === projectFilter;
      return belongsToUS && matchesProject;
    });
  }
}
```

**Result**: ✅ Component already exists from increment 0037!

### Component 2: LivingDocsSync Integration

**File**: `src/core/living-docs/living-docs-sync.ts`
**Status**: ❌ **MISSING** - Doesn't call TaskProjectSpecificGenerator

**Current implementation** (lines 91-130):
```typescript
async syncIncrement(incrementId: string, options?: SyncOptions): Promise<SyncResult> {
  // 1. Read increment spec ✅
  const spec = await this.readSpec(incrementId);

  // 2. Generate living docs files ✅
  const files = await this.generateLivingDocs(spec);

  // 3. Write files to .specweave/docs/ ✅
  await this.writeFiles(files);

  // 4. Sync tasks to user stories ❌ MISSING!
  // await this.syncTasksToUserStories(incrementId);

  // 5. Sync to external tools ❌ MISSING! (Bug #2)
  // await this.syncToExternalTools(incrementId, files);

  return { success: true, files };
}
```

**Fix needed** (lines 130-150):
```typescript
async syncIncrement(incrementId: string, options?: SyncOptions): Promise<SyncResult> {
  // ... existing code ...

  // 4. ✨ NEW: Sync tasks to user stories
  if (!options?.dryRun) {
    await this.syncTasksToUserStories(incrementId);
  }

  // 5. ✨ NEW: Sync to external tools (Bug #2)
  if (!options?.dryRun) {
    await this.syncToExternalTools(incrementId, files);
  }

  return { success: true, files };
}

/**
 * NEW METHOD: Sync tasks from increment to user story files
 */
private async syncTasksToUserStories(incrementId: string): Promise<void> {
  const taskGenerator = new TaskProjectSpecificGenerator(this.projectRoot);

  // Get all user story files for this increment
  const userStoryFiles = await this.getUserStoryFiles(incrementId);

  for (const userStoryFile of userStoryFiles) {
    // Parse frontmatter to get user story ID
    const frontmatter = await this.parseFrontmatter(userStoryFile);
    const userStoryId = frontmatter.id; // e.g., "US-001"

    // Filter tasks by user story
    const tasks = await taskGenerator.filterTasksByUserStory(
      incrementId,
      userStoryId,
      frontmatter.project // optional project filter
    );

    // Update ## Tasks section in user story file
    await this.updateTasksSection(userStoryFile, tasks);
  }
}

/**
 * NEW METHOD: Update ## Tasks section in user story file
 */
private async updateTasksSection(
  userStoryFile: string,
  tasks: Task[]
): Promise<void> {
  const content = await fs.readFile(userStoryFile, 'utf-8');

  // Build tasks section
  const tasksSection = this.buildTasksSection(tasks);

  // Replace existing ## Tasks section
  const updatedContent = content.replace(
    /##\s+Tasks\s+([\s\S]*?)(?=\n##|$)/,
    `## Tasks\n\n${tasksSection}\n`
  );

  // Write updated content
  await fs.writeFile(userStoryFile, updatedContent, 'utf-8');
}

/**
 * NEW METHOD: Build tasks section markdown
 */
private buildTasksSection(tasks: Task[]): string {
  if (tasks.length === 0) {
    return '> **Note**: No tasks mapped to this user story yet';
  }

  const taskLines = tasks.map(task => {
    const checkbox = task.completed ? '[x]' : '[ ]';
    return `- ${checkbox} **${task.id}**: ${task.description}`;
  });

  const syncNote = `> **Sync Status**: Last synced from increment at ${new Date().toISOString()}`;

  return taskLines.join('\n') + '\n\n' + syncNote;
}
```

### Component 3: Bidirectional Sync (GitHub ↔ Increment)

**File**: `plugins/specweave-github/lib/github-bidirectional-sync.ts`
**Status**: ❌ **MISSING** - New file needed

**Architecture**:
```typescript
export class GitHubBidirectionalSync {
  /**
   * Sync task completion: Increment → GitHub
   */
  async syncTasksToGitHub(
    incrementId: string,
    userStoryId: string
  ): Promise<void> {
    // 1. Read tasks from living docs user story file
    const tasks = await this.readTasksFromUserStory(incrementId, userStoryId);

    // 2. Get GitHub issue number from frontmatter
    const issueNumber = await this.getIssueNumber(incrementId, userStoryId);

    // 3. Update GitHub issue body (## Tasks section)
    await this.updateGitHubTaskSection(issueNumber, tasks);
  }

  /**
   * Sync task completion: GitHub → Increment
   */
  async syncTasksFromGitHub(
    incrementId: string,
    userStoryId: string
  ): Promise<void> {
    // 1. Get GitHub issue number
    const issueNumber = await this.getIssueNumber(incrementId, userStoryId);

    // 2. Fetch GitHub issue body
    const issue = await this.githubClient.getIssue(issueNumber);

    // 3. Parse ## Tasks section to extract completion status
    const tasks = this.parseTasksFromIssue(issue.body);

    // 4. Update increment tasks.md with completion status
    await this.updateIncrementTasks(incrementId, tasks);

    // 5. Update living docs user story file
    await this.updateUserStoryTasks(incrementId, userStoryId, tasks);
  }
}
```

**Trigger options**:
1. **Manual**: `/specweave-github:sync` command
2. **Automatic** (webhook): GitHub webhook on issue edit
3. **Scheduled** (polling): Check for changes every 5 minutes

---

## Task Structure Mapping

### Increment tasks.md (Source)

```markdown
### T-013: Test Status Line Hook Reads Updated spec.md

**User Story**: US-001, US-003
**Acceptance Criteria**: AC-US1-03, AC-US3-01
**Priority**: P1
**Estimate**: 3 hours
**Status**: [ ] pending

**Test Plan**:
- **Given** an increment is closed via MetadataManager.updateStatus()
- **When** status line hook (update-status-line.sh) is executed
- **Then** hook should read status="completed" from spec.md (not stale "active")
```

**Extraction**:
- Task ID: `T-013`
- Description: `Test Status Line Hook Reads Updated spec.md`
- User Story: `US-001, US-003` (belongs to BOTH)
- Status: `[ ] pending` → `false`
- Priority: `P1`
- Estimate: `3 hours`

### Living Docs User Story (Intermediate)

**File**: `.specweave/docs/internal/specs/specweave/FS-043/us-001-status-line-shows-correct-active-increment.md`

```markdown
## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md (US-001, US-003) [P1, 3h]
- [ ] **T-014**: Test /specweave:done Updates spec.md (US-001) [P1, 3h]
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle) (US-001, US-002) [P1, 4h]

> **Sync Status**: Last synced from increment 0043-spec-md-desync-fix at 2025-11-18 08:55:00
> **Total Tasks**: 3 (0 completed, 3 pending)
> **Progress**: 0%
```

**Format**:
- Checkbox: `[ ]` or `[x]`
- Task ID: Bold with asterisks `**T-013**`
- Description: After colon
- Metadata: In parentheses (optional)

### GitHub Issue (Destination)

**Issue #617**: [FS-043][US-001] Status Line Shows Correct Active Increment

```markdown
## Tasks

- [ ] **T-013**: Test Status Line Hook Reads Updated spec.md
- [ ] **T-014**: Test /specweave:done Updates spec.md
- [ ] **T-020**: Write E2E Test (Full Increment Lifecycle)

> **Note**: Tasks sync automatically from increment. Check boxes to track progress.
> **Last Sync**: 2025-11-18 08:55:00
> **Progress**: 0/3 (0%)
```

**Interactive**:
- Stakeholders can check boxes in GitHub UI
- Changes sync back to increment tasks.md (bidirectional)

---

## Bidirectional Sync Rules

### Source of Truth Hierarchy

1. **For task definition** (ID, description, ACs):
   - Source: `increment/tasks.md`
   - Flow: ONE-WAY (increment → living docs → GitHub)
   - Reason: Tasks created during increment planning

2. **For task completion status** (checkbox):
   - Source: **BOTH** (bidirectional)
   - Flow: TWO-WAY with conflict resolution
   - Rules:
     - If both changed: Most recent timestamp wins
     - If GitHub newer: GitHub → increment
     - If increment newer: increment → GitHub

3. **Conflict resolution**:
   ```
   Increment tasks.md: T-013 completed at 2025-11-18 09:00:00
   GitHub issue #617: T-013 completed at 2025-11-18 09:15:00

   Resolution: GitHub wins (newer timestamp)
   Action: Update increment tasks.md to match GitHub
   ```

### Sync Triggers

**Increment → GitHub**:
- `/specweave:sync-docs update` command
- Task completion in increment
- Hook: `after-task-complete.sh`

**GitHub → Increment**:
- GitHub webhook: Issue edited
- Scheduled polling: Every 5 minutes
- Manual: `/specweave-github:sync` command

### Sync Frequency

**Option 1: Real-time** (webhook)
- Pros: Instant sync, no polling overhead
- Cons: Requires webhook setup, internet connection
- Recommended for: Production teams

**Option 2: Polling** (every 5 minutes)
- Pros: No webhook needed, works offline
- Cons: 5-minute delay, polling overhead
- Recommended for: Solo developers, demo projects

**Option 3: Manual** (on-demand)
- Pros: Full control, no automatic overhead
- Cons: Manual effort required
- Recommended for: Testing, troubleshooting

---

## Implementation Phases

### Phase 1: Living Docs Sync (✨ NEW)

**Tasks**:
1. Add `syncTasksToUserStories()` method to `LivingDocsSync`
2. Integrate `TaskProjectSpecificGenerator` (already exists)
3. Update `## Tasks` section in user story files
4. Test: Verify tasks populated from increment

**Files to modify**:
- `src/core/living-docs/living-docs-sync.ts`

**Estimated effort**: 4 hours

### Phase 2: GitHub One-Way Sync (Increment → GitHub)

**Tasks**:
1. Modify `UserStoryIssueBuilder` to extract tasks (✅ already done)
2. Test: Verify tasks appear in GitHub issues
3. Verify task format matches expected structure

**Files to modify**:
- None (already implemented)

**Estimated effort**: 1 hour (testing only)

### Phase 3: GitHub Bidirectional Sync (GitHub ↔ Increment)

**Tasks**:
1. Create `GitHubBidirectionalSync` class
2. Implement `syncTasksFromGitHub()` method
3. Implement `syncTasksToGitHub()` method
4. Add webhook handler (optional)
5. Add polling scheduler (optional)
6. Add conflict resolution logic
7. Test: Complete task in GitHub → verify increment updated
8. Test: Complete task in increment → verify GitHub updated

**Files to create**:
- `plugins/specweave-github/lib/github-bidirectional-sync.ts`

**Estimated effort**: 12 hours

### Phase 4: Tests & Documentation

**Tasks**:
1. Write unit tests for task sync
2. Write integration tests for bidirectional sync
3. Write E2E test: Complete workflow
4. Update user guide with task sync documentation
5. Create ADR for bidirectional sync strategy

**Estimated effort**: 8 hours

**Total estimated effort**: 25 hours (3 days)

---

## User Story Coverage Analysis

### Current Increment Tasks (0043)

**Total tasks**: 24
**User stories**: 5 (US-001 to US-005)

**Distribution**:
- **US-001** (Status Line): T-013, T-014, T-020, T-023 (4 tasks)
- **US-002** (spec.md Sync): T-001 to T-007, T-015, T-018, T-019, T-022 (12 tasks)
- **US-003** (Hooks): T-013 (1 task, shared with US-001)
- **US-004** (Desyncs): T-008 to T-012, T-016, T-017, T-021, T-024 (9 tasks)
- **US-005** (Living Docs → External Tools): 0 tasks (not in this increment)

**Missing from GitHub issues**:
- Issue #617 (US-001): Missing 4 tasks (T-013, T-014, T-020, T-023)
- Issue #618 (US-002): Missing 12 tasks (T-001 to T-007, T-015, T-018, T-019, T-022)
- Issue #619 (US-003): Missing 1 task (T-013)
- Issue #620 (US-004): Missing 9 tasks (T-008 to T-012, T-016, T-017, T-021, T-024)
- Issue #621 (US-005): Missing 0 tasks (correct - none mapped)

**Impact**: Stakeholders see only acceptance criteria, not implementation tasks!

---

## Next Steps

### Immediate (Fix Current Increment)

1. **Implement Phase 1**: Add task sync to `LivingDocsSync`
   ```bash
   # Expected time: 4 hours
   # File: src/core/living-docs/living-docs-sync.ts
   ```

2. **Re-sync living docs**:
   ```bash
   /specweave:sync-docs update
   # This will populate ## Tasks sections in all 5 user story files
   ```

3. **Re-sync GitHub issues**:
   ```bash
   npx tsx -e "
   import { GitHubClientV2 } from './plugins/specweave-github/lib/github-client-v2.js';
   import { GitHubFeatureSync } from './plugins/specweave-github/lib/github-feature-sync.js';

   // ... same code as before ...
   await sync.syncFeatureToGitHub('FS-043');
   "
   ```

4. **Verify tasks appear in GitHub**:
   ```bash
   gh issue view 617 --repo anton-abyzov/specweave
   # Should show ## Tasks section with T-013, T-014, T-020, T-023
   ```

### Short-term (Complete Feature)

1. **Implement Phase 3**: Bidirectional sync (12 hours)
2. **Add tests**: Unit + integration + E2E (8 hours)
3. **Document**: User guide + ADR (4 hours)

### Long-term (Production Ready)

1. **Add webhook support**: Real-time sync (8 hours)
2. **Add conflict resolution UI**: Show conflicts, allow manual resolution (12 hours)
3. **Add sync dashboard**: Show sync status, errors, conflicts (8 hours)

---

## Acceptance Criteria Impact

### Current State

**AC-US1-01** (Status line updates):
- ✅ Spec.md updates on closure
- ✅ Status line reads spec.md
- ❌ **Tasks NOT visible** in GitHub for stakeholders

**AC-US5-03** (Task completion synced):
- ❌ **NOT IMPLEMENTED** - Tasks not synced to GitHub
- ❌ **NOT IMPLEMENTED** - Bidirectional sync missing

**AC-US5-04** (Living docs as single source):
- ✅ Living docs files created
- ❌ **Tasks section empty** - Not synced from increment
- ❌ **GitHub issues incomplete** - Missing tasks

### After Fix

**AC-US1-01**:
- ✅ Tasks visible in GitHub issues
- ✅ Stakeholders can track implementation progress

**AC-US5-03**:
- ✅ Task completion syncs increment → GitHub
- ✅ Task completion syncs GitHub → increment (bidirectional)

**AC-US5-04**:
- ✅ Living docs contain complete task lists
- ✅ GitHub issues reflect actual implementation status

---

## Conclusion

### Critical Findings

1. **Current implementation is 50% complete**:
   - ✅ Acceptance Criteria synced
   - ❌ Tasks NOT synced

2. **Required components**:
   - ✅ TaskProjectSpecificGenerator (exists from increment 0037)
   - ❌ LivingDocsSync integration (missing)
   - ❌ Bidirectional sync (missing)

3. **Estimated effort to complete**:
   - Phase 1 (living docs sync): 4 hours
   - Phase 3 (bidirectional): 12 hours
   - Tests + docs: 12 hours
   - **Total**: 28 hours (3.5 days)

### Immediate Action Required

**MUST DO NOW** (for increment 0043):
1. Implement `syncTasksToUserStories()` in `LivingDocsSync`
2. Re-sync living docs: `/specweave:sync-docs update`
3. Re-sync GitHub: `GitHubFeatureSync.syncFeatureToGitHub('FS-043')`
4. Verify tasks appear in issues #617-621

**CAN DEFER** (future increment):
- Bidirectional sync (GitHub → Increment)
- Webhook integration
- Conflict resolution UI

---

**Analysis Status**: ✅ COMPLETE
**Root Cause**: Identified
**Fix Required**: Yes (4 hours immediate, 24 hours complete)
**Next Action**: Implement Phase 1 task sync

**Last Updated**: 2025-11-18
**Analyst**: Claude Code (ULTRATHINK mode)
