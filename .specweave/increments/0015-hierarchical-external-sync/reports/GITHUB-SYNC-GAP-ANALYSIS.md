# GitHub Sync Gap Analysis - Critical Issues

**Date**: 2025-11-10
**Increment**: 0015-hierarchical-external-sync
**Issue**: GitHub Issue #29
**Severity**: 🔴 **CRITICAL** - Core functionality incomplete

---

## Executive Summary

**THE PROBLEM**: SpecWeave's GitHub sync is fundamentally incomplete. While the configuration promises bidirectional sync and living docs updates, **the actual implementation only syncs task checkboxes** in the GitHub issue description. Critical gaps exist:

1. ❌ Living docs specs **NEVER sync to GitHub**
2. ❌ Increment changes (spec.md, plan.md) **NEVER update GitHub issues**
3. ❌ Bidirectional sync is **NOT implemented** (GitHub → SpecWeave)
4. ❌ External tracker sync happens **ONLY on task completion**, not on increment changes

**IMPACT**: Users expect complete progress tracking in GitHub (as advertised in CLAUDE.md and docs), but GitHub issues become stale immediately after creation and only show task checkbox updates.

---

## Current State Analysis

### What Actually Works ✅

**File**: `plugins/specweave/hooks/post-task-completion.sh` (lines 243-333)

```bash
# Syncs ONLY:
1. Task checkbox updates in GitHub issue description
   - Reads tasks.md
   - Finds completed tasks (## T-XXX: with [x] checkbox)
   - Updates issue body with sed to mark checkboxes [x]
   - Posts progress comment: "X/Y tasks (Z%)"

# Example:
# Issue description before:
#   - [ ] T-001: Update types
#   - [ ] T-002: Add JQL builder
#
# After task T-001 complete:
#   - [x] T-001: Update types
#   - [ ] T-002: Add JQL builder
#
# Comment posted: "Progress Update: 1/12 tasks (8%)"
```

**Trigger**: Only fires on `TodoWrite` event (task completion)
**Scope**: Only updates task checkboxes + progress comment
**Works**: Yes, but extremely limited

---

### What's Broken/Missing ❌

#### 1. Living Docs Sync is a STUB

**File**: `dist/plugins/specweave/lib/hooks/sync-living-docs.js`

```javascript
// Current implementation:
async function syncLivingDocs(incrementId) {
    // 1. Detects changed docs via git diff ✅
    // 2. Logs what changed ✅
    // 3. DOES NOTHING TO SYNC TO GITHUB ❌

    console.log('🔄 Syncing living docs...');
    console.log('(Actual sync command invocation to be implemented in future version)');
    // TODO: Implement actual sync command invocation

    // Future implementation:
    // await invokeSyncDocsCommand(incrementId);  ← NEVER CALLED!
}
```

**Result**: Living docs specs in `.specweave/docs/internal/specs/spec-*.md` are NEVER reflected in GitHub issues.

**Example**:
```bash
# Living docs updated:
.specweave/docs/internal/specs/spec-001-core-framework-architecture.md
  ↳ Added: "US-010: Plugin marketplace"
  ↳ Updated: "Increment 0004 complete"

# GitHub Issue #4:
  ↳ Still shows: "Implementing US-001 to US-005"
  ↳ NO UPDATE! ❌
```

---

#### 2. Increment Changes Don't Update GitHub

**What happens**:
```bash
# User updates spec.md (scope change):
vim .specweave/increments/0015-hierarchical-external-sync/spec.md
# Added: US-006: Multi-ADO sync
# Removed: US-002 (deferred to next increment)

# Expected: GitHub issue #29 updates with new scope
# Actual: NOTHING HAPPENS ❌

# GitHub issue still shows:
#   "Implementing US-001 through US-005"
#   (Outdated! Wrong scope!)
```

**Why**: No hook for spec.md/plan.md changes, only TodoWrite fires hooks

---

#### 3. Bidirectional Sync is NOT Implemented

**Config promises**:
```json
{
  "sync": {
    "settings": {
      "syncDirection": "bidirectional"  // ← LIES! Only one-way!
    }
  }
}
```

**What works**:
- ✅ SpecWeave → GitHub: Task checkboxes only

**What doesn't work**:
- ❌ GitHub → SpecWeave: If user updates issue title, body, or closes issue, SpecWeave NEVER knows
- ❌ GitHub comments → SpecWeave: Comments on GitHub issue are never imported
- ❌ GitHub assignee changes → SpecWeave: No reflection in metadata.json
- ❌ GitHub milestones → SpecWeave: No sync

