# Reopen Logic Design - Closed Item Management

**Created**: 2025-11-04
**Increment**: 0007-smart-increment-discipline
**Issue Reference**: #15 (current), #4 (closed, needs reopen)
**Status**: Design Phase

---

## Problem Statement

### Real-World Scenario

**Current State**:
- Increment 0007 is `completed` (metadata.json)
- GitHub Issue #4 is `CLOSED`
- GitHub Issue #15 is `OPEN` (new tracking issue)
- Additional work discovered → need to reopen increment + sync issue

**User Request**:
> "Reopen closed items in GitHub/ADO/Jira when increment is resumed. Add comment explaining why reopened and update description if scope changed."

**Missing Capabilities**:
- ❌ Cannot transition `completed → active` (hard-coded in VALID_TRANSITIONS)
- ❌ No command to reopen closed issues
- ❌ No automatic reopen when increment resumed
- ❌ No audit trail for reopen operations

---

## Architecture Analysis

### Current State (v0.7.0)

**Metadata System** (`src/core/types/increment-metadata.ts`):
```typescript
export const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]> = {
  [IncrementStatus.COMPLETED]: []  // ❌ Terminal state (no transitions out)
};
```

**GitHub Sync** (`plugins/specweave-github/`):
- ✅ Creates issues from increments
- ✅ Updates progress via comments
- ✅ Closes issues when complete
- ❌ **Missing**: Reopen logic

**ADO Sync** (`plugins/specweave-ado/`):
- Similar capabilities as GitHub
- ❌ **Missing**: Reopen logic

**Jira Sync** (`plugins/specweave-jira/`):
- Similar capabilities as GitHub
- ❌ **Missing**: Reopen logic

---

## Design Solution

### Core Principle: Increments Can Be Reopened

**Rationale**:
- Real-world development is iterative
- "Completed" doesn't mean "perfect" or "immutable"
- Bug discoveries, scope changes, and stakeholder feedback are normal
- Agile embraces re-opening work for continuous improvement

**Change**: Allow `completed → active` transition with explicit user intent

---

## Solution Architecture

### 1. Metadata Layer (Core Framework)

**File**: `src/core/types/increment-metadata.ts`

**Change #1: Allow Completed → Active Transition**

```typescript
export const VALID_TRANSITIONS: Record<IncrementStatus, IncrementStatus[]> = {
  [IncrementStatus.COMPLETED]: [
    IncrementStatus.ACTIVE  // ✅ NEW: Allow reopening completed increments
  ]
};
```

**Change #2: Add Reopen History Tracking**

```typescript
export interface IncrementMetadata {
  // ... existing fields ...

  /**
   * Reopen history (audit trail)
   * Tracks every time increment was reopened
   */
  reopenHistory?: Array<{
    /** When increment was reopened (ISO 8601) */
    reopenedAt: string;

    /** Why it was reopened (required) */
    reason: string;

    /** Previous status before reopen */
    previousStatus: IncrementStatus;

    /** Who initiated reopen (git user or explicit name) */
    reopenedBy?: string;

    /** External systems that were updated */
    syncedTo?: {
      github?: { issueNumber: number; issueUrl: string };
      ado?: { workItemId: number; workItemUrl: string };
      jira?: { issueKey: string; issueUrl: string };
    };
  }>;
}
```

**Benefits**:
- ✅ Complete audit trail (compliance, debugging)
- ✅ Multiple reopen support (can reopen many times)
- ✅ Traceability to external PM tools
- ✅ Quality signal (if reopened >3 times, investigate why)

---

### 2. MetadataManager Enhancement

**File**: `src/core/increment/metadata-manager.ts`

**New Method: `reopen()`**

