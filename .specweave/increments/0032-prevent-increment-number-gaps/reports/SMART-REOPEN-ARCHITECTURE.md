# Smart Reopen Architecture

**Status**: Design Complete
**Created**: 2025-11-14
**Increment**: 0032-prevent-increment-number-gaps

## Executive Summary

This document defines the architecture for **smart reopen functionality** that automatically detects and reopens tasks, user stories, or increments when users report issues with recently completed work.

## Problem Statement

**Current Pain Point**: When users complete work and later discover issues:
- ❌ No way to reopen completed tasks
- ❌ No automatic detection of what needs reopening
- ❌ COMPLETED status is terminal (no transition back to ACTIVE)
- ❌ Manual investigation required to find related work

**User Story**:
> "I just completed increment 0031, but the GitHub sync isn't working. I need to reopen the tasks related to GitHub API integration to fix it."

## Core Requirements

### 1. Smart Detection
**When user reports issue** → **Scan recent work** → **Suggest what to reopen**

**Detection Keywords**:
- "not working", "broken", "bug", "issue", "problem", "failing"
- "error", "crash", "wrong", "incorrect", "missing"
- "still broken", "regression", "broken again"

**Scan Scope**:
- ✅ Active increments (last 30 days)
- ✅ Recently completed increments (last 7 days)
- ✅ Tasks completed in last 7 days
- ✅ User stories from recently synced specs

### 2. Reopen Capabilities

**Level 1: Task Reopen**
- Mark task as `[ ]` in tasks.md
- Update task status metadata
- Preserve completion timestamp (audit trail)
- Add "Reopened: [timestamp] - [reason]" annotation

**Level 2: User Story Reopen**
- Update living docs spec status
- Reopen related tasks
- Sync to external tools (GitHub, JIRA, ADO)

**Level 3: Increment Reopen**
- Transition: COMPLETED → ACTIVE
- Validate WIP limits (warn if exceeded)
- Reopen all uncompleted tasks
- Update external issue status
- Clear completion metadata

### 3. Status Transitions (NEW)

**Current** (terminal):
```
COMPLETED → (no transitions)
```

**Proposed** (reopenable):
```
COMPLETED → ACTIVE (reopen)
COMPLETED → ABANDONED (mark as failed)
```

**Validation**:
- ✅ Can reopen completed increments
- ✅ Require `--reason` flag
- ✅ Check WIP limits before reopening
- ⚠️  Warn if reopening will exceed limits
- ✅ Allow `--force` to bypass WIP check

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User Reports Issue                                           │
│ "GitHub sync not working"                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Skill: smart-reopen-detector                                 │
│ - Auto-activates on issue keywords                           │
│ - Scans active/recent work                                   │
│ - Identifies related items                                   │
│ - Suggests reopen targets                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Command: /specweave:reopen                                   │
│ - Manual reopen command                                      │
│ - Task/User Story/Increment level                           │
│ - WIP validation                                             │
│ - Audit trail                                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Core: IncrementReopener                                      │
│ ├─ scanRecentWork()                                          │
│ ├─ detectRelatedItems()                                      │
│ ├─ validateReopen()                                          │
│ ├─ reopenTask()                                              │
│ ├─ reopenUserStory()                                         │
│ └─ reopenIncrement()                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Updates                                                       │
│ ├─ metadata.json (status → ACTIVE)                          │
│ ├─ tasks.md ([ ] reopened tasks)                            │
│ ├─ Living docs (spec status)                                │
│ ├─ External tools (GitHub/JIRA/ADO)                         │
│ └─ Status line (show reopened increment)                    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input: "GitHub sync broken"
    │
    ▼
Skill detects keywords → Scans recent work
    │
    ├─ Active increments (0031, 0032)
    ├─ Recent completions (0030 - 2 days ago)
    ├─ Recent tasks (T-003 GitHub sync - 1 day ago)
    │
    ▼
