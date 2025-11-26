---
increment: 0068-fix-multi-repo-import-from
---

# 0068 - Fix Multi-Repo ImportFrom Missing Items

**Status**: completed
**Type**: bug
**Priority**: high

## Problem Statement

When using SpecWeave with a multi-repo umbrella setup (4 repositories), the `/specweave:import-external` command fails to import GitHub issues from all configured repositories. Issues are either:
1. Not imported at all from some repos
2. Missing from the specs folder structure

### Observed Behavior

- Parent repo `sw-meeting-cost`: 1 issue - NOT synced to specs/
- BE repo `sw-meeting-cost-be`: 2 issues - only 1 synced
- FE repo `sw-meeting-cost-fe`: 2 issues - missing user stories in FS-002E
- Shared repo: Same issue - missing synced items

### Expected Behavior

All GitHub issues from all configured sync profiles should be imported into their respective project folders:
- `specs/sw-meeting-cost/` (parent repo issues)
- `specs/sw-meeting-cost-be/` (BE repo issues)
- `specs/sw-meeting-cost-fe/` (FE repo issues)
- `specs/sw-meeting-cost-shared/` (shared repo issues)

## Root Cause Analysis

The bug is in `ImportCoordinator.importFrom()` method at `src/importers/import-coordinator.ts:493-501`:

```typescript
async importFrom(platform: 'github' | 'jira' | 'ado'): Promise<ImportResult> {
  const importer = this.importers.get(platform);  // ❌ Only checks single-repo!

  if (!importer) {
    throw new Error(`${platform} importer not configured`);
  }

  return this.importFromPlatform(platform, importer);
}
```

**The Problem:**
1. When multi-repo is configured (lines 166-183), single-repo importer is NOT created
2. Multi-repo importers are stored in `this.githubRepoImporters` (not `this.importers`)
3. `getConfiguredPlatforms()` correctly returns `['github']` for multi-repo
4. But `importFrom('github')` only checks `this.importers.get('github')` which is `undefined`
5. Result: "github importer not configured" error OR incomplete import

## User Stories

### US-001: Fix importFrom for Multi-Repo GitHub

**As a** developer with a multi-repo umbrella setup
**I want** the import-external command to fetch issues from ALL configured GitHub repos
**So that** all external work items are synced to their correct project folders

#### Acceptance Criteria

- [x] **AC-US1-01**: `importFrom('github')` handles multi-repo when `githubRepoImporters.size > 0`
- [x] **AC-US1-02**: Items from each repo have `sourceRepo` field set correctly
- [x] **AC-US1-03**: Aggregated results include all items from all repos
- [x] **AC-US1-04**: Errors from individual repos are aggregated properly
- [x] **AC-US1-05**: Unit tests cover multi-repo import scenario

## Technical Design

### Solution

Update `importFrom()` to check for multi-repo mode before falling back to single-repo:

```typescript
async importFrom(platform: 'github' | 'jira' | 'ado'): Promise<ImportResult> {
  // Handle multi-repo GitHub case
  if (platform === 'github' && this.githubRepoImporters.size > 0) {
    const results: ImportResult[] = [];
    for (const [key, importer] of this.githubRepoImporters.entries()) {
      const sourceRepo = key.replace('github:', '');
      const result = await this.importFromGitHubRepo(importer, sourceRepo);
      results.push(result);
    }

    // Aggregate into single result
    return {
      count: results.reduce((sum, r) => sum + r.count, 0),
      items: results.flatMap(r => r.items),
      errors: results.flatMap(r => r.errors),
      platform: 'github',
    };
  }

  // Single-repo fallback
  const importer = this.importers.get(platform);
  if (!importer) {
    throw new Error(`${platform} importer not configured`);
  }
  return this.importFromPlatform(platform, importer);
}
```

### Files to Modify

1. `src/importers/import-coordinator.ts` - Fix `importFrom()` method

### Testing

1. Unit test: Multi-repo import with 4 repos
2. Unit test: Single-repo import still works
3. Integration test: End-to-end import with umbrella setup