```typescript
import { execFileNoThrow } from '../../utils/execFileNoThrow.js';

/**
 * Reopen a completed increment
 * Records reopen in history and transitions to active
 */
static async reopen(
  incrementId: string,
  reason: string,
  reopenedBy?: string
): Promise<IncrementMetadata> {
  const metadata = this.read(incrementId);

  // Only allow reopening completed increments
  if (metadata.status !== IncrementStatus.COMPLETED) {
    throw new MetadataError(
      `Cannot reopen increment with status: ${metadata.status}. Only completed increments can be reopened.`,
      incrementId
    );
  }

  // Initialize reopen history if needed
  if (!metadata.reopenHistory) {
    metadata.reopenHistory = [];
  }

  // Get git user if not provided
  const user = reopenedBy || await this.getGitUser();

  // Record reopen
  metadata.reopenHistory.push({
    reopenedAt: new Date().toISOString(),
    reason,
    previousStatus: metadata.status,
    reopenedBy: user
  });

  // Transition to active
  metadata.status = IncrementStatus.ACTIVE;
  metadata.lastActivity = new Date().toISOString();

  this.write(incrementId, metadata);
  return metadata;
}

/**
 * Get git user for reopen attribution
 */
private static async getGitUser(): Promise<string> {
  const result = await execFileNoThrow('git', ['config', 'user.name']);
  return result.success ? result.stdout.trim() : 'unknown';
}

/**
 * Check if increment has been reopened multiple times (quality signal)
 */
static hasFrequentReopens(incrementId: string, threshold: number = 3): boolean {
  const metadata = this.read(incrementId);
  return (metadata.reopenHistory?.length || 0) >= threshold;
}
```

---

### 3. Resume Command Enhancement

**File**: `plugins/specweave/commands/resume.md`

**Current Behavior**:
```bash
/specweave:resume 0007
# Only resumes paused increments
```

**New Behavior**:
```bash
/specweave:resume 0007

# If increment is completed:
⚠️  Increment 0007 is COMPLETED
   - Completed: 2025-11-01
   - GitHub Issue: #4 (closed)
   - Total reopens: 0

Resume this increment? This will:
✓ Change status: completed → active
✓ Reopen GitHub issue #4
✓ Post comment with reopen reason

Continue? [y/N]: y

Reason for reopening: Additional error handling needed for edge cases

✅ Increment 0007 reopened
✅ GitHub issue #4 reopened
   Comment: "Reopened: Additional error handling needed for edge cases"
   Label added: "reopened"

Ready to work on increment 0007!
```

---

### 4. Sync Plugin Interface (Extensible)

**File**: `src/core/types/sync-plugin.ts` (new file)

```typescript
/**
 * Sync Plugin Interface
 * Standardizes sync operations across GitHub, ADO, Jira
 */
export interface SyncPlugin {
  /** Plugin name (e.g., "github", "ado", "jira") */
  name: string;

  /** Create issue/work-item from increment */
  createIssue(incrementId: string): Promise<SyncedIssue>;

  /** Update issue with current progress */
  updateIssue(incrementId: string): Promise<void>;

  /** Close issue when increment completes */
  closeIssue(incrementId: string): Promise<void>;

  /** ✅ NEW: Reopen closed issue with reason */
  reopenIssue(incrementId: string, reason: string): Promise<void>;

  /** Check if issue exists and is synced */
  getIssueStatus(incrementId: string): Promise<SyncedIssue | null>;
}

export interface SyncedIssue {
  /** Issue identifier (number, ID, or key) */
  id: string | number;

  /** Issue URL */
  url: string;

  /** Current state (open, closed, etc.) */
  state: string;

  /** Last sync timestamp */
  lastSynced: string;
}
```

---

### 5. GitHub Plugin Implementation

**File**: `plugins/specweave-github/lib/reopen-issue.ts` (new file)

```typescript
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';

/**
 * Reopen a closed GitHub issue
 */
export async function reopenGitHubIssue(
  incrementId: string,
  reason: string
): Promise<void> {
  // Read metadata to get issue number
  const metadata = MetadataManager.read(incrementId);

  if (!metadata.github?.issue) {
    throw new Error(`No GitHub issue found for increment ${incrementId}`);
  }

  const issueNumber = metadata.github.issue;

  // Reopen issue via gh CLI (safe - no shell injection)
  const reopenResult = await execFileNoThrow('gh', [
    'issue',
    'reopen',
    String(issueNumber),
    '--comment',
    `**Reopened**: ${reason}\n\n---\n🤖 Reopened by SpecWeave`
  ]);

  if (!reopenResult.success) {
    throw new Error(`Failed to reopen issue #${issueNumber}: ${reopenResult.stderr}`);
  }

  // Add "reopened" label
  await execFileNoThrow('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--add-label',
    'reopened'
  ]);

  // Remove "completed" label if present
  await execFileNoThrow('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--remove-label',
    'completed'
  ]);

  // Update metadata with reopen sync
  if (!metadata.reopenHistory) {
    metadata.reopenHistory = [];
  }

  const lastReopen = metadata.reopenHistory[metadata.reopenHistory.length - 1];
  if (lastReopen) {
    lastReopen.syncedTo = {
      github: {
        issueNumber,
        issueUrl: metadata.github.url
      }
    };
    MetadataManager.write(incrementId, metadata);
  }

  console.log(`✅ GitHub issue #${issueNumber} reopened`);
}
```

**New Command**: `plugins/specweave-github/commands/reopen-issue.md`

```markdown
---
name: reopen-issue
description: Reopen a closed GitHub issue for a completed increment
---