Pattern matching:
    ├─ "GitHub" → Find tasks with "GitHub" keyword
    ├─ "sync" → Find tasks with "sync" keyword
    ├─ Intersection → T-003 in increment 0031
    │
    ▼
Suggest reopen:
    "🔍 Found related work:
     - Increment: 0031-external-tool-status-sync (COMPLETED 2 days ago)
     - Task: T-003 GitHub Content Sync (completed 1 day ago)

     Reopen increment 0031? (y/n)
     Or: /specweave:reopen 0031 --task T-003 --reason 'GitHub sync failing'"
```

## Core Classes

### 1. IncrementReopener

**File**: `src/core/increment/increment-reopener.ts`

```typescript
export interface ReopenContext {
  /** What to reopen (task, user story, or increment) */
  target: 'task' | 'user-story' | 'increment';

  /** Increment ID */
  incrementId: string;

  /** Task ID (if target = task) */
  taskId?: string;

  /** User story ID (if target = user-story) */
  userStoryId?: string;

  /** Reason for reopening */
  reason: string;

  /** Force reopen (bypass WIP checks) */
  force?: boolean;
}

export interface ReopenResult {
  success: boolean;
  itemsReopened: string[];
  warnings: string[];
  errors: string[];
  wipLimitExceeded?: boolean;
}

export class IncrementReopener {
  /**
   * Scan recent work to find items related to user's issue
   */
  static scanRecentWork(keywords: string[]): RecentWorkScanResult {
    // Scan active + recently completed (7 days)
    // Pattern match on keywords
    // Return ranked matches
  }

  /**
   * Reopen a completed increment
   */
  static async reopenIncrement(context: ReopenContext): Promise<ReopenResult> {
    // 1. Validate increment exists and is COMPLETED
    // 2. Check WIP limits
    // 3. Update metadata: COMPLETED → ACTIVE
    // 4. Add audit entry
    // 5. Update status line cache
    // 6. Sync to external tools
  }

  /**
   * Reopen specific task(s) in an increment
   */
  static async reopenTask(context: ReopenContext): Promise<ReopenResult> {
    // 1. Parse tasks.md
    // 2. Find task by ID
    // 3. Update status: [x] → [ ]
    // 4. Add "Reopened: [date] - [reason]" annotation
    // 5. Update external issue checkboxes
  }

  /**
   * Reopen user story (living docs + tasks)
   */
  static async reopenUserStory(context: ReopenContext): Promise<ReopenResult> {
    // 1. Find user story in living docs
    // 2. Update status in spec
    // 3. Find related tasks
    // 4. Reopen all tasks for that US
    // 5. Sync to external tools
  }

  /**
   * Validate reopen is safe
   */
  private static validateReopen(context: ReopenContext): ValidationResult {
    // Check: WIP limits
    // Check: Increment not archived
    // Check: Target exists
    // Return: warnings + blockers
  }
}
```

### 2. RecentWorkScanner

**File**: `src/core/increment/recent-work-scanner.ts`

```typescript
export interface RecentWorkMatch {
  type: 'increment' | 'task' | 'user-story';
  id: string;
  incrementId: string;
  title: string;
  completedDate: string;
  relevanceScore: number;
  matchedKeywords: string[];
}

export class RecentWorkScanner {
  /**
   * Scan increments completed in last N days
   */
  static scanRecentIncrements(days: number = 7): IncrementMetadata[] {
    const allIncrements = MetadataManager.getCompleted();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return allIncrements.filter(m => {
      const completedDate = new Date(m.lastActivity);
      return completedDate >= cutoffDate;
    });
  }

  /**
   * Scan tasks completed in last N days (across all increments)
   */
  static scanRecentTasks(days: number = 7): TaskMatch[] {
    // Scan all active + recently completed increments
    // Parse tasks.md for each
    // Filter tasks with [x] completed in last N days
  }

