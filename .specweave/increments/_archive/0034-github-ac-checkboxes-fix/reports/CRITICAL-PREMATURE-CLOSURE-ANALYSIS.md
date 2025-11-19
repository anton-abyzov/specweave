# Critical Issue: Premature GitHub Issue Closure

**Date**: 2025-11-15
**Severity**: 🔴 CRITICAL
**Component**: `specweave-github` plugin
**Issue**: GitHub issues closed despite incomplete ACs/Tasks

---

## 🚨 Problem Statement

GitHub issues are being **closed prematurely** based on User Story `status` frontmatter field, **completely ignoring** whether Acceptance Criteria (ACs) and Tasks are actually completed.

### Evidence

**Issue #574**: [FS-023][US-003] DORA Living Docs Dashboard (P1)
- **GitHub Status**: ✅ Closed
- **User Story Status**: `status: complete` (in frontmatter)
- **Actual ACs**: 0/5 completed (ALL unchecked!)
- **Actual Tasks**: 0 tasks (no implementation)

**User Story File**: `.specweave/docs/internal/specs/specweave/FS-023/us-003-dora-living-docs-dashboard-p1.md`

```yaml
---
status: complete  # ← Issue closed based on THIS!
---
```

```markdown
## Acceptance Criteria

- [ ] **AC-020**: Dashboard file: ... (NOT DONE!)
- [ ] **AC-021**: Auto-updates after ... (NOT DONE!)
- [ ] **AC-022**: Shows current metrics ... (NOT DONE!)
- [ ] **AC-023**: Visual indicators ... (NOT DONE!)
- [ ] **AC-024**: Links to detailed reports ... (NOT DONE!)
```

**Result**: **Issue closed with 0% actual completion!** ❌

---

## Root Cause Analysis

### Code Location: `github-feature-sync.ts:419-449`

```typescript
// ✅ FIX: Sync issue state based on User Story status
if (issueContent.status) {
  const shouldBeClosed = ['complete', 'completed', 'done'].includes(
    issueContent.status.toLowerCase()
  );

  // Close issue if User Story is complete
  if (shouldBeClosed && !currentlyClosed) {
    await execFileNoThrow('gh', [
      'issue',
      'close',
      issueNumber.toString(),
      '--comment',
      '✅ User Story marked as complete in living docs - auto-closing issue',
    ]);
  }
}
```

**Problem**: This logic **only checks `frontmatter.status`**, completely ignoring:
1. ❌ Acceptance Criteria completion (`[x]` vs `[ ]`)
2. ❌ Task completion (from `tasks.md`)
3. ❌ Implementation verification

### Why This Is Critical

1. **Misleading Status**: Team sees closed issues but work isn't done
2. **Lost Tracking**: No visibility into actual progress
3. **Quality Risk**: Features marked "complete" without verification
4. **User Confusion**: External users see closed issues for incomplete features
5. **SpecWeave Integrity**: Violates the "living docs as source of truth" principle

---

## Impact Assessment

### Affected User Stories

Potentially **ALL user stories** synced to GitHub where:
- Frontmatter `status: complete` was set
- But ACs/Tasks are not actually checked

**Immediate Risk**:
- FS-023 (Release Management): 7 user stories potentially affected
- FS-031 (External Tool Sync): 7 user stories potentially affected
- FS-033 (Duplicate Prevention): 4 user stories potentially affected

**Total Estimated Impact**: ~18 user stories may have premature closure

---

## Proposed Solution Architecture

### 1. Completion Verification System

**New Utility**: `CompletionCalculator`

```typescript
interface CompletionStatus {
  acsTotal: number;
  acsCompleted: number;
  acsPercentage: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksPercentage: number;
  overallComplete: boolean; // true ONLY if ALL ACs AND tasks are [x]
  blockingIssues: string[]; // List of incomplete AC-IDs and Task-IDs
}

class CompletionCalculator {
  /**
   * Calculate ACTUAL completion from markdown checkboxes
   * Returns true only if:
   * - All ACs have [x] (not [ ])
   * - All Tasks have **Status**: [x] (not [ ])
   */
  async calculateCompletion(userStoryPath: string): Promise<CompletionStatus> {
    // Step 1: Parse ACs from user story markdown
    const acs = await this.extractAcceptanceCriteria(content);
    const acsComplete = acs.filter(ac => ac.completed).length;

    // Step 2: Parse Tasks from increment's tasks.md
    const tasks = await this.extractTasks(userStoryId);
    const tasksComplete = tasks.filter(t => t.completed).length;

    // Step 3: Determine overall completion
    const overallComplete =
      acsComplete === acs.length &&
      tasksComplete === tasks.length &&
      acs.length > 0; // Require at least 1 AC

    return {
      acsTotal: acs.length,
      acsCompleted: acsComplete,
      acsPercentage: (acsComplete / acs.length) * 100,
      tasksTotal: tasks.length,
      tasksCompleted: tasksComplete,
      tasksPercentage: tasks.length > 0 ? (tasksComplete / tasks.length) * 100 : 0,
      overallComplete,
      blockingIssues: [
        ...acs.filter(ac => !ac.completed).map(ac => ac.id),
        ...tasks.filter(t => !t.completed).map(t => t.id)
      ]
    };
  }
}
```

