# ULTRATHINK: GitHub Issue Format Bug - Root Cause Analysis

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Issue**: GitHub issue #611 created with WRONG format `[Increment 0043]` instead of living docs format
**Severity**: CRITICAL - Violates increment 0037 architecture

---

## Executive Summary

**PROBLEM**: GitHub issue #611 was created with OLD format `[Increment 0043] Fix Sync Infrastructure...` instead of NEW living docs format which should be `[FS-043][US-XXX] Title`.

**ROOT CAUSE**: There are TWO code paths for creating GitHub issues:
1. ✅ **CORRECT PATH**: `GitHubFeatureSync` → `UserStoryIssueBuilder` → Creates `[FS-XXX][US-XXX]` format
2. ❌ **WRONG PATH**: Direct increment creation (bypasses living docs) → Creates `[Increment XXXX]` format

**IMPACT**:
- Breaks data flow architecture from increment 0037 (increment → living docs → GitHub)
- Violates "living docs as source of truth" principle
- Tests pass but validate WRONG format in some cases
- Confuses stakeholders who expect living docs format

---

## Architecture Violation

### Increment 0037: Correct Data Flow (3-Layer Architecture)

```
Layer 3: INCREMENT (Source of Truth)
    .specweave/increments/0043-spec-md-desync-fix/spec.md
    ↓
Layer 2: LIVING DOCS USER STORIES
    .specweave/docs/internal/specs/specweave/FS-043/us-001-status-line.md
    .specweave/docs/internal/specs/specweave/FS-043/us-002-spec-sync.md
    ...
    ↓
Layer 1: GITHUB ISSUES
    Issue #XXX: [FS-043][US-001] Status Line Shows Correct Active Increment
    Issue #YYY: [FS-043][US-002] spec.md and metadata.json Stay in Sync
    ...
```

**KEY PRINCIPLE**: GitHub issues are created FROM living docs user stories, NOT directly from increment spec.md!

### What Actually Happened with Issue #611

```
❌ WRONG FLOW (What happened):

INCREMENT 0043
    ↓ (BYPASSED living docs sync!)
    ↓
GITHUB ISSUE #611
    Title: [Increment 0043] Fix Sync Infrastructure... ← WRONG FORMAT!
```

**Why This is Wrong**:
1. Bypassed living docs layer (violated 3-layer architecture)
2. Used increment-centric format instead of feature/user-story format
3. Created ONE issue for entire increment (should be ONE issue per user story)
4. Stakeholders can't track individual user stories in GitHub

---

## Code Path Analysis

### Path 1: CORRECT Format (Living Docs Flow)

**File**: `plugins/specweave-github/lib/user-story-issue-builder.ts`
**Line**: 94

```typescript
// ✅ CORRECT FORMAT
const title = `[${this.featureId}][${frontmatter.id}] ${frontmatter.title}`;
// Example: [FS-043][US-001] Status Line Shows Correct Active Increment
```

**Flow**:
1. Living docs sync creates user story files in `.specweave/docs/internal/specs/{project}/FS-XXX/`
2. `GitHubFeatureSync.syncFeatureToGitHub(featureId)` finds all `us-*.md` files
3. For each user story → `UserStoryIssueBuilder.buildIssueBody()`
4. Generates GitHub issue with `[FS-XXX][US-XXX] Title` format
5. Creates ONE issue per user story (granular tracking)

**Tests**:
- `tests/unit/user-story-issue-builder.test.ts:74` - ✅ Validates `[FS-031][US-001]` format
- `tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts:110` - ✅ Validates `[FS-999][US-001]` format

**Status**: ✅ CORRECT - This code path is working as designed

---

### Path 2: WRONG Format (Direct Increment Creation)

**Files**:
- `plugins/specweave-github/agents/github-manager/AGENT.md:148`
- `plugins/specweave-github/agents/github-manager/AGENT.md:246`
- `plugins/specweave-github/agents/github-manager/AGENT.md:390`

**Template Format** (Line 246):
```markdown
# [Increment {{increment_id}}] {{title}}
```

**Example Command** (Line 148):
```bash
gh issue create \
  --title "[Increment 0004] Plugin Architecture" \
  --body "$(cat issue-body.md)" \
  --label "specweave,increment,P1"
```

