---
name: github-issue-standard
description: Standard format for ALL GitHub issues created by SpecWeave. Ensures checkable acceptance criteria, task connections, working links, and consistent metadata. Activates for create GitHub issue, sync to GitHub, format GitHub issue, standardize issue.
---

# GitHub Issue Standard - Universal Format

**CRITICAL**: This is the **MANDATORY** format for ALL GitHub issues created by SpecWeave, whether for:
- User stories (individual us-*.md files)
- Epics/Features (FS-* folders)
- Increments (0001-* folders)
- Specs (spec-*.md files)

## The Standard Format

### ✅ Required Elements

Every GitHub issue MUST include:

1. **Checkable Acceptance Criteria**
   - Use GitHub task checkbox format: `- [x]` or `- [ ]`
   - Include AC ID, description, priority, and testable flag
   - Example: `- [x] **AC-US4-01**: Description (P1, testable)`

2. **Checkable Tasks**
   - Link to increment tasks.md with GitHub URLs (not relative paths)
   - Use GitHub task checkbox format
   - Example: `- [x] [T-008: Title](https://github.com/owner/repo/tree/develop/.specweave/increments/0031/tasks.md#t-008-title)`

3. **Working GitHub URLs**
   - Feature links: `https://github.com/owner/repo/tree/develop/.specweave/docs/internal/specs/_features/FS-031`
   - User story links: `https://github.com/owner/repo/tree/develop/.specweave/docs/internal/specs/default/FS-031/us-004-*.md`
   - Task links: `https://github.com/owner/repo/tree/develop/.specweave/increments/0031/tasks.md#task-anchor`
   - Increment links: `https://github.com/owner/repo/tree/develop/.specweave/increments/0031`

4. **Extracted Priority**
   - Extract from ACs (highest priority wins: P1 > P2 > P3)
   - Show ONLY if priority exists (don't show "undefined")
   - Example: `**Priority**: P1`

5. **NO Project Field**
   - Don't include `**Project**: ...` - not needed for GitHub issues
   - Project is determined by repository context

### ❌ Never Use

- ❌ Relative paths (`../../_features/FS-031`)
- ❌ Undefined values (`**Priority**: undefined`)
- ❌ Project field in metadata
- ❌ Plain bullet points for ACs (must be checkboxes)
- ❌ Plain bullet points for tasks (must be checkboxes with links)

## Implementation

### UserStoryContentBuilder (✅ REFERENCE IMPLEMENTATION)

**File**: `plugins/specweave-github/lib/user-story-content-builder.ts`

This is the **gold standard** implementation. All other builders must follow this pattern.

**Key features**:
```typescript
// 1. Accept GitHub repo parameter
async buildIssueBody(githubRepo?: string): Promise<string>

// 2. Auto-detect repo from git remote
private async detectGitHubRepo(): Promise<string | null>

// 3. Extract priority from ACs
private extractPriorityFromACs(criteria: AcceptanceCriterion[]): string | null

// 4. Generate GitHub URLs (not relative)
const featureUrl = `https://github.com/${repo}/tree/develop/.specweave/docs/internal/specs/_features/${featureId}`;

// 5. Convert task links to GitHub URLs
if (repo && taskLink.startsWith('../../')) {
  const relativePath = taskLink.replace(/^\.\.\/\.\.\//, '.specweave/');
  taskLink = `https://github.com/${repo}/tree/develop/${relativePath}`;
}
```

### Template

```markdown
**Feature**: [FS-031](https://github.com/owner/repo/tree/develop/.specweave/docs/internal/specs/_features/FS-031)
**Status**: complete
**Priority**: P1

---

## User Story

**As a** user
**I want** feature
**So that** benefit

📄 View full story: [`us-004-name.md`](https://github.com/owner/repo/tree/develop/.specweave/docs/internal/specs/default/FS-031/us-004-name.md)

---

## Acceptance Criteria

Progress: 4/6 criteria met (67%)

- [x] **AC-US4-01**: Description (P1, testable)
- [x] **AC-US4-02**: Description (P1, testable)
- [ ] **AC-US4-03**: Description (P2, testable)
- [ ] **AC-US4-04**: Description (P2, testable)

---

## Implementation Tasks

Progress: 3/6 tasks complete (50%)

**Increment**: [0031-name](https://github.com/owner/repo/tree/develop/.specweave/increments/0031-name)

- [x] [T-008: Title](https://github.com/owner/repo/tree/develop/.specweave/increments/0031/tasks.md#t-008-title)
- [x] [T-009: Title](https://github.com/owner/repo/tree/develop/.specweave/increments/0031/tasks.md#t-009-title)
- [ ] [T-010: Title](https://github.com/owner/repo/tree/develop/.specweave/increments/0031/tasks.md#t-010-title)

---

🤖 Auto-synced by SpecWeave
```

## Migration Guide

### Update Existing Builders

All content builders must be updated to follow this standard:

1. **EpicContentBuilder** (`plugins/specweave-github/lib/epic-content-builder.ts`)
   - ✅ TODO: Add `githubRepo` parameter
   - ✅ TODO: Use GitHub URLs instead of relative paths
   - ✅ TODO: Extract priority from ACs
   - ✅ TODO: Remove Project field

2. **SpecContentSync** (`src/core/spec-content-sync.ts`)
   - ✅ TODO: Update `buildExternalDescription` to use GitHub URLs
   - ✅ TODO: Pass repo parameter to builders

3. **Increment Sync** (bash scripts and TypeScript)
   - ✅ TODO: Use UserStoryContentBuilder as reference
   - ✅ TODO: Ensure all issue creation uses this format

### Update Commands

All commands that create GitHub issues must use this standard:

- `/specweave-github:create-issue` - Use standard format
- `/specweave-github:sync` - Use standard format
- `/specweave-github:sync-epic` - Use standard format
- `/specweave-github:sync-spec` - Use standard format
- `/specweave-github:update-user-story` - Already uses standard ✅

## Validation Checklist

When creating/updating a GitHub issue, verify:

- [ ] Feature link is clickable GitHub URL (not `../../`)
- [ ] User story link is clickable GitHub URL
- [ ] All task links are clickable GitHub URLs
- [ ] ACs are checkable (GitHub checkboxes work in UI)
- [ ] Tasks are checkable (GitHub checkboxes work in UI)
- [ ] Priority shows actual value (P1/P2/P3) or is omitted
- [ ] No "Project: undefined" field
- [ ] Progress percentages are correct
- [ ] Increment link is clickable GitHub URL

## Benefits

- ✅ **Links work**: No more broken relative paths
- ✅ **Checkable**: ACs and tasks can be checked/unchecked in GitHub UI
- ✅ **Clean metadata**: No undefined values cluttering the issue
- ✅ **Consistent**: Same format across all issue types
- ✅ **Traceable**: Direct links to source files in repository

## When to Use

**Always!** This is the ONLY acceptable format for GitHub issues created by SpecWeave.

No exceptions. No shortcuts. Every issue follows this standard.

## Related Files

- **Reference Implementation**: `plugins/specweave-github/lib/user-story-content-builder.ts`
- **Test Script**: `.specweave/increments/0032-*/scripts/update-us-004-fixed.mjs`
- **Example Issue**: https://github.com/anton-abyzov/specweave/issues/501