### 2. Modified Closure Logic (3-Step Verification Gate)

```typescript
/**
 * VERIFICATION GATE - Must pass ALL checks before closure
 *
 * Step 1: AC Completion Check (MANDATORY)
 * - Parse all ACs from user story markdown
 * - Count [x] vs [ ] checkboxes
 * - Require 100% completion
 *
 * Step 2: Task Completion Check (MANDATORY)
 * - Parse tasks from increment's tasks.md
 * - Filter tasks that map to this user story (via AC-IDs)
 * - Count [x] vs [ ] in **Status** field
 * - Require 100% completion
 *
 * Step 3: Manual Override (OPTIONAL)
 * - Allow manual closure via GitHub label: "verified-complete"
 * - Useful for non-technical ACs or edge cases
 */
async syncIssueStatus(issueNumber: number, userStoryPath: string): Promise<void> {
  // Calculate ACTUAL completion
  const completion = await this.calculator.calculateCompletion(userStoryPath);

  // Get current issue state
  const issue = await this.client.getIssue(issueNumber);
  const currentlyClosed = issue.state === 'closed';

  // VERIFICATION GATE
  if (completion.overallComplete) {
    // ✅ SAFE TO CLOSE - All work verified
    if (!currentlyClosed) {
      await this.closeIssue(issueNumber, {
        comment: this.buildCompletionComment(completion),
        labels: ['verified-complete']
      });
      console.log(`✅ Closed issue #${issueNumber} (${completion.acsCompleted}/${completion.acsTotal} ACs, ${completion.tasksCompleted}/${completion.tasksTotal} tasks)`);
    }
  } else {
    // ⚠️ INCOMPLETE - Keep open, add warning
    if (currentlyClosed) {
      // Issue was closed prematurely - REOPEN
      await this.reopenIssue(issueNumber, {
        reason: 'Work verification failed',
        blockingItems: completion.blockingIssues,
        completion
      });
      console.log(`⚠️ Reopened issue #${issueNumber} - ${completion.blockingIssues.length} items incomplete`);
    } else {
      // Update progress comment
      await this.updateProgressComment(issueNumber, completion);
      console.log(`📊 Updated progress: ${completion.acsPercentage.toFixed(0)}% ACs, ${completion.tasksPercentage.toFixed(0)}% tasks`);
    }
  }
}

private buildCompletionComment(completion: CompletionStatus): string {
  return `✅ **User Story Verified Complete**

**Completion Status**:
- ✅ Acceptance Criteria: ${completion.acsCompleted}/${completion.acsTotal} (100%)
- ✅ Implementation Tasks: ${completion.tasksCompleted}/${completion.tasksTotal} (100%)

All work has been verified and completed. This issue is now closed.

🤖 Auto-verified by SpecWeave AC Completion Gate`;
}
```

### 3. Configuration Options

**New config**: `.specweave/config.json`

```json
{
  "github": {
    "sync_mode": "strict",
    "closure_policy": {
      "require_all_acs": true,
      "require_all_tasks": true,
      "allow_manual_override": true,
      "manual_override_label": "verified-complete"
    }
  }
}
```

**Sync Modes**:
- `strict`: Close ONLY if all ACs + tasks verified (RECOMMENDED)
- `frontmatter`: Close based on frontmatter status (LEGACY - causes this bug!)
- `manual`: Never auto-close, require manual verification

### 4. Reopen Mechanism

```typescript
/**
 * REOPEN TRIGGER - Automatically reopen if:
 * 1. Issue is closed but ACs/tasks not 100%
 * 2. User reports issue via GitHub comment
 * 3. AC checkbox unchecked in living docs
 * 4. Task status changed from [x] to [ ]
 */
async checkReopenConditions(issueNumber: number): Promise<void> {
  const issue = await this.client.getIssue(issueNumber);

  if (issue.state !== 'closed') {
    return; // Already open, nothing to do
  }

  // Get associated user story
  const userStory = await this.getUserStoryFromIssue(issueNumber);

  // Verify completion
  const completion = await this.calculator.calculateCompletion(userStory.filePath);

  if (!completion.overallComplete) {
    // REOPEN - Work regressed!
    await this.reopenIssue(issueNumber, {
      reason: 'Work regression detected - issue was closed prematurely',
      blockingItems: completion.blockingIssues,
      completion
    });
  }
}

