# Duplicate GitHub Issues - Root Cause Analysis

**Date**: 2025-11-13
**Severity**: CRITICAL
**Impact**: 123 duplicate closed issues in repository (should be ~10-15 unique features)
**Reporter**: User

---

## Problem Statement

**Observed**: 123 closed GitHub issues when there are only ~10-15 unique features.

**Expected**: One GitHub issue per spec/feature (~10-15 total).

**Evidence**: Screenshot shows duplicates like:
- [FS-25-11-12] Multi-Project GitHub Sync #251
- [FS-25-11-12] External Tool Status Synchronization #250
- [FS-25-11-11] Multi-Repository Setup UX Improvements #249
- (and 120+ more duplicates)

---

## Root Cause Analysis

### **Primary Cause**: No Duplicate Detection in `GitHubEpicSync`

**File**: `plugins/specweave-github/lib/github-epic-sync.ts` (lines 138-176)

**The Bug**:

```typescript
for (const increment of epicData.increments) {
  const existingIssue = increment.external.github;  // ← Reads from Epic README frontmatter

  if (!existingIssue) {
    // Create new issue
    const issueNumber = await this.createIssue(...);  // ← NO CHECK if issue already exists in GitHub!
    issuesCreated++;
  } else {
    // Update existing issue
    await this.updateIssue(...);
    issuesUpdated++;
  }
}
```

**What's Wrong**:
1. **Only checks frontmatter**: Relies 100% on `increment.external.github` field in Epic README.md
2. **No GitHub API check**: Never queries GitHub to see if an issue with the same title already exists
3. **Fragile metadata**: If Epic README frontmatter gets reset/corrupted → all issues recreated
4. **No idempotency**: Running sync twice creates duplicates if frontmatter is lost

### **Trigger Scenario**:

```bash
# User workflow that creates duplicates:

1. Complete increment 0031-external-tool-status-sync
2. Living docs sync runs automatically → creates FS-031 folder with README.md
3. User runs: /specweave-github:sync-epic FS-031
   → Creates GitHub issue #250 and updates frontmatter
4. Later: User edits Epic README.md OR code regenerates it
   → Frontmatter `external.github: 250` gets lost
5. User runs: /specweave-github:sync-epic FS-031 again
   → Frontmatter shows null → creates DUPLICATE issue #255
6. Repeat 24 times → 120 duplicates!
```

### **Secondary Causes**:

**1. Living Docs Sync May Overwrite Frontmatter** (speculative)

**File**: `src/core/living-docs/spec-distributor.ts` (line 598)

```typescript
private async writeEpicFile(epic: EpicFile, epicMapping: EpicMapping): Promise<string> {
  const featurePath = path.join(epicMapping.featurePath, 'FEATURE.md');

  const content = this.formatEpicFile(epic);  // ← Generates content from scratch

  await fs.writeFile(featurePath, content, 'utf-8');  // ← OVERWRITES file!
}
```

**Problem**: If living docs sync runs AFTER GitHub sync, it may overwrite the Epic README with fresh content that doesn't have the GitHub issue numbers.

**2. No Post-Sync Validation**

**Missing**: No validation step that checks:
- ✗ Did we create duplicates?
- ✗ Does the Epic frontmatter have correct GitHub IDs?
- ✗ Are there multiple issues with the same title?

**3. No Cleanup Mechanism**

**Missing**: No way to:
- ✗ Detect existing duplicates
- ✗ Close duplicate issues
- ✗ Merge duplicate issues
- ✗ Clean up broken metadata

---

## Why This Slipped Through

**No E2E tests for duplicate detection**:
- ✓ Tests exist for creating issues
- ✓ Tests exist for updating issues
- ✗ NO tests for "what if we run sync twice?"
- ✗ NO tests for "what if frontmatter is corrupted?"

**No integration tests**:
- `tests/integration/github-sync/` exists but may not cover this scenario

**Assumed happy path**:
- Design assumed frontmatter would never be lost
- Design assumed sync would only run once per Epic
- Design assumed no concurrent updates to Epic README

---

## Impact Assessment

**User Impact**:
- ❌ **CRITICAL**: 123 duplicate issues pollute repository
- ❌ **HIGH**: Users can't find correct issue (too many results)
- ❌ **HIGH**: Stakeholders confused by duplicate tracking
- ❌ **MEDIUM**: GitHub search/filters broken (duplicates everywhere)