# Reopen GitHub Issue

Reopen a closed GitHub issue when additional work is needed.

## Usage

\`\`\`bash
/specweave:github:reopen-issue <increment-id> [--reason "why"]
\`\`\`

## Examples

\`\`\`bash
# Interactive (prompts for reason)
/specweave:github:reopen-issue 0007

# With reason
/specweave:github:reopen-issue 0007 --reason "Additional error handling needed"
\`\`\`

## What It Does

1. Checks increment metadata for GitHub issue
2. Reopens closed issue via `gh issue reopen`
3. Posts comment with reopen reason
4. Updates labels: +reopened, -completed
5. Records reopen in metadata.reopenHistory
```

---

### 6. ADO Plugin Implementation

**File**: `plugins/specweave-ado/lib/reopen-work-item.ts` (new file)

```typescript
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';

/**
 * Reopen a closed Azure DevOps work item
 */
export async function reopenADOWorkItem(
  incrementId: string,
  reason: string
): Promise<void> {
  const metadata = MetadataManager.read(incrementId);

  if (!metadata.ado?.workItemId) {
    throw new Error(`No ADO work item found for increment ${incrementId}`);
  }

  const workItemId = metadata.ado.workItemId;

  // Reopen work item via Azure CLI (safe - no shell injection)
  const reopenResult = await execFileNoThrow('az', [
    'boards',
    'work-item',
    'update',
    '--id',
    String(workItemId),
    '--state',
    'Active'
  ]);

  if (!reopenResult.success) {
    throw new Error(`Failed to reopen work item #${workItemId}: ${reopenResult.stderr}`);
  }

  // Add discussion comment
  await execFileNoThrow('az', [
    'boards',
    'work-item',
    'discussion',
    'add',
    '--id',
    String(workItemId),
    '--message',
    `**Reopened**: ${reason}\n\n---\n🤖 Reopened by SpecWeave`
  ]);

  console.log(`✅ ADO work item #${workItemId} reopened`);
}
```

**New Command**: `plugins/specweave-ado/commands/reopen-work-item.md`

---

### 7. Jira Plugin Implementation

**File**: `plugins/specweave-jira/lib/reopen-issue.ts` (new file)

```typescript
import { execFileNoThrow } from '../../../src/utils/execFileNoThrow.js';
import { MetadataManager } from '../../../src/core/increment/metadata-manager.js';

/**
 * Reopen a closed Jira issue
 */
export async function reopenJiraIssue(
  incrementId: string,
  reason: string
): Promise<void> {
  const metadata = MetadataManager.read(incrementId);

  if (!metadata.jira?.issueKey) {
    throw new Error(`No Jira issue found for increment ${incrementId}`);
  }

  const issueKey = metadata.jira.issueKey;

  // Reopen issue via jira CLI (safe - no shell injection)
  const reopenResult = await execFileNoThrow('jira', [
    'issue',
    'transition',
    issueKey,
    'Reopened'
  ]);

  if (!reopenResult.success) {
    throw new Error(`Failed to reopen Jira issue ${issueKey}: ${reopenResult.stderr}`);
  }

  // Add comment
  await execFileNoThrow('jira', [
    'issue',
    'comment',
    issueKey,
    `**Reopened**: ${reason}\n\n---\n🤖 Reopened by SpecWeave`
  ]);

  console.log(`✅ Jira issue ${issueKey} reopened`);
}
```

**New Command**: `plugins/specweave-jira/commands/reopen-issue.md`

---

## User Experience

### Scenario 1: Simple Reopen (No Scope Change)

```bash
# User discovers bug in "completed" increment
User: /specweave:resume 0007

Claude:
⚠️  Increment 0007 is COMPLETED
   - Completed: 2025-11-01 (3 days ago)
   - GitHub Issue: #4 (closed)
   - Previous reopens: 0

Resume this increment? This will:
✓ Change status: completed → active
✓ Reopen GitHub issue #4
✓ Post comment with reopen reason

Continue? [y/N]: y

Reason for reopening: Bug discovered in error handling

✅ Increment 0007 reopened
   Status: completed → active
   Reopened by: Anton Abyzov
   Reason: Bug discovered in error handling