**When This Path is Used**:
- When GitHub Manager agent is invoked directly without living docs sync
- When user manually creates GitHub issue for an increment
- When increment 0043 was created (as evidenced by issue #611)

**Issue #611 Evidence**:
```json
{
  "title": "[Increment 0043] Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools",
  "createdAt": "2025-11-18T08:11:14Z",
  "author": "anton-abyzov",
  "labels": ["bug"]
}
```

**Status**: ❌ WRONG - This code path violates increment 0037 architecture

---

## Test Analysis

### Tests that Validate CORRECT Format ✅

1. **`tests/unit/user-story-issue-builder.test.ts`**
   - **Line 74**: `expect(result.title).toBe('[FS-031][US-001] Test User Story');`
   - **Status**: ✅ CORRECT - Validates living docs format

2. **`tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts`**
   - **Line 110**: `title: '[FS-999][US-001] Existing Issue Test',`
   - **Status**: ✅ CORRECT - Validates living docs format

### Tests that Validate WRONG Format ❌

**None found!**

There are NO tests that explicitly validate the `[Increment XXXX]` format, which is GOOD. This means:
- Tests do NOT enforce the wrong format
- But tests also do NOT prevent the wrong format from being used
- The GitHub Manager agent template is NOT tested

### Missing Tests 🚨

**CRITICAL GAP**: No tests validate that GitHub issues are created via the living docs flow!

**What's Missing**:
1. E2E test: Create increment → Sync to living docs → Create GitHub issues → Validate format
2. Integration test: GitHub Manager agent should NOT allow direct increment issue creation
3. Validation test: Detect and reject `[Increment XXXX]` format in issue titles

---

## Files That Need Fixing

### 1. GitHub Manager Agent Template ❌

**File**: `plugins/specweave-github/agents/github-manager/AGENT.md`
**Lines to Fix**: 148, 246, 390

**Current (WRONG)**:
```markdown
# [Increment {{increment_id}}] {{title}}
```

**Should Be**:
```markdown
🚨 DEPRECATED FORMAT - DO NOT USE!

To create GitHub issues for SpecWeave increments:
1. Run `/specweave:sync-docs update` to create living docs user stories
2. Run `/specweave-github:sync` to create GitHub issues from user stories
3. Format will be: [FS-XXX][US-XXX] Title (one issue per user story)

NEVER create GitHub issues directly from increments!
```

### 2. Missing Validation (NEW CODE NEEDED)

**File**: `plugins/specweave-github/lib/github-client-v2.ts` (or new validator)
**Purpose**: Reject `[Increment XXXX]` format before creating issue

**Suggested Code**:
```typescript
/**
 * Validate GitHub issue title format
 *
 * CORRECT: [FS-043][US-001] Title
 * WRONG: [Increment 0043] Title
 */
function validateIssueTitle(title: string): void {
  const incrementPattern = /^\[Increment \d+\]/;
  if (incrementPattern.test(title)) {
    throw new Error(
      `Invalid GitHub issue title format: "${title}"\n` +
      `\n` +
      `❌ WRONG: [Increment XXXX] format is deprecated!\n` +
      `✅ CORRECT: Use [FS-XXX][US-XXX] format from living docs\n` +
      `\n` +
      `How to fix:\n` +
      `1. Run: /specweave:sync-docs update\n` +
      `2. Run: /specweave-github:sync\n` +
      `\n` +
      `This creates GitHub issues from living docs user stories.`
    );
  }

  const correctPattern = /^\[FS-\d+\]\[US-\d+\]/;
  if (!correctPattern.test(title)) {
    throw new Error(
      `Invalid GitHub issue title format: "${title}"\n` +
      `\n` +
      `Expected format: [FS-XXX][US-XXX] Title\n` +
      `Example: [FS-043][US-001] Status Line Shows Correct Active Increment`
    );
  }
}
```

### 3. Missing E2E Test (NEW TEST NEEDED)

**File**: `tests/e2e/github-issue-format-validation.test.ts` (NEW)
**Purpose**: Validate complete flow from increment → living docs → GitHub

**Test Outline**:
```typescript
describe('GitHub Issue Format - E2E Validation', () => {
  it('should create GitHub issues with [FS-XXX][US-XXX] format from living docs', async () => {
    // 1. Create increment 0999
    // 2. Sync to living docs (creates FS-999/us-001.md, us-002.md, etc.)
    // 3. Sync to GitHub
    // 4. Verify issue titles: [FS-999][US-001], [FS-999][US-002], etc.
  });

  it('should reject [Increment XXXX] format', async () => {
    // Attempt to create issue with wrong format
    // Expect error with helpful message
  });

  it('should create one GitHub issue per user story (not one per increment)', async () => {
    // Increment with 5 user stories → 5 GitHub issues
  });
});
```

---

## How Issue #611 Was Created

**Timeline**:
1. **2025-11-18 05:06:41Z**: Increment 0043 created (metadata.json timestamp)
2. **2025-11-18 08:11:14Z**: GitHub issue #611 created (GitHub timestamp)
3. **Method**: GitHub Manager agent invoked directly (bypassed living docs sync)
4. **Format**: `[Increment 0043]` (old format)

**Evidence**:
- Report file: `.specweave/increments/0043-spec-md-desync-fix/reports/GITHUB-ISSUE-CREATED-2025-11-18.md:22`
  - Line 22: `**Title**: [Increment 0043] Fix Sync Infrastructure...`
- GitHub issue #611:
  - Title: `[Increment 0043] Fix Sync Infrastructure: spec.md Desync + Living Docs → External Tools`
  - Created by: anton-abyzov
  - Labels: bug

**Why This Happened**:
- User (or agent) invoked GitHub Manager agent directly
- Did NOT run `/specweave:sync-docs update` first
- Did NOT run `/specweave-github:sync` (which uses living docs flow)
- Bypassed 3-layer architecture

---

## Correct Workflow (How It Should Work)

### Step-by-Step Fix for Issue #611

**Current State** (WRONG):
```
❌ Issue #611: [Increment 0043] Fix Sync Infrastructure...
   (Created directly from increment, bypassed living docs)
```

**Correct State** (Should Be):
```
✅ Issue #XXX: [FS-043][US-001] Status Line Shows Correct Active Increment
✅ Issue #YYY: [FS-043][US-002] spec.md and metadata.json Stay in Sync
✅ Issue #ZZZ: [FS-043][US-003] Hooks Read Correct Increment Status
✅ Issue #AAA: [FS-043][US-004] Existing Desyncs Detected and Repaired
✅ Issue #BBB: [FS-043][US-005] Living Docs Sync Triggers External Tool Updates
```

**How to Fix**:
1. Close issue #611 (wrong format, wrong approach)
2. Run `/specweave:sync-docs update 0043` → Creates living docs user stories in `.specweave/docs/internal/specs/specweave/FS-043/`
3. Run `/specweave-github:sync FS-043` → Creates 5 GitHub issues (one per user story)
4. Result: 5 issues with correct `[FS-043][US-XXX]` format

---

## Migration Plan

### Phase 1: Immediate Fixes (Week 1)

1. **Update GitHub Manager Agent Template**
   - File: `plugins/specweave-github/agents/github-manager/AGENT.md`
   - Replace `[Increment {{increment_id}}]` template with deprecation warning
   - Add instructions to use living docs flow

2. **Add Title Validation**
   - File: `plugins/specweave-github/lib/github-client-v2.ts` (or new validator)
   - Add `validateIssueTitle()` function
   - Reject `[Increment XXXX]` format
   - Enforce `[FS-XXX][US-XXX]` format

3. **Fix Issue #611**
   - Close issue #611 with explanation
   - Run living docs sync for increment 0043
   - Create proper GitHub issues for FS-043 user stories

### Phase 2: Test Coverage (Week 2)

4. **Add E2E Test**
   - File: `tests/e2e/github-issue-format-validation.test.ts` (NEW)
   - Test complete flow: increment → living docs → GitHub
   - Validate `[FS-XXX][US-XXX]` format
   - Reject `[Increment XXXX]` format

5. **Add Integration Test**
   - Test GitHub Manager agent behavior
   - Ensure it guides users to living docs flow
   - Prevent direct increment issue creation

### Phase 3: Documentation (Week 3)

6. **Update CLAUDE.md**
   - Document correct GitHub issue creation workflow
   - Explain 3-layer architecture
   - Add troubleshooting for wrong format

7. **Update Contributor Guide**
   - File: `.github/CONTRIBUTING.md`
   - Add section on GitHub issue format
   - Link to increment 0037 architecture

---

## Summary

### Root Cause
**TWO code paths for creating GitHub issues**:
1. ✅ Living docs flow (`GitHubFeatureSync` + `UserStoryIssueBuilder`) - CORRECT `[FS-XXX][US-XXX]`
2. ❌ Direct increment creation (GitHub Manager agent) - WRONG `[Increment XXXX]`

### Files to Fix

| File | Issue | Fix |
|------|-------|-----|
| `plugins/specweave-github/agents/github-manager/AGENT.md` | Uses `[Increment XXXX]` template | Deprecate template, add living docs flow instructions |
| `plugins/specweave-github/lib/github-client-v2.ts` | No title validation | Add `validateIssueTitle()` to reject wrong format |
| `tests/e2e/github-issue-format-validation.test.ts` (NEW) | Missing E2E test | Add test for complete flow |
| Issue #611 | Wrong format | Close + recreate via living docs flow |

### Test Status
- ✅ Tests for `[FS-XXX][US-XXX]` format exist and pass
- ❌ No tests for `[Increment XXXX]` format (good - not enforced)
- 🚨 Missing E2E test for living docs → GitHub flow
- 🚨 Missing validation to prevent wrong format

### Impact
- **Architectural**: Violates increment 0037 3-layer architecture
- **User Experience**: Confusing for stakeholders (wrong format)
- **Data Integrity**: One issue per increment vs one issue per user story
- **Tracking**: Granular user story tracking lost

### Next Steps
1. Close issue #611
2. Fix GitHub Manager agent template (deprecate old format)
3. Add title validation (reject `[Increment XXXX]`)
4. Run living docs sync for increment 0043
5. Create proper GitHub issues via `/specweave-github:sync FS-043`

---

**Analysis Date**: 2025-11-18
**Analyst**: Claude (Sonnet 4.5)
**Status**: COMPLETE - Ready for implementation
**Severity**: CRITICAL - Violates core architecture principle
**Estimated Fix Time**: 4-6 hours (code) + 2-3 hours (tests) + 1-2 hours (docs)
**Total**: 7-11 hours