**Example**:
```bash
# On GitHub: User closes issue #29 as "completed"
# In SpecWeave:
cat .specweave/increments/0015-hierarchical-external-sync/metadata.json
# Still shows: "status": "active"  ❌ WRONG!
```

---

#### 4. Sync Only on Task Completion

**Current trigger**: `post-task-completion.sh` only fires on TodoWrite

**Missing triggers**:
- ❌ When spec.md changes (scope updates)
- ❌ When plan.md changes (architecture pivots)
- ❌ When tasks.md changes (NEW tasks added)
- ❌ When increment status changes (paused, resumed, abandoned)
- ❌ When living docs updated (ADRs, HLDs, diagrams created)

**Example**:
```bash
# User pauses increment:
/specweave:pause 0015 --reason="Waiting for API keys"

# Expected: GitHub issue #29 gets comment:
#   "⏸️ Paused: Waiting for API keys"
# Actual: NOTHING ❌

# GitHub stakeholders have NO IDEA increment is paused!
```

---

## Architecture Gap Analysis

### Current Flow (Incomplete)

```
┌─────────────────────────────────────────────────────────┐
│ SpecWeave                                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  /specweave:increment "feature"                          │
│    ├─> spec.md created                                   │
│    ├─> plan.md created                                   │
│    ├─> tasks.md created                                  │
│    └─> post-increment-planning hook                      │
│        └─> GitHub issue created ✅                       │
│                                                           │
│  Task T-001 completed                                    │
│    ├─> TodoWrite event                                   │
│    └─> post-task-completion hook                         │
│        ├─> Living docs sync (STUB!) ❌                   │
│        └─> GitHub sync (tasks only) ⚠️                   │
│            ├─> Update checkboxes ✅                      │
│            └─> Post progress comment ✅                  │
│                                                           │
│  Living docs updated (.specweave/docs/internal/specs/)   │
│    └─> NO SYNC TO GITHUB ❌                              │
│                                                           │
│  Increment scope changed (spec.md edited)                │
│    └─> NO SYNC TO GITHUB ❌                              │
│                                                           │
│  Increment paused/resumed/abandoned                      │
│    └─> NO SYNC TO GITHUB ❌                              │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │
         │ Only task checkboxes sync ⚠️
         ↓
┌─────────────────────────────────────────────────────────┐
│ GitHub Issue #29                                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INC-0015] Hierarchical External Sync                   │
│                                                           │
│  Status: In Progress                                      │
│  Tasks:                                                   │
│    - [x] T-001: Update types                             │
│    - [ ] T-002: JSON schema                              │
│    ...                                                    │
│                                                           │
│  ❌ NO LIVING DOCS LINK                                  │
│  ❌ NO SPEC UPDATES                                      │
│  ❌ NO SCOPE CHANGES                                     │
│  ❌ NO STATUS CHANGES                                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │
         │ NO SYNC BACK ❌
         ↓
         (Changes in GitHub are lost)
```

---

### What's SUPPOSED to Happen (Per Documentation)

**From**: `CLAUDE.md` (lines 78-83)

```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true,        // ← Promises living docs sync
      "sync_tasks_md": true,           // ← Works
      "external_tracker_sync": true    // ← Only tasks, not full sync!
    }
  }
}
```

**User Expectation**: All three should work together:
1. `sync_living_docs: true` → Living docs update `.specweave/docs/internal/specs/` ✅
2. `external_tracker_sync: true` → GitHub issue reflects living docs changes ❌ **BROKEN**

**From**: Main flow diagram (`.specweave/docs/internal/architecture/diagrams/1-main-flow.mmd` lines 206-214)

```mermaid
DocsSync{Auto-sync enabled?}
DocsSync -->|Yes| UpdateDocs[Living Docs Agent:
  Sync increment spec to living docs
  .specweave/docs/internal/specs/
  Update with completion status]
DocsSync -->|No| ExternalSync

ExternalSync{External sync enabled?}
ExternalSync -->|Yes| SyncExternal[Sync to external tool:
  ✓ Update GitHub issue tasks
  ✓ Or update Jira epic
  ✓ Or update ADO work item
  Bidirectional sync]  ← CLAIMS BIDIRECTIONAL ❌
```

**Reality**: External sync is NOT bidirectional, and living docs NEVER reach GitHub!

