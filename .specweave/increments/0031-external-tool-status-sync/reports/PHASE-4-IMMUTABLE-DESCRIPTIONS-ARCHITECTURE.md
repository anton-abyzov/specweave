# Phase 4: Immutable Descriptions + Progress Comments Architecture

**Date**: 2025-11-15
**Increment**: 0031-external-tool-status-sync
**Author**: SpecWeave Team
**Status**: Architecture Complete, Ready for Implementation

---

## Executive Summary

This document describes the architecture for **Option 3: Immutable Descriptions + Progress Comments**, which solves the AC mismatch problem identified in GitHub Issue #499 by fundamentally changing how we update external issues.

**The Problem**: GitHub issue descriptions and progress comments show different acceptance criteria counts because:
1. Issue descriptions created at issue creation time (snapshot)
2. Progress updates read from current living docs (evolved spec)
3. No synchronization between the two

**The Solution**: Make issue descriptions immutable after creation, communicate all updates via progress comments.

---

## The Core Problem: AC Sync Mismatch

### Current Architecture (Problematic)

```
Timeline:
┌────────────────────────────────────────────────────────────────┐
│ T0: Issue Created                                              │
│ Description: 3 ACs (AC-US2-01, AC-US2-02, AC-US2-03)          │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ T1: Spec Evolved During Planning                              │
│ Living Docs: 6 ACs (AC-US2-01 through AC-US2-06)             │
│ Issue Description: Still 3 ACs ❌ (never updated!)            │
└────────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────────┐
│ T2: Task Completed, Progress Update Posted                    │
│ Progress Comment: 6 ACs (reads from living docs)              │
│ Issue Description: Still 3 ACs ❌                             │
│ Result: Description ≠ Comments (CONFUSION!)                   │
└────────────────────────────────────────────────────────────────┘
```

**Root Causes**:
1. **Two separate AC sources**: Issue description (snapshot) vs living docs (current)
2. **No sync mechanism**: Code never updates issue description after creation
3. **Timestamp mismatch**: Description = T0 snapshot, Comments = Tn current state

### Example: GitHub Issue #499

| Location | AC Count | Source |
|----------|----------|--------|
| **Issue Description** | 3 ACs | Created at T0 (early planning) |
| **Progress Comment** | 6 ACs | Read from living docs at T2 (current) |
| **Living Docs** | 6 ACs | Evolved during planning phase |

**User Confusion**: "Why does the description show 3 ACs but the comment shows 6?"

---

## Option 3 Architecture: Immutable Descriptions + Progress Comments

### Design Principle

**Issue Description = Immutable Snapshot**
**Progress Comments = Current State Updates**

```
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Issue #499: [FS-031][US-002] Task-Level Mapping         │
├─────────────────────────────────────────────────────────────────┤
│ DESCRIPTION (Immutable - Created 2025-11-12):                  │
│                                                                 │
│ **Feature**: FS-031                                             │
│ **Status**: planning → active → complete                        │
│                                                                 │
│ ## User Story                                                   │
│ As a developer or PM                                            │
│ I want to see which tasks implement which user stories          │
│ So that I can track progress and understand implementation      │
│                                                                 │
│ ## Initial Scope (As of 2025-11-12)                            │
│ - Spec frontmatter includes linked_increments mapping          │
│ - User stories map to specific tasks                           │
│ - Tasks include GitHub/JIRA/ADO issue numbers                  │
│                                                                 │
│ 📄 View full story in living docs for current status           │
│ 🔗 .specweave/docs/internal/specs/default/FS-031/us-002-*.md   │
├─────────────────────────────────────────────────────────────────┤
│ COMMENTS (Mutable - Progress Updates):                         │
│                                                                 │
│ 📊 **Progress Update from Increment 0031** - 2025-11-13        │
│ **Status**: Core Complete (4/6 AC implemented - 67%)           │
│                                                                 │
│ ## Completed Acceptance Criteria:                              │
│ ✅ AC-US2-01: Spec frontmatter includes linked_increments (P1) │
│ ✅ AC-US2-02: User stories map to tasks (P1)                   │
│ ✅ AC-US2-03: Tasks include issue numbers (P1)                 │
│ ✅ AC-US2-04: Can query implementation history (P2)            │
│                                                                 │
│ ## Remaining Work (P2-P3):                                     │
│ ⏳ AC-US2-05: Traceability report (P2)                         │
│ ⏳ AC-US2-06: AC map to task validation (P3)                   │
│                                                                 │
│ ---                                                             │
│ 📊 **Progress Update from Increment 0031** - 2025-11-14        │
│ **Status**: Complete (6/6 AC implemented - 100%)               │
│                                                                 │
│ ## ✅ All Acceptance Criteria Met!                             │
│ ✅ AC-US2-01: Spec frontmatter includes linked_increments (P1) │
│ ✅ AC-US2-02: User stories map to tasks (P1)                   │
│ ✅ AC-US2-03: Tasks include issue numbers (P1)                 │
│ ✅ AC-US2-04: Can query implementation history (P2)            │
│ ✅ AC-US2-05: Traceability report (P2) ← NEW!                  │
│ ✅ AC-US2-06: AC map to task validation (P3) ← NEW!            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. Immutable Issue Description

**Rule**: Issue description is **NEVER edited** after creation (except metadata: labels, milestone, assignees).

**Content**:
- User story (As a... I want... So that...)
- Initial scope overview (high-level, not detailed ACs)
- Link to living docs for current status
- Created date timestamp

**Benefits**:
- ✅ Preserves original context (what was requested)
- ✅ No sync conflicts (description doesn't change)
- ✅ Clear snapshot in time
- ✅ Link to living docs for current state

**Implementation**:
```typescript
// plugins/specweave-github/lib/github-spec-content-sync.ts