✅ GitHub issue #4 reopened
   URL: https://github.com/anton-abyzov/specweave/issues/4
   Comment posted with reopen reason
   Labels: +reopened, -completed

Ready to work on increment 0007!
Next: /specweave:do
```

---

### Scenario 2: Reopen with Scope Change

```bash
User: /specweave:resume 0007 --update-scope

Claude:
Increment 0007 is completed. Reopening with scope update...

What changed?
User: Need to add retry logic for network failures

Claude:
✓ Reopening increment 0007...
✓ Updating spec.md with scope change...
✓ Regenerating tasks.md with new tasks...
✓ Reopening GitHub issue #4...

GitHub issue #4 updated:
- State: closed → open
- Label added: "scope-change", "reopened"
- Comment:
  > **Reopened with Scope Change**
  >
  > Additional work: Need to add retry logic for network failures
  >
  > New tasks generated. See updated increment for details.
  >
  > ---
  > 🤖 Reopened by SpecWeave

✅ Increment ready for work
   Tasks: 15 (8 original + 7 new)
   Coverage: 85% target
```

---

### Scenario 3: Manual Reopen (Specific Tool)

```bash
# User wants to manually reopen just the GitHub issue
User: /specweave:github:reopen-issue 0007 --reason "Stakeholder feedback"

Claude:
✓ Reading increment metadata...
✓ Found GitHub issue: #4
✓ Issue state: closed
✓ Reopening issue...

✅ GitHub issue #4 reopened
   Comment posted: "Stakeholder feedback"
   Labels updated: +reopened

Note: Increment 0007 is still completed.
Run /specweave:resume 0007 to resume work.
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (2-3 hours)

**Tasks**:
- [ ] Update VALID_TRANSITIONS to allow `completed → active`
- [ ] Add `reopenHistory` field to IncrementMetadata interface
- [ ] Update JSON schema: `src/core/schemas/increment-metadata.schema.json`
- [ ] Add `MetadataManager.reopen()` method
- [ ] Add `MetadataManager.hasFrequentReopens()` helper
- [ ] Write unit tests for reopen transitions

**Files**:
- `src/core/types/increment-metadata.ts`
- `src/core/increment/metadata-manager.ts`
- `src/core/schemas/increment-metadata.schema.json`
- `tests/unit/increment/metadata-manager.test.ts`

---

### Phase 2: Resume Command Enhancement (2-3 hours)

**Tasks**:
- [ ] Detect completed increments in `/specweave:resume`
- [ ] Prompt for reopen confirmation
- [ ] Get reopen reason from user
- [ ] Call `MetadataManager.reopen()`
- [ ] Detect and call sync plugin reopen methods
- [ ] Show success message with audit trail
- [ ] Handle edge cases (no issue, permission denied, etc.)

**Files**:
- `plugins/specweave/commands/resume.md`
- `plugins/specweave/lib/resume-increment.ts` (new)
- `tests/integration/resume-command/resume-completed.test.ts` (new)

---

### Phase 3: GitHub Plugin Reopen (2-3 hours)

**Tasks**:
- [ ] Create `reopenGitHubIssue()` function
- [ ] Add `/specweave:github:reopen-issue` command
- [ ] Implement gh CLI reopen logic (using execFileNoThrow)
- [ ] Update labels (+reopened, -completed)
- [ ] Post comment with reason
- [ ] Update metadata with sync info
- [ ] Write integration tests
- [ ] Update documentation

**Files**:
- `plugins/specweave-github/lib/reopen-issue.ts` (new)
- `plugins/specweave-github/commands/reopen-issue.md` (new)
- `tests/integration/github-sync/reopen-issue.test.ts` (new)
- `plugins/specweave-github/skills/github-sync/SKILL.md` (update)

---

### Phase 4: ADO Plugin Reopen (1-2 hours)

**Tasks**:
- [ ] Create `reopenADOWorkItem()` function
- [ ] Add `/specweave:ado:reopen-work-item` command
- [ ] Implement Azure CLI reopen logic (using execFileNoThrow)
- [ ] Post discussion comment
- [ ] Write integration tests
- [ ] Update documentation

**Files**:
- `plugins/specweave-ado/lib/reopen-work-item.ts` (new)
- `plugins/specweave-ado/commands/reopen-work-item.md` (new)
- `tests/integration/ado-sync/reopen-work-item.test.ts` (new)
- `plugins/specweave-ado/skills/ado-sync/SKILL.md` (update)

---

