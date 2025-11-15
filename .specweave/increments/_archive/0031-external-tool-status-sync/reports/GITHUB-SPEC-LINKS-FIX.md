# GitHub Spec Links Fix - Use GitHub URLs Instead of Relative Paths

**Date**: 2025-11-14
**Issue**: https://github.com/anton-abyzov/specweave/issues/293
**Problem**: Spec links in GitHub issues show relative paths instead of GitHub URLs

## Problem Description

When creating GitHub issues for SpecWeave features, the spec location shows relative paths like:

```
Full specification: .specweave/docs/internal/specs/default/FS-25-11-12-multi-project-github-sync/FEATURE.md
```

**Expected**: GitHub URL
```
Full specification: https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/FS-25-11-12-multi-project-github-sync/FEATURE.md
```

### Where This Appears

1. **GitHub issue body** (when creating issues from living docs)
2. **Completion comments** (when features are marked complete)
3. **Progress update comments** (during increment execution)

## Root Cause

Multiple scripts generate spec links for GitHub issues, and they weren't consistently using GitHub URLs:

1. `scripts/create-feature-github-issue.ts` - Creates GitHub issues from FEATURE.md files
2. `scripts/bulk-spec-sync.ts` - Syncs all features to GitHub
3. Completion comment templates - Posted when features are complete

## Solution

### 1. Created Shared Utility (`src/utils/github-url.ts`)

A centralized utility for converting local paths to GitHub URLs:

```typescript
export function toGitHubUrl(localPath: string, options: GitHubUrlOptions): string {
  const { owner, repo, branch = 'develop' } = options;
  let cleanPath = localPath.replace(/^\.\//, '');

  // Ensure .specweave prefix exists
  if (!cleanPath.startsWith('.specweave')) {
    cleanPath = `.specweave/${cleanPath}`;
  }

  return `https://github.com/${owner}/${repo}/blob/${branch}/${cleanPath}`;
}
```

**Key Features**:
- Handles both file paths (`blob`) and directory paths (`tree`)
- Preserves `.specweave` folder name (doesn't strip the dot)
- Auto-detects GitHub repo from git remote
- Configurable branch (defaults to `develop`)

### 2. Updated `create-feature-github-issue.ts`

**Before**:
```typescript
sections.push(`**Full spec**: [FEATURE.md](${featureMdGithubUrl})\n`);
```

**After**:
```typescript
// Spec Location section with GitHub URL
const featureMdPath = `.specweave/docs/internal/specs/default/${featureFolder}/FEATURE.md`;
const featureMdGithubUrl = toGitHubUrl(featureMdPath);
sections.push('## Spec Location\n');
sections.push(`**Full specification**: [${featureMdPath}](${featureMdGithubUrl})\n`);
```

**Changes**:
- Added dedicated "Spec Location" section
- Shows both the path (for reference) and clickable GitHub link
- Matches the format users expect (from the screenshot)

### 3. Updated `bulk-spec-sync.ts`

This script already used GitHub URLs correctly:

```typescript
// Line 432-433
sections.push(`- **Spec**: [\`FEATURE.md\`](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/${feature.folder}/FEATURE.md)`);
sections.push(`- **User Stories**: [View all](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/docs/internal/specs/default/${feature.folder})`);
```

**No changes needed** - already correct!

### 4. Verified `github-issue-updater.ts`

This file already uses GitHub URLs for all documentation links:

```typescript
// Lines 371, 382, 393
const url = `https://github.com/${owner}/${repo}/blob/develop/${spec}`;
```

**No changes needed** - already correct!

## Testing Plan

### 1. Test Issue Creation

```bash
# Run the script with a feature folder
npx tsx scripts/create-feature-github-issue.ts FS-25-11-14-test-spec-links

# Verify the issue body contains:
# - "## Spec Location" section
# - Full GitHub URL (not relative path)
```

**Expected Output**:
```markdown
## Spec Location

**Full specification**: [.specweave/docs/internal/specs/default/FS-25-11-14-test-spec-links/FEATURE.md](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/specs/default/FS-25-11-14-test-spec-links/FEATURE.md)
```

### 2. Test Completion Comments

When closing a feature (via `/specweave-github:close-issue` or PM agent), verify that any comments posted contain GitHub URLs, not relative paths.

### 3. Test Multi-Project Setup

```bash
# Test with backend project
npx tsx scripts/create-feature-github-issue.ts FS-BE-001-api-v2

# Test with frontend project
npx tsx scripts/create-feature-github-issue.ts FS-FE-001-dashboard

# Verify both use correct GitHub URLs
```

## Files Changed

1. ✅ `src/utils/github-url.ts` - **NEW**: Shared utility for GitHub URL conversion
2. ✅ `scripts/create-feature-github-issue.ts` - Updated to use "Spec Location" section with GitHub URLs
3. ⏭️  `scripts/bulk-spec-sync.ts` - Already correct, no changes needed
4. ⏭️  `plugins/specweave-github/lib/github-issue-updater.ts` - Already correct, no changes needed

## Migration Guide

For existing GitHub issues with relative paths:

### Option 1: Automated Fix (Recommended)

Create a script to update all existing issues:

```bash
# List all issues with "specweave" label
gh issue list --label specweave --json number,body --limit 1000 > issues.json

# For each issue, detect relative paths and update with GitHub URLs
node scripts/fix-github-issue-links.js issues.json
```

### Option 2: Manual Fix

1. Identify affected issues (search for issues with "Full specification: .specweave")
2. Edit each issue body
3. Replace relative path with GitHub URL format

## Next Steps

1. ✅ Create utility function (`src/utils/github-url.ts`)
2. ✅ Update `create-feature-github-issue.ts`
3. ⏳ Build and test the changes
4. ⏳ Run script on a test feature
5. ⏳ Verify GitHub issue has correct URL
6. ⏳ (Optional) Create script to fix existing issues

## Key Takeaways

**Golden Rule**: When posting content to GitHub (issues, comments, descriptions), ALWAYS use absolute GitHub URLs, not relative paths.

**Why?**
- GitHub renders Markdown, not local filesystem paths
- Users expect clickable links
- Better UX for external collaborators
- Consistent with GitHub best practices

**Pattern**:
```typescript
// ❌ WRONG - Relative path
const link = '.specweave/docs/internal/specs/default/FS-001/FEATURE.md';

// ✅ CORRECT - GitHub URL
const link = 'https://github.com/owner/repo/blob/branch/.specweave/docs/internal/specs/default/FS-001/FEATURE.md';
```

---

**Status**: ✅ Fixed in code, ready for testing
**Priority**: P1 (User-facing issue, affects GitHub integration UX)
**Complexity**: Low (utility function + 2 script updates)