  /**
   * Pattern match: Find items related to keywords
   */
  static matchKeywords(
    items: (IncrementMetadata | TaskMatch)[],
    keywords: string[]
  ): RecentWorkMatch[] {
    // Keyword matching algorithm:
    // 1. Exact match in title → +10 points
    // 2. Partial match in title → +5 points
    // 3. Match in description/AC → +3 points
    // 4. Match in task implementation → +2 points
    //
    // Sort by relevance score descending
  }
}
```

## Skill Design

**File**: `plugins/specweave/skills/smart-reopen-detector/SKILL.md`

```yaml
---
name: smart-reopen-detector
description: |
  Detects when user reports issues with recently completed work and suggests
  reopening relevant tasks, user stories, or increments. Auto-activates on
  keywords: not working, broken, bug, issue, problem, failing, error, crash,
  regression, still broken. Scans active and recently completed (7 days) work
  to find related items.
---

# Smart Reopen Detector

## Purpose

When you report an issue with recently completed work, I'll:
1. 🔍 Scan your recent work (active + completed in last 7 days)
2. 🎯 Identify related tasks/user stories/increments
3. 💡 Suggest what to reopen
4. ⚠️  Check WIP limits before reopening

## Activation Keywords

I activate when you say:
- "not working", "broken", "bug", "issue", "problem"
- "failing", "error", "crash", "wrong", "incorrect"
- "still broken", "regression", "broken again"

## How I Help

**Example**:
> User: "The GitHub sync isn't working, it was just completed"

I'll respond:
```
🔍 Scanning recent work...

Found related items:
  ✅ Increment: 0031-external-tool-status-sync (COMPLETED 2 days ago)
  ✅ Task: T-003 GitHub Content Sync (completed 1 day ago)
  ✅ User Story: US-001 GitHub Integration

Would you like to:
1. Reopen the entire increment (requires WIP check)
2. Reopen just task T-003 (targeted fix)
3. Reopen user story US-001 (all related tasks)

Command: /specweave:reopen 0031 --task T-003 --reason "GitHub sync failing"
```
```

## Command Design

**File**: `plugins/specweave/commands/specweave-reopen.md`

```yaml
---
name: specweave-reopen
description: |
  Reopen completed increments, tasks, or user stories. Validates WIP limits,
  creates audit trail, and syncs to external tools.
---

# Reopen Increment, Task, or User Story

Reopen completed work when issues are discovered.

## Usage

### Reopen Entire Increment
```bash
/specweave:reopen 0031 --reason "GitHub sync failing"
```

### Reopen Specific Task
```bash
/specweave:reopen 0031 --task T-003 --reason "API integration broken"
```

### Reopen User Story
```bash
/specweave:reopen 0031 --user-story US-001 --reason "Acceptance criteria not met"
```

### Force Reopen (Bypass WIP Limits)
```bash
/specweave:reopen 0031 --force --reason "Critical production issue"
```

## Parameters

- `increment-id` (required): Increment to reopen (e.g., `0031`)
- `--task <id>`: Reopen specific task (e.g., `T-003`)
- `--user-story <id>`: Reopen user story + related tasks
- `--reason <text>`: Why reopening (required for audit trail)
- `--force`: Bypass WIP limit checks (use sparingly!)

## What Happens

1. ✅ Validates target exists and is completed
2. ⚠️  Checks WIP limits (warns if exceeded)
3. 📝 Updates status: COMPLETED → ACTIVE
4. 📋 Reopens tasks: [x] → [ ]
5. 🔄 Syncs to external tools (GitHub/JIRA/ADO)
6. 📊 Updates status line
7. 📜 Creates audit trail

## Examples

### Quick Reopen (Increment)
```bash
/specweave:reopen 0031 --reason "Tests failing in production"
```

### Surgical Reopen (Single Task)
```bash
/specweave:reopen 0031 --task T-003 --reason "GitHub API 500 error"
```