---

## Real-World Impact

### Scenario 1: Product Manager Tracking Progress

```bash
# PM wants to check increment progress from GitHub:

1. Opens GitHub issue #29
2. Sees: "- [x] T-001: Update types (8%)"
3. Checks living docs link: ❌ NO LINK!
4. Wants to see spec changes: ❌ NOT IN ISSUE!
5. Wants to know if scope changed: ❌ NO UPDATE!

Result: PM has NO VISIBILITY into actual progress beyond task checkboxes.
        Has to ping developer on Slack: "What's the real status?"
```

### Scenario 2: Stakeholder Reviewing Feature Scope

```bash
# Stakeholder wants to review feature scope:

1. Opens GitHub issue #29
2. Reads initial description (created 5 days ago)
3. Doesn't know:
   - ❌ Was scope reduced? (US-002 deferred?)
   - ❌ Were new user stories added? (US-006 added?)
   - ❌ What's in living docs spec? (spec-005.md updated?)
   - ❌ Were there architecture changes? (ADR-018 created?)

Result: Stakeholder makes decisions based on STALE information.
```

### Scenario 3: Developer Closing Increment

```bash
# Developer completes increment:

1. Runs: /specweave:done 0015
2. SpecWeave closes increment locally ✅
3. GitHub issue #29: ❌ STILL OPEN!
4. Living docs spec-005.md: ❌ NO LINK FROM GITHUB!

Result: GitHub shows 30 open issues when actually all are done.
        Stakeholders think project is behind schedule.
```

---

## What Needs to Be Fixed

### Priority 1: Critical Gaps (Must Fix)

#### 1.1 Implement Living Docs → GitHub Sync

**File**: `plugins/specweave/lib/hooks/sync-living-docs.js`

**Current**:
```javascript
// TODO: Implement actual sync command invocation
console.log('(Actual sync command invocation to be implemented in future version)');
```

**Fix**:
```javascript
async function syncLivingDocs(incrementId) {
  // 1. Detect changed living docs ✅ (already works)
  const changedDocs = detectChangedDocs();

  // 2. Get GitHub issue number from metadata.json
  const metadata = loadMetadata(incrementId);
  if (!metadata.github?.issue) {
    console.log('No GitHub issue linked, skipping sync');
    return;
  }

  // 3. Sync changed docs to GitHub issue
  for (const docPath of changedDocs) {
    if (docPath.includes('specs/spec-')) {
      // Update issue body with "Living Docs" section
      await updateIssueLivingDocsSection(metadata.github.issue, docPath);
    }

    if (docPath.includes('architecture/adr/')) {
      // Post comment with ADR summary
      await postADRComment(metadata.github.issue, docPath);
    }
  }
}
```

---

#### 1.2 Sync Increment Changes to GitHub

**New File**: `plugins/specweave/hooks/post-increment-change.sh`

**Trigger**: After spec.md, plan.md, or tasks.md changes

**What it does**:
```bash
#!/bin/bash
# Fires when increment files change (spec.md, plan.md, tasks.md)

# 1. Detect what changed
if [[ $CHANGED_FILE == "spec.md" ]]; then
  # Extract user stories from spec.md
  # Update GitHub issue description with new scope
  gh issue edit $ISSUE_NUMBER --body "$NEW_BODY"
fi

if [[ $CHANGED_FILE == "plan.md" ]]; then
  # Post comment about architecture changes
  gh issue comment $ISSUE_NUMBER --body "Architecture updated: ..."
fi

if [[ $CHANGED_FILE == "tasks.md" ]]; then
  # Update task checklist in issue description
  # (already implemented, but make it trigger here too)
fi
```

---

#### 1.3 Implement Bidirectional Sync

**New File**: `plugins/specweave-github/lib/github-sync-bidirectional.ts`

**What it does**:
```typescript
// Run on cron or on /specweave:sync command

async function syncFromGitHub(incrementId: string) {
  // 1. Load metadata
  const metadata = loadMetadata(incrementId);
  const issueNumber = metadata.github?.issue;

  // 2. Fetch current issue state from GitHub
  const issue = await gh.getIssue(issueNumber);

  // 3. Compare with local state
  const localStatus = metadata.status; // "active"
  const githubStatus = issue.state; // "closed"

  if (githubStatus === 'closed' && localStatus !== 'completed') {
    console.warn('⚠️  GitHub issue closed but SpecWeave increment still active!');
    // Prompt user to close increment:
    // /specweave:done <incrementId>
  }

  // 4. Sync comments
  const comments = await gh.getComments(issueNumber);
  for (const comment of comments) {
    // Save to .specweave/increments/<id>/logs/github-comments.md
    appendComment(incrementId, comment);
  }

  // 5. Sync assignees, labels, milestones
  await syncMetadata(incrementId, issue);
}
```