async function updateGitHubIssue(
  client: GitHubClientV2,
  spec: SpecContent,
  issueNumber: number,
  options: GitHubContentSyncOptions
): Promise<ContentSyncResult> {
  // ✅ UPDATE: Only metadata (labels, milestone, assignees)
  await client.updateIssue(issueNumber, {
    labels: [...spec.metadata.labels],
    milestone: spec.metadata.milestone,
    assignees: spec.metadata.assignees
  });

  // ❌ NEVER UPDATE: Issue body/description
  // Instead: Post progress comment
  const progressComment = await buildProgressComment(spec);
  await client.postComment(issueNumber, progressComment);

  return {
    success: true,
    action: 'updated-via-comment',
    externalId: issueNumber.toString(),
  };
}
```

#### 2. Progress Comments for All Updates

**Rule**: All content updates communicated via **new comments** (not edits).

**Content**:
- Current AC completion status (with checkboxes)
- Task completion status (with checkboxes)
- Progress percentage
- Timestamp
- Link to increment

**Benefits**:
- ✅ Complete audit trail (see all changes over time)
- ✅ No confusion (current state always in latest comment)
- ✅ GitHub notifications (stakeholders notified of updates)
- ✅ No sync conflicts (comments are additive)

**Comment Format**:
```markdown
📊 **Progress Update from Increment {incrementId}**

**Status**: {statusSummary} ({completed}/{total} AC - {percentage}%)

## Completed Acceptance Criteria:
{✅/⏳ icon} **AC-USX-NN**: {description} ({priority})
...

## Remaining Work (P2-P3):
{⏳ icon} **AC-USX-NN**: {description} ({priority})
...

---
🤖 Auto-synced by SpecWeave | [View increment](link) | {timestamp}
```

#### 3. Post-Task-Completion Hook Updates

**Current Behavior** (Problematic):
```bash
# plugins/specweave-github/hooks/post-task-completion.sh

# ❌ CURRENT: Edits issue body
gh issue edit "$ISSUE_NUMBER" --body "$NEW_BODY"
```

**New Behavior** (Correct):
```bash
# plugins/specweave-github/hooks/post-task-completion.sh

# ✅ NEW: Posts progress comment
PROGRESS_COMMENT=$(node dist/plugins/specweave-github/lib/progress-comment-builder.js \
  --user-story-path "$US_FILE" \
  --increment-id "$INCREMENT_ID")