**Data Integrity**:
- ❌ **HIGH**: Metadata in Epic README unreliable
- ❌ **MEDIUM**: Uncertain which issue is the "real" one
- ❌ **LOW**: No data loss (issues still exist)

**System Health**:
- ⚠️  **MEDIUM**: GitHub API rate limits impacted (123 extra issues)
- ⚠️  **LOW**: Repository bloat (123 extra issues)

---

## Solution Architecture

### Phase 1: Immediate Fix (Duplicate Detection)

**Add GitHub API Check Before Creating Issue**:

```typescript
// NEW: Check if issue already exists in GitHub
private async findExistingIssue(
  epicId: string,
  incrementId: string
): Promise<number | null> {
  const titlePattern = `[${epicId}]`;
  const incrementPattern = incrementId;

  const result = await execFileNoThrow('gh', [
    'issue', 'list',
    '--search', `"${titlePattern}" "${incrementPattern}" in:title`,
    '--json', 'number,title',
    '--limit', '1'
  ]);

  if (result.exitCode === 0 && result.stdout) {
    const issues = JSON.parse(result.stdout);
    if (issues.length > 0) {
      return issues[0].number;  // Found existing issue!
    }
  }

  return null;  // No existing issue
}

// UPDATED: Use GitHub check as source of truth
if (!existingIssue) {
  // Check GitHub FIRST before creating
  const githubIssue = await this.findExistingIssue(epicId, increment.id);

  if (githubIssue) {
    console.log(`   ♻️  Found existing Issue #${githubIssue} for ${increment.id}`);
    // Update frontmatter with found issue
    await this.updateIncrementExternalLink(..., githubIssue);
    issuesUpdated++;
  } else {
    // Truly new issue
    const issueNumber = await this.createIssue(...);
    issuesCreated++;
  }
}
```

**Benefits**:
- ✅ **Idempotent**: Running sync multiple times won't create duplicates
- ✅ **Self-healing**: Finds and re-links lost metadata
- ✅ **Reliable**: GitHub API is source of truth, not fragile frontmatter

### Phase 2: Post-Sync Validation

**Add validation step after sync completes**:

```typescript
async syncEpicToGitHub(epicId: string): Promise<SyncResult> {
  // ... existing sync logic ...

  // NEW: Validate no duplicates created
  const validation = await this.validateSync(epicId, issuesCreated, issuesUpdated);

  if (validation.duplicatesFound > 0) {
    console.warn(`   ⚠️  WARNING: ${validation.duplicatesFound} potential duplicates detected!`);
    console.warn(`   Run /specweave-github:cleanup-duplicates ${epicId} to fix`);
  }

  return { ...result, validation };
}

private async validateSync(epicId: string, created: number, updated: number): Promise<ValidationResult> {
  // Check for duplicate issues with same title
  const result = await execFileNoThrow('gh', [
    'issue', 'list',
    '--search', `"[${epicId}]" in:title`,
    '--json', 'number,title,state',
    '--limit', '100'
  ]);

  const issues = JSON.parse(result.stdout);

  // Group by title to find duplicates
  const titleGroups = new Map<string, number[]>();
  for (const issue of issues) {
    const title = issue.title;
    if (!titleGroups.has(title)) {
      titleGroups.set(title, []);
    }
    titleGroups.get(title)!.push(issue.number);
  }

  // Find duplicates (title groups with >1 issue)
  const duplicates = Array.from(titleGroups.entries())
    .filter(([_, numbers]) => numbers.length > 1);

  return {
    totalIssues: issues.length,
    duplicatesFound: duplicates.length,
    duplicateGroups: duplicates,
    created,
    updated
  };
}
```

### Phase 3: Cleanup Script

**Create command to close duplicates**:

```bash
/specweave-github:cleanup-duplicates <epic-id>
```

**Logic**:
1. Find all issues for Epic
2. Group by title (find duplicates)
3. For each duplicate group:
   - Keep the FIRST created issue (lowest number)
   - Close all others with comment: "Duplicate of #XXX"
4. Update Epic README frontmatter with correct issue numbers

### Phase 4: Comprehensive Logging

**Add detailed logging to track sync operations**:

```typescript
console.log(`\n🔍 Pre-Sync Validation for ${epicId}...`);
console.log(`   Frontmatter GitHub IDs: ${epicData.increments.map(i => i.external.github || 'null').join(', ')}`);