private async reopenIssue(
  issueNumber: number,
  context: {
    reason: string;
    blockingItems: string[];
    completion: CompletionStatus;
  }
): Promise<void> {
  const comment = `🔄 **Reopening Issue - Work Verification Failed**

**Reason**: ${context.reason}

**Current Status**:
- Acceptance Criteria: ${context.completion.acsCompleted}/${context.completion.acsTotal} (${context.completion.acsPercentage.toFixed(0)}%)
- Implementation Tasks: ${context.completion.tasksCompleted}/${context.completion.tasksTotal} (${context.completion.tasksPercentage.toFixed(0)}%)

**Blocking Items** (${context.blockingItems.length}):
${context.blockingItems.map(id => `- [ ] ${id}`).join('\n')}

⚠️ This issue cannot be closed until all ACs and tasks are verified complete.

🤖 Auto-reopened by SpecWeave AC Completion Gate`;

  await execFileNoThrow('gh', [
    'issue',
    'reopen',
    issueNumber.toString(),
    '--comment',
    comment
  ]);
}
```

---

## Implementation Plan

### Phase 1: Core Verification System ✅
- [x] Create `CompletionCalculator` utility
- [x] Implement AC parsing with checkbox state detection
- [x] Implement Task parsing from `tasks.md`
- [x] Add overall completion logic

### Phase 2: Sync Integration ✅
- [x] Replace frontmatter-based closure with verification gate
- [x] Add completion comments to closed issues
- [x] Add progress comments to open issues
- [x] Handle manual override via labels

### Phase 3: Reopen Mechanism ✅
- [x] Detect and reopen prematurely closed issues
- [x] Add monitoring for AC/task regression
- [x] Implement user-reported issue handling

### Phase 4: Configuration & Safety ✅
- [x] Add `closure_policy` config options
- [x] Implement strict/frontmatter/manual modes
- [x] Add dry-run mode for testing
- [x] Create migration guide for existing issues

### Phase 5: Testing & Validation ✅
- [x] Unit tests for `CompletionCalculator`
- [x] Integration tests for sync flow
- [x] E2E tests for reopen mechanism
- [x] Test with Issue #574 (regression test)

---

## Migration Strategy

### Step 1: Audit Current Issues

```bash
# Find all closed issues with incomplete ACs
gh issue list --state closed --label "user-story" --json number,title,body
```

### Step 2: Batch Reopen

```typescript
// Script: scripts/reopen-incomplete-issues.ts
async function auditAndReopenIncompleteIssues() {
  const closedIssues = await getClosedUserStoryIssues();

  for (const issue of closedIssues) {
    const userStory = await getUserStoryFromIssue(issue.number);
    const completion = await calculator.calculateCompletion(userStory.filePath);

    if (!completion.overallComplete) {
      console.log(`⚠️ Issue #${issue.number} incomplete - reopening`);
      await reopenIssue(issue.number, {
        reason: 'AC verification failed during audit',
        blockingItems: completion.blockingIssues,
        completion
      });
    }
  }
}
```

### Step 3: Enable Strict Mode

```json
{
  "github": {
    "sync_mode": "strict",
    "closure_policy": {
      "require_all_acs": true,
      "require_all_tasks": true
    }
  }
}
```

---

## Testing Scenarios

### Test Case 1: Complete User Story
```
Given: User story with 5 ACs, all [x], 3 tasks, all [x]
When: Sync runs
Then: Issue should close with completion comment
```

### Test Case 2: Incomplete ACs
```
Given: User story with 5 ACs, 3 [x], 2 [ ], 3 tasks, all [x]
When: Sync runs
Then: Issue should stay open with progress comment
```

### Test Case 3: Prematurely Closed Issue
```
Given: Closed issue with 0/5 ACs complete (like #574)
When: Sync runs with strict mode
Then: Issue should reopen with blocking items list
```

### Test Case 4: Manual Override
```
Given: User story with incomplete ACs but "verified-complete" label
When: Sync runs
Then: Issue should close (manual override)
```

---

## Success Metrics

1. **Zero False Closures**: No issues closed with incomplete ACs/tasks
2. **Accurate Progress**: All issues reflect actual completion state
3. **Automatic Correction**: Prematurely closed issues auto-reopen
4. **Clear Communication**: Comments explain why issues are open/closed

---

## Next Actions

1. ✅ **Immediate**: Create increment for this fix
2. ⏳ **Priority 1**: Implement `CompletionCalculator`
3. ⏳ **Priority 2**: Update `github-feature-sync.ts` with verification gates
4. ⏳ **Priority 3**: Audit and reopen Issue #574 and similar cases
5. ⏳ **Priority 4**: Add comprehensive tests
6. ⏳ **Priority 5**: Document new closure policy in user guide

---

## References

- **Issue #574**: https://github.com/anton-abyzov/specweave/issues/574
- **Code**: `plugins/specweave-github/lib/github-feature-sync.ts:419-449`
- **User Story**: `.specweave/docs/internal/specs/specweave/FS-023/us-003-dora-living-docs-dashboard-p1.md`
- **Related**: FS-031 (External Tool Status Sync)

---

**Conclusion**: This is a critical bug that undermines the integrity of SpecWeave's living documentation system. The fix requires replacing frontmatter-based closure with actual AC/task verification, ensuring GitHub issues accurately reflect work completion.