### Phase 5: Jira Plugin Reopen (1-2 hours)

**Tasks**:
- [ ] Create `reopenJiraIssue()` function
- [ ] Add `/specweave:jira:reopen-issue` command
- [ ] Implement Jira CLI reopen logic (using execFileNoThrow)
- [ ] Add comment with reason
- [ ] Write integration tests
- [ ] Update documentation

**Files**:
- `plugins/specweave-jira/lib/reopen-issue.ts` (new)
- `plugins/specweave-jira/commands/reopen-issue.md` (new)
- `tests/integration/jira-sync/reopen-issue.test.ts` (new)
- `plugins/specweave-jira/skills/jira-sync/SKILL.md` (update)

---

### Phase 6: Testing & Documentation (2-3 hours)

**Tasks**:
- [ ] Unit tests for metadata reopen
- [ ] Integration tests for each plugin
- [ ] E2E test: complete → resume → reopen
- [ ] Update CHANGELOG.md
- [ ] Update user documentation (docs-site)
- [ ] Update CLAUDE.md with reopen workflow
- [ ] Create examples in README

**Files**:
- `tests/unit/increment/reopen.test.ts` (new)
- `tests/integration/resume-command/reopen-flow.test.ts` (new)
- `tests/e2e/reopen-increment.spec.ts` (new)
- `CHANGELOG.md`
- `docs-site/docs/guides/reopening-increments.md` (new)
- `CLAUDE.md`
- `README.md`

---

## Success Metrics

**Implementation Success**:
- ✅ All unit tests passing (metadata reopen logic)
- ✅ All integration tests passing (GitHub/ADO/Jira reopen)
- ✅ All E2E tests passing (complete flow)
- ✅ Documentation updated
- ✅ Zero regression (existing features work)
- ✅ No shell injection vulnerabilities (using execFileNoThrow)

**User Experience Success**:
- ✅ Reopen takes <5 seconds (fast workflow)
- ✅ Clear prompts and confirmations (no confusion)
- ✅ Error messages are actionable (users know what to do)
- ✅ Audit trail complete (compliance requirements met)

**Quality Metrics**:
- ✅ <3 reopens per increment on average (good initial planning)
- ✅ Zero data loss (metadata always consistent)
- ✅ 100% sync accuracy (external tools match increment state)

---

## Rollout Plan

### v0.8.0 Release (Reopen Logic)

**Included**:
- ✅ Core reopen infrastructure
- ✅ GitHub plugin reopen
- ✅ ADO plugin reopen
- ✅ Jira plugin reopen
- ✅ Documentation and examples
- ✅ Security: All CLI operations use execFileNoThrow (no shell injection)

**Excluded (Future)**:
- ⏳ Auto-reopen detection (AI suggests reopening)
- ⏳ Bulk reopen operations
- ⏳ Reopen analytics dashboard

---

## Security Considerations

**All external CLI operations use `execFileNoThrow`** to prevent shell injection:

✅ **Safe** (execFileNoThrow):
```typescript
await execFileNoThrow('gh', ['issue', 'reopen', issueNumber, '--comment', reason]);
```

❌ **Unsafe** (exec with string interpolation):
```typescript
// NEVER DO THIS - vulnerable to injection
exec(`gh issue reopen ${issueNumber} --comment "${reason}"`);
```

**Benefits of execFileNoThrow**:
- ✅ No shell interpretation (prevents command injection)
- ✅ Windows compatibility (handles path escaping)
- ✅ Proper error handling
- ✅ Structured output (stdout, stderr, success status)

---

## References

### Related Issues

- #15 - [INC-0007] Smart Increment Discipline v2.0 (current tracking)
- #4 - [Increment 0007] Original issue (closed, needs reopen)

### Related Increments

- 0007-smart-increment-discipline - This increment

### Related Documentation

- [Increment Lifecycle](docs-site/docs/concepts/increment-lifecycle.md)
- [GitHub Sync](plugins/specweave-github/skills/github-sync/SKILL.md)
- [Metadata Management](src/core/increment/metadata-manager.ts)
- [execFileNoThrow Security](src/utils/execFileNoThrow.ts)

---

**End of Design Document**

**Next Steps**:
1. Review and approve design
2. Create increment for implementation (0008-reopen-logic?)
3. Follow implementation plan phases
4. Test thoroughly (unit + integration + E2E)
5. Security audit (verify all execFileNoThrow usage)
6. Update documentation
7. Release as v0.8.0

**Total Estimated Effort**: 12-15 hours of focused work