gh issue comment "$ISSUE_NUMBER" --body "$PROGRESS_COMMENT"
```

**Benefits**:
- ✅ Non-destructive (preserves original description)
- ✅ Audit trail (all updates visible)
- ✅ Notifications (stakeholders get update alerts)

---

## Implementation Plan

### Phase 4 Tasks

| Task | Module | Estimate | Dependencies |
|------|--------|----------|--------------|
| **T-025** | Progress Comment Builder | 0.5 day | None |
| **T-026** | Immutable Issue Description | 1 day | T-025 |
| **T-027** | Post-Task-Completion Hook | 1 day | T-025, T-026 |
| **T-028** | Comprehensive Tests | 1 day | T-025, T-026, T-027 |

**Total Effort**: 3.5 days

### T-025: Progress Comment Builder

**Create**: `plugins/specweave-github/lib/progress-comment-builder.ts`

**API**:
```typescript
export class ProgressCommentBuilder {
  constructor(private userStoryPath: string);

  async buildProgressComment(incrementId: string): Promise<string>;
  private formatACCheckboxes(): string;
  private formatTaskCheckboxes(): string;
  private calculateProgressPercentage(): number;
}
```

**Usage**:
```typescript
const builder = new ProgressCommentBuilder(
  '.specweave/docs/internal/specs/default/FS-031/us-002-task-mapping.md'
);
const comment = await builder.buildProgressComment('0031');
await githubClient.postComment(issueNumber, comment);
```

### T-026: Immutable Issue Description Pattern

**Update**: `plugins/specweave-github/lib/github-spec-content-sync.ts`

**Changes**:
1. Add `postProgressComment(issueNumber, comment)` method
2. Modify `updateGitHubIssue()`:
   - **NEVER edit body** after creation
   - **ALWAYS post comment** for progress updates
   - Only update metadata (labels, milestone, assignees)

**API Changes**:
```typescript
// Before (Problematic):
async updateGitHubIssue(...) {
  await client.updateIssue(issueNumber, { body: newBody }); // ❌ Overwrites description
}

// After (Correct):
async updateGitHubIssue(...) {
  // Update metadata only
  await client.updateIssue(issueNumber, {
    labels: [...],
    milestone: ...,
    assignees: [...]
  });

  // Post progress comment (NOT edit body)
  const comment = await buildProgressComment(spec);
  await client.postComment(issueNumber, comment);
}
```

### T-027: Update Post-Task-Completion Hook

**Update**: `plugins/specweave-github/hooks/post-task-completion.sh`

**Changes**:
```bash
# Find affected user stories
for US_FILE in $(find .specweave/docs/internal/specs -name "us-*.md"); do
  # Extract GitHub issue number from frontmatter
  ISSUE_NUMBER=$(grep "github:" "$US_FILE" | sed 's/.*issue: //')

  if [ -n "$ISSUE_NUMBER" ]; then
    # Build progress comment
    COMMENT=$(node dist/plugins/specweave-github/lib/progress-comment-builder.js \
      --user-story "$US_FILE" \
      --increment "$INCREMENT_ID")

    # Post comment (NOT edit body)
    gh issue comment "$ISSUE_NUMBER" --body "$COMMENT" || {
      echo "⚠️  Failed to post comment to issue #$ISSUE_NUMBER (non-blocking)"
    }
  fi
