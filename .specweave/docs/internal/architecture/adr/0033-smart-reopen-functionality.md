# ADR-0033: Smart Reopen Functionality

**Status**: ✅ ACCEPTED
**Date**: 2025-11-14
**Increment**: 0032-prevent-increment-number-gaps
**Deciders**: Anton Abyzov (Maintainer)

## Context and Problem Statement

When users complete increments/tasks and later discover issues, they had no way to reopen them. The COMPLETED status was terminal with no transition back to ACTIVE, forcing users to:

1. ❌ Create new increments for simple fixes
2. ❌ Manually edit metadata.json (risky)
3. ❌ Lose audit trail of what was reopened and why
4. ❌ Manually search for related work

**User Story**:
> "I completed increment 0031 yesterday, but discovered the GitHub sync isn't working in production. I need to reopen the specific tasks related to GitHub API integration to fix them."

## Decision Drivers

1. **User Experience**: Make it easy to reopen work without losing audit trail
2. **Smart Detection**: Auto-detect what needs reopening based on user reports
3. **WIP Discipline**: Respect WIP limits even during reopening
4. **Traceability**: Full audit trail of all reopens
5. **External Sync**: Keep GitHub/JIRA/ADO in sync

## Considered Options

### Option 1: Manual metadata.json Editing (Rejected)

**Pros**:
- ✅ Simple implementation
- ✅ No new code needed

**Cons**:
- ❌ Error-prone (manual JSON editing)
- ❌ No WIP limit validation
- ❌ No audit trail
- ❌ Doesn't sync to external tools
- ❌ Poor user experience

### Option 2: Create New Increment for Fixes (Rejected)

**Pros**:
- ✅ Preserves "completed means done" philosophy
- ✅ Clear separation of work

**Cons**:
- ❌ Inflates increment numbers
- ❌ Loses context (separate from original work)
- ❌ More overhead for small fixes
- ❌ Confusing for stakeholders

### Option 3: Smart Reopen with Auto-Detection (ACCEPTED) ✅

**Pros**:
- ✅ **Auto-detection**: Scans recent work, suggests what to reopen
- ✅ **WIP limits respected**: Validates before reopening
- ✅ **Full audit trail**: Tracks all reopens in metadata
- ✅ **External sync**: GitHub/JIRA/ADO stay updated
- ✅ **Flexible**: Task-level, user story-level, or increment-level
- ✅ **User-friendly**: Natural language detection ("not working")

**Cons**:
- ⚠️  Adds complexity to status transitions
- ⚠️  Requires careful WIP limit handling

**Decision**: This option provides the best user experience while maintaining discipline.

## Decision Outcome

**Chosen**: Option 3 - Smart Reopen with Auto-Detection

### Status Transition Change

**Before** (terminal state):
```
COMPLETED → (no transitions allowed)
```

**After** (reopenable):
```
COMPLETED → ACTIVE (reopen for fixes)
COMPLETED → ABANDONED (mark as failed, rare)
```

### Three-Level Reopen System

**Level 1: Task Reopen** (surgical fix)
- Marks task as `[ ]` in tasks.md
- Updates external issue checkbox
- Doesn't change increment status
- Use case: Small bug in one feature

**Level 2: User Story Reopen** (feature-level fix)
- Reopens all tasks with matching AC-IDs
- Updates living docs spec status
- Syncs to external tools
- Use case: Acceptance criteria not met

**Level 3: Increment Reopen** (systemic fix)
- Transitions COMPLETED → ACTIVE
- Validates WIP limits
- Reopens all incomplete tasks
- Syncs to external tools
- Use case: Multiple features broken

### Smart Detection System

**Activation Keywords**:
- "not working", "broken", "failing"
- "bug", "issue", "problem"
- "error", "crash", "regression"

**Scanning Scope**:
- Active increments (always)
- Recently completed (last 7 days)
- All tasks from these increments

**Relevance Scoring**:
- +10 points: Exact match in title/ID
- +7 points: Partial match in title
- +5 points: Match in increment ID
- +3 points: Match in description/AC

**Example**:
```
User: "GitHub sync not working"

Smart Detector:
🔍 Found 2 matches:
  📦 Increment 0031-external-tool-status-sync (15 points)
  ✓ Task T-003 GitHub Content Sync (14 points)

💡 /specweave:reopen 0031 --task T-003 --reason "GitHub sync failing"
```

### WIP Limit Validation

**Rules**:
1. Check current active count for increment type
2. If reopening exceeds limit → warn (allow --force)
3. If unlimited type (hotfix, bug, experiment) → allow
4. Suggest pausing another increment to make room