console.log(`\n🔄 Checking GitHub for existing issues...`);
for (const increment of epicData.increments) {
  const githubIssue = await this.findExistingIssue(epicId, increment.id);
  console.log(`   ${increment.id}: Frontmatter=${increment.external.github || 'null'}, GitHub=${githubIssue || 'not found'}`);
}

console.log(`\n📝 Sync Summary:`);
console.log(`   Issues created: ${issuesCreated}`);
console.log(`   Issues updated: ${issuesUpdated}`);
console.log(`   Duplicates detected: ${validation.duplicatesFound}`);
```

---

## Testing Strategy

### **Unit Tests** (NEW):

```typescript
describe('GitHubEpicSync - Duplicate Detection', () => {
  test('should find existing issue by title', async () => {
    // Mock gh CLI to return existing issue
    // Verify findExistingIssue() returns correct number
  });

  test('should NOT create duplicate if issue exists', async () => {
    // Mock: Frontmatter shows null, but GitHub has issue #123
    // Verify: No new issue created, frontmatter updated with #123
  });

  test('should detect duplicates in post-sync validation', async () => {
    // Mock: GitHub has 2 issues with same title
    // Verify: validateSync() returns duplicatesFound=1
  });
});
```

### **E2E Tests** (NEW):

```typescript
describe('Epic Sync - Idempotency', () => {
  test('running sync twice should NOT create duplicates', async () => {
    await syncEpicToGitHub('FS-001');  // First run
    const firstResult = await getGitHubIssues('FS-001');

    // Corrupt frontmatter
    await corruptEpicFrontmatter('FS-001');

    await syncEpicToGitHub('FS-001');  // Second run
    const secondResult = await getGitHubIssues('FS-001');

    expect(secondResult.length).toBe(firstResult.length);  // Same count!
  });
});
```

---

## Implementation Plan

### **Phase 1**: Duplicate Detection (PRIORITY 1)
- [ ] Add `findExistingIssue()` method to `GitHubEpicSync`
- [ ] Update `syncEpicToGitHub()` to check GitHub before creating
- [ ] Add unit tests for duplicate detection
- [ ] Add E2E tests for idempotency

### **Phase 2**: Post-Sync Validation (PRIORITY 1)
- [ ] Add `validateSync()` method to detect duplicates
- [ ] Add warning messages if duplicates found
- [ ] Add validation logging

### **Phase 3**: Cleanup Script (PRIORITY 2)
- [ ] Create `/specweave-github:cleanup-duplicates` command
- [ ] Implement duplicate closure logic
- [ ] Add confirmation prompts (safety)
- [ ] Test on real duplicates

### **Phase 4**: Comprehensive Logging (PRIORITY 2)
- [ ] Add pre-sync validation logging
- [ ] Add GitHub API check logging
- [ ] Add sync summary logging
- [ ] Add debug mode for troubleshooting

### **Phase 5**: Living Docs Sync Fix (PRIORITY 3)
- [ ] Investigate if living docs overwrites Epic frontmatter
- [ ] If yes: Make living docs sync preserve `external_tools` field
- [ ] Add tests for frontmatter preservation

---

## Success Criteria

**Immediate**:
- ✅ No new duplicates created when running sync multiple times
- ✅ Existing duplicates detected and reported
- ✅ User can clean up existing duplicates with one command

**Long-term**:
- ✅ Epic sync is 100% idempotent (can run N times safely)
- ✅ Frontmatter corruption self-heals (finds GitHub issue and updates)
- ✅ Comprehensive validation catches all edge cases
- ✅ E2E tests prevent regression

---

## Related Issues

- GitHub epic sync implementation: `plugins/specweave-github/lib/github-epic-sync.ts`
- Living docs sync: `src/core/living-docs/spec-distributor.ts`
- Post-task-completion hook: `plugins/specweave/hooks/post-task-completion.sh`

---

## Next Steps

1. **IMMEDIATE**: Implement Phase 1 (duplicate detection)
2. **IMMEDIATE**: Implement Phase 2 (post-sync validation)
3. **SHORT-TERM**: Implement Phase 3 (cleanup script)
4. **SHORT-TERM**: Run cleanup on production repository
5. **MEDIUM-TERM**: Implement Phase 4 (logging)
6. **MEDIUM-TERM**: Investigate Phase 5 (living docs fix)

---

**End of Report**