---

#### 1.4 Add More Sync Triggers

**Current**: Only `post-task-completion.sh` exists

**Needed**:
```bash
# New hooks:
plugins/specweave/hooks/
├── post-increment-change.sh       ← Fires when spec/plan/tasks change
├── post-increment-status-change.sh ← Fires on pause/resume/abandon
├── post-docs-update.sh            ← Fires when living docs change
└── post-task-completion.sh        ← Already exists
```

---

### Priority 2: Enhancement (Nice to Have)

#### 2.1 Living Docs Links in GitHub Issue

**Add to issue description**:
```markdown
## Living Docs

📚 **Specifications**:
- [spec-005-stabilization.md](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/spec-005-stabilization-1.0.0.md)

🏗️ **Architecture**:
- [ADR-018: Hierarchical Sync](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/architecture/adr/0018-hierarchical-sync.md)

📊 **Diagrams**:
- [Multi-Project Sync Flow](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/architecture/diagrams/multi-project-sync.mmd)
```

---

#### 2.2 Scope Change Tracking

**Post comment when scope changes**:
```markdown
**Scope Change Detected** (2025-11-10 14:30 UTC)

**Added**:
- ✅ US-006: Multi-ADO sync

**Removed**:
- ❌ US-002: GitHub Project Board resolution (deferred to increment 0016)

**Reason**: ADO sync higher priority for enterprise customers

**Impact**: +8 hours (ADO sync), -5 hours (GitHub boards deferred)
```

---

#### 2.3 Real-Time Status Updates

**Post comment on status changes**:
```markdown
⏸️ **Increment Paused** (2025-11-10 15:00 UTC)

**Reason**: Waiting for API keys from infrastructure team
**Expected Resume**: 2025-11-12 (2 days)
**Current Progress**: 5/12 tasks (42%)
```

---

## Proposed Implementation Plan

### Phase 1: Fix Living Docs Sync (2 days)

**Files**:
- `plugins/specweave/lib/hooks/sync-living-docs.ts` (complete implementation)
- `plugins/specweave-github/lib/github-issue-updater.ts` (NEW)

**What**:
1. Implement `syncLivingDocsToGitHub()` function
2. Update GitHub issue description with "Living Docs" section
3. Post comments for ADRs/HLDs/diagrams

**Test**:
```bash
# Create increment
/specweave:increment "test feature"

# Complete task
vim src/test.ts && git add . && git commit -m "feat: add test"

# Update living docs
vim .specweave/docs/internal/specs/spec-001.md

# Verify GitHub issue updated with living docs link
gh issue view <issue-number>
```

---

### Phase 2: Increment Change Sync (2 days)

**Files**:
- `plugins/specweave/hooks/post-increment-change.sh` (NEW)
- `plugins/specweave-github/lib/github-sync-increment-changes.ts` (NEW)

**What**:
1. Hook fires when spec.md/plan.md/tasks.md changes
2. Update GitHub issue description with new scope
3. Post comment about changes

**Test**:
```bash
# Update spec.md
vim .specweave/increments/0015/spec.md
# Add: US-006: New feature

# Verify GitHub issue updated
gh issue view 29
# Should show: "Scope updated: Added US-006"
```

---

### Phase 3: Bidirectional Sync (3 days)

**Files**:
- `plugins/specweave-github/lib/github-sync-bidirectional.ts` (NEW)
- `src/cli/commands/sync-from-github.ts` (NEW command: `/specweave-github:sync-from`)

**What**:
1. Fetch GitHub issue state
2. Compare with local SpecWeave state
3. Sync comments, status, assignees, labels
4. Warn on conflicts

**Test**:
```bash
# On GitHub: Close issue #29
gh issue close 29

# In SpecWeave: Run sync
/specweave-github:sync-from 0015

# Should warn:
# ⚠️  GitHub issue closed but SpecWeave increment still active!
# Run: /specweave:done 0015
```

---

### Phase 4: Additional Triggers (1 day)