**Example**:
```
⚠️  WIP LIMIT WARNING:
   Current active: 2 features
   Limit: 2 features
   Reopening will EXCEED limit (3/2)!

Options:
1. Pause: /specweave:pause 0030
2. Force: /specweave:reopen 0031 --force --reason "Production critical"
```

### Audit Trail

**Metadata tracking**:
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

**Task annotations**:
```markdown
### T-003: GitHub Content Sync

**Status**: [ ] (Reopened: 2025-11-14 - GitHub sync failing)

**Previous Completions**:
- Completed: 2025-11-12T10:00:00Z
- Reopened: 2025-11-14T15:30:00Z - GitHub sync failing
```

## Implementation

### Core Components

**1. IncrementReopener** (`src/core/increment/increment-reopener.ts`)
- `reopenIncrement()` - Increment-level reopen
- `reopenTask()` - Task-level reopen
- `reopenUserStory()` - User story-level reopen
- `validateWIPLimits()` - WIP limit checking

**2. RecentWorkScanner** (`src/core/increment/recent-work-scanner.ts`)
- `scanRecentIncrements()` - Find completed increments (7 days)
- `scanRecentTasks()` - Find completed tasks (7 days)
- `matchKeywords()` - Pattern matching with scoring
- `formatMatches()` - Display matches

**3. Smart Reopen Detector** (Skill)
- File: `plugins/specweave/skills/smart-reopen-detector/SKILL.md`
- Auto-activates on issue keywords
- Uses RecentWorkScanner for detection
- Suggests reopen commands with relevance scores

**4. /specweave:reopen Command**
- File: `plugins/specweave/commands/specweave-reopen.md`
- Parameters: `--task`, `--user-story`, `--reason`, `--force`
- Executes IncrementReopener logic
- Syncs to external tools

### External Tool Sync

**GitHub**:
- Reopens closed issue
- Updates issue body with reopen reason
- Unchecks completed task checkboxes
- Adds `reopened` label

**JIRA**:
- Transitions: Done → In Progress
- Adds comment with reason

**Azure DevOps**:
- Updates state: Closed → Active
- Adds comment with reason

## Consequences

### Positive

- ✅ **Better UX**: Easy to fix issues without creating new increments
- ✅ **Smart**: Auto-detects what to reopen based on keywords
- ✅ **Disciplined**: WIP limits still respected
- ✅ **Traceable**: Full audit trail of all reopens
- ✅ **Synced**: External tools stay up to date
- ✅ **Flexible**: Task, user story, or increment level

### Negative

- ⚠️  **Complexity**: Adds state transition logic
- ⚠️  **WIP bypass risk**: Users might abuse --force
- ⚠️  **Reopen loops**: Risk of repeatedly reopening same work

### Mitigation

**For complexity**:
- Clear documentation
- Comprehensive tests
- Simple API surface

**For WIP bypass**:
- Require --reason for audit trail
- Warn loudly when --force used
- Track force usage in metadata

**For reopen loops**:
- Track reopen count in metadata
- Warn if count > 2
- Suggest creating new increment if loops detected

## Alternatives After Implementation

If this proves problematic:

**Alternative 1**: Disable increment reopen, only allow task reopen
**Alternative 2**: Add cooldown period (can't reopen within 24 hours)
**Alternative 3**: Require approval for increment reopen

## Validation

### Success Criteria

- ✅ Can reopen completed increments
- ✅ Can reopen specific tasks
- ✅ Can reopen user stories
- ✅ WIP limits validated
- ✅ Audit trail preserved
- ✅ External tools synced
- ✅ Smart detection works
- ✅ Build passes (TypeScript compilation)

### Testing Strategy

**Unit Tests**:
- `increment-reopener.test.ts` (to be added)
- `recent-work-scanner.test.ts` (to be added)

**Integration Tests**:
- Reopen flow with external sync
- WIP limit validation

**E2E Tests**:
- Complete → Reopen → Fix → Complete workflow

## References

- **Design Doc**: `.specweave/increments/0032-prevent-increment-number-gaps/reports/SMART-REOPEN-ARCHITECTURE.md`
- **Implementation**: `src/core/increment/increment-reopener.ts`
- **Skill**: `plugins/specweave/skills/smart-reopen-detector/SKILL.md`
- **Command**: `plugins/specweave/commands/specweave-reopen.md`

## Related ADRs

- ADR-0018: Increment Discipline (WIP limits)
- ADR-0007: Smart Status Management
- ADR-0030: Intelligent Living Docs Sync

---

**Status**: ✅ IMPLEMENTED
**Version**: v0.19.0 (planned)
**Migration**: No breaking changes, backward compatible