done
```

### T-028: Comprehensive Tests

**Test Coverage**:
- Unit tests (90%): `progress-comment-builder.test.ts`, `immutable-description.test.ts`
- Integration tests (85%): `comment-based-sync-integration.test.ts`
- E2E tests (100%): `immutable-description.spec.ts`, `multi-us-sync.spec.ts`

**Test Scenarios**:
1. Initial issue creation (immutable description)
2. Progress comment posting
3. Multiple user stories per increment
4. Error handling (API failures)
5. Audit trail verification (10 updates = 10 comments)

---

## Benefits Analysis

### Problem Solved: AC Mismatch

| Issue | Before (Problematic) | After (Solution) |
|-------|---------------------|------------------|
| **AC count mismatch** | Description: 3 ACs, Comment: 6 ACs ❌ | Description: No detailed ACs, Comments: Current state ✅ |
| **Sync conflicts** | Description overwrites cause lost context ❌ | Description immutable, no overwrites ✅ |
| **Audit trail** | No history of changes ❌ | Complete timeline via comments ✅ |
| **Notifications** | Only on issue open/close ❌ | Every progress update notifies stakeholders ✅ |
| **User confusion** | "Why do counts differ?" ❌ | Clear: Description = original, Comments = current ✅ |

### Stakeholder Benefits

**For PMs**:
- ✅ See complete progress history
- ✅ Get notified on every update
- ✅ No confusion about AC counts

**For Developers**:
- ✅ Original scope preserved
- ✅ Current state always clear
- ✅ No manual sync needed

**For Executives**:
- ✅ Audit trail for compliance
- ✅ Clear timeline of work
- ✅ No technical details to understand

---

## Migration Strategy

### Backward Compatibility

**Existing Issues** (created before Phase 4):
- Description may have detailed ACs (old format)
- Continue working normally
- Future updates via comments (new format)
- No migration needed (graceful degradation)

**New Issues** (created after Phase 4):
- Description = high-level snapshot only
- All updates via comments
- Full immutability benefits

### Rollout Plan

1. **T-025-T-028**: Implement Phase 4 (3.5 days)
2. **Testing**: Validate with real GitHub issues
3. **Documentation**: Update public guides
4. **Release**: v0.19.0 with Phase 4
5. **Monitoring**: Track user feedback for 1 week

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **AC mismatch reports** | 0 new reports | GitHub issues tagged "bug" |
| **Audit trail completeness** | 100% of updates visible | Manual inspection |
| **User satisfaction** | 90%+ rate as "helpful" | User survey |
| **Description edits** | 0 after creation | Code review + tests |
| **Comment posting success** | 95%+ | Hook logs |

---

## Technical Details

### File Changes

| File | Type | Lines Changed | Purpose |
|------|------|---------------|---------|
| `progress-comment-builder.ts` | New | ~200 | Build progress comments |
| `github-spec-content-sync.ts` | Update | ~50 | Immutable description pattern |
| `post-task-completion.sh` | Update | ~30 | Post comments not edits |
| `*.test.ts` | New | ~400 | Comprehensive tests |

### API Calls

**Before** (Problematic):
```
POST /repos/{owner}/{repo}/issues (Create)
PATCH /repos/{owner}/{repo}/issues/{number} (Edit body) ❌
```

**After** (Correct):
```
POST /repos/{owner}/{repo}/issues (Create)
PATCH /repos/{owner}/{repo}/issues/{number} (Metadata only) ✅
POST /repos/{owner}/{repo}/issues/{number}/comments (Progress) ✅
```

### Rate Limit Impact

**Before**: 1 API call per update (issue edit)
**After**: 1-2 API calls per update (metadata update + comment post)

**Impact**: Minimal (comments are cheap, batched by hook)

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **GitHub API rate limits** | Medium | Low | Batch comments, cache results |
| **Comment spam** | Low | Medium | Debounce hook (15s), aggregate updates |
| **Missing comments** | High | Low | Retry logic, error logging |
| **User confusion (initial)** | Medium | Medium | Clear documentation, examples |

---

## Documentation Updates

### Public Guides

**Update**: `.specweave/docs/public/guides/status-sync-guide.md`

**Add Section**: "Understanding Issue Descriptions vs Progress Comments"

```markdown
## Issue Descriptions vs Progress Comments

### Issue Description (Immutable)
- Created once at issue creation
- Contains original user story and high-level scope
- Link to living docs for current status
- **Never edited** after creation

### Progress Comments (Current State)
- Posted automatically after task completion
- Show current AC completion status
- Create audit trail of all changes
- **Always reflect latest state**

### Why This Design?
This ensures no sync conflicts between issue description and current spec state.
The description preserves original intent, comments show current progress.
```

### Internal ADRs

**Create**: `.specweave/docs/internal/architecture/adr/0031-immutable-issue-descriptions.md`

**Document**:
- Problem: AC count mismatch
- Options considered (1: Manual sync, 2: Auto-sync, 3: Immutable + comments)
- Decision: Option 3
- Rationale: Audit trail, no conflicts, clear semantics

---

## Conclusion

**Phase 4 implements Option 3 architecture** to solve the AC mismatch problem by:

1. ✅ Making issue descriptions **immutable** (preserves original context)
2. ✅ Using progress **comments** for all updates (audit trail)
3. ✅ Linking to **living docs** for current state (single source of truth)

**Result**: No more confusion between issue descriptions and progress comments!

**Next Steps**: Implement T-025 through T-028 (3.5 days)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Status**: ✅ Architecture Complete, Ready for Implementation