### Batch Reopen (User Story)
```bash
/specweave:reopen 0031 --user-story US-001 --reason "Authentication not working"
```
```

## WIP Limit Validation

**Validation Logic**:
```typescript
function validateWIPLimits(incrementId: string): WIPValidationResult {
  const metadata = MetadataManager.read(incrementId);
  const type = metadata.type;
  const limit = TYPE_LIMITS[type];

  // If unlimited type (hotfix, bug, experiment), allow
  if (limit === null) {
    return { allowed: true, warning: false };
  }

  // Count current active of same type
  const activeCount = MetadataManager.getActive()
    .filter(m => m.type === type)
    .length;

  // If reopening would exceed limit, warn
  if (activeCount >= limit) {
    return {
      allowed: false,
      warning: true,
      message: `Reopening will exceed WIP limit (${activeCount + 1}/${limit} active ${type}s).
                Complete or pause another ${type} first, or use --force.`
    };
  }

  return { allowed: true, warning: false };
}
```

## Audit Trail

**Metadata Updates**:
```json
{
  "id": "0031-external-tool-status-sync",
  "status": "active",
  "reopened": {
    "count": 1,
    "history": [
      {
        "date": "2025-11-14T15:30:00Z",
        "reason": "GitHub sync failing",
        "previousStatus": "completed",
        "by": "user"
      }
    ]
  }
}
```

**Task Annotations**:
```markdown
### T-003: GitHub Content Sync

**Status**: [ ] (Reopened: 2025-11-14 - GitHub sync failing)

**Previous Completions**:
- Completed: 2025-11-12T10:00:00Z
- Reopened: 2025-11-14T15:30:00Z - GitHub sync failing
```

## Status Transition Updates

**Add to `increment-metadata.ts`**:
```typescript
export const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]> = {
  // ... existing ...
  [IncrementStatus.COMPLETED]: [
    IncrementStatus.ACTIVE,     // NEW: Allow reopen
    IncrementStatus.ABANDONED   // NEW: Mark as failed
  ],
};
```

## External Tool Sync

**GitHub**:
- Reopen issue if closed
- Update issue body with "Reopened: [reason]"
- Uncheck completed task checkboxes

**JIRA**:
- Transition issue: Done → In Progress
- Add comment: "Reopened: [reason]"

**Azure DevOps**:
- Update work item state: Closed → Active
- Add work item comment

## Status Line Integration

**Show Reopened Increments**:
```
📊 0031-external-tool-status-sync | ⚠️  REOPENED (was completed) | 23/24 tasks (95%) | GitHub sync failing
```

**Indicator**: `⚠️  REOPENED` badge when increment was previously completed

## Success Criteria

- ✅ Can reopen completed increments
- ✅ Can reopen specific tasks
- ✅ Can reopen user stories
- ✅ WIP limits validated (with warning)
- ✅ Audit trail preserved
- ✅ External tools synced
- ✅ Status line updated
- ✅ Skill auto-detects issue reports

## Testing Strategy

**Unit Tests** (`increment-reopener.test.ts`):
- `reopenIncrement()` updates status correctly
- `reopenTask()` marks task as `[ ]`
- `validateReopen()` checks WIP limits
- `scanRecentWork()` finds matches

**Integration Tests** (`reopen-integration.test.ts`):
- Reopen increment → Verify status → Check WIP limits
- Reopen task → Verify tasks.md updated
- Reopen with external sync → Verify GitHub/JIRA updated

**E2E Tests** (`reopen-workflow.spec.ts`):
- Complete increment → Report issue → Auto-detect → Reopen
- Reopen with WIP limit → Warning shown → Force reopen works

## Migration Impact

**Breaking Changes**: None (adds new functionality)

**Backward Compatibility**: ✅ Fully compatible
- Old increments remain COMPLETED (no auto-reopen)
- New status transitions are opt-in
- Existing code unaffected

## Next Steps

1. ✅ Design complete → Move to implementation
2. Create `increment-reopener.ts` with core logic
3. Create skill `smart-reopen-detector`
4. Create command `/specweave:reopen`
5. Add WIP validation
6. Integrate with status line
7. Add tests
8. Update documentation

---

**Design Status**: ✅ COMPLETE
**Ready for Implementation**: YES
**Estimated Effort**: 2-3 days