**Files**:
- `plugins/specweave/hooks/post-increment-status-change.sh` (NEW)
- `plugins/specweave/hooks/post-docs-update.sh` (NEW)

**What**:
1. Hook for pause/resume/abandon
2. Hook for living docs updates (ADRs/HLDs)

**Test**:
```bash
# Pause increment
/specweave:pause 0015 --reason="Waiting for API"

# Verify GitHub comment posted
gh issue view 29
# Should show: "⏸️ Paused: Waiting for API"
```

---

## Testing Strategy

### Unit Tests (90% coverage)

**File**: `tests/unit/github/github-sync-living-docs.test.ts`

```typescript
describe('GitHub Living Docs Sync', () => {
  it('updates issue with living docs links', async () => {
    const issue = await syncLivingDocs('0015', ['spec-005.md']);
    expect(issue.body).toContain('## Living Docs');
    expect(issue.body).toContain('spec-005-stabilization');
  });

  it('posts comment for ADR creation', async () => {
    const comment = await syncADR('0015', 'adr-018.md');
    expect(comment.body).toContain('ADR-018');
  });
});
```

---

### Integration Tests (85% coverage)

**File**: `tests/integration/github/bidirectional-sync.test.ts`

```typescript
describe('Bidirectional GitHub Sync', () => {
  it('syncs closed issue to SpecWeave', async () => {
    // 1. Create increment
    const inc = await createIncrement('test');

    // 2. Close GitHub issue
    await gh.closeIssue(inc.github.issue);

    // 3. Sync from GitHub
    await syncFromGitHub(inc.id);

    // 4. Verify SpecWeave metadata updated
    const metadata = loadMetadata(inc.id);
    expect(metadata.github.state).toBe('closed');
  });
});
```

---

### E2E Tests (100% critical path)

**File**: `tests/e2e/github-sync-full-flow.spec.ts`

```typescript
test('Full GitHub sync flow', async () => {
  // 1. Create increment
  await page.click('[data-test-id="create-increment"]');

  // 2. Complete task
  await page.click('[data-test-id="mark-complete"]');

  // 3. Update living docs
  await fs.writeFile('.specweave/docs/internal/specs/spec-001.md', '...');

  // 4. Verify GitHub issue updated
  const issue = await gh.getIssue(29);
  expect(issue.body).toContain('Living Docs');
  expect(issue.body).toContain('spec-001');
});
```

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| GitHub API rate limits | High | High | Batch updates, cache state, rate limit protection |
| Merge conflicts (bidirectional sync) | Medium | High | Conflict resolution wizard, prompt user |
| Performance issues (large issues) | Low | Medium | Paginate comments, limit sync depth |
| Breaking existing workflows | Low | High | Backward compatibility, feature flags |

---

## Success Metrics

### Before (Current State)

- ❌ Living docs sync: 0% (stub only)
- ⚠️  Task checkbox sync: 100% (works but limited)
- ❌ Bidirectional sync: 0%
- ❌ Increment change sync: 0%

### After (Target State)

- ✅ Living docs sync: 100%
- ✅ Task checkbox sync: 100%
- ✅ Bidirectional sync: 90% (edge cases may need manual resolution)
- ✅ Increment change sync: 100%

### User Impact

**Before**:
- Stakeholders: "I have no idea what's happening, GitHub is stale"
- PMs: "Why do I have to ping developers for status updates?"
- Developers: "GitHub doesn't reflect my work, waste of time"

**After**:
- Stakeholders: "GitHub is always up-to-date, I can track progress myself"
- PMs: "I can see scope changes, status updates, everything in GitHub"
- Developers: "GitHub auto-updates, I just focus on code"

---

## Conclusion

**The Gap**: SpecWeave's GitHub sync is fundamentally incomplete. While the configuration and documentation promise comprehensive sync, the actual implementation is limited to task checkbox updates only.

**The Fix**: Implement the missing sync mechanisms in 4 phases (~8 days total effort).

**The Impact**: Complete visibility for stakeholders, PMs can track progress in GitHub, developers spend less time on manual updates.

**Next Steps**: Approve this plan and prioritize Phase 1 (living docs sync) as the most critical missing piece.

---

**Questions?** Review this document and decide:
1. Should we fix this in increment 0015 (current)?
2. Or create new increment 0016 (GitHub sync completion)?
3. Or mark as technical debt and defer?

**Recommendation**: Fix in increment 0016 (separate from hierarchical sync) to avoid scope creep.
