# ULTRATHINK: Living Docs → External Tool Sync Gap Analysis

**Date**: 2025-11-18
**Increment**: 0043-spec-md-desync-fix
**Analysis Type**: Architectural Gap Discovery + Unit Test Strategy
**Priority**: P1 - CRITICAL (Source of Truth Violation)

---

## Executive Summary

**Discovery**: Living docs sync (`/specweave:sync-docs`) does NOT trigger external tool sync (GitHub, JIRA, ADO), violating SpecWeave's source-of-truth discipline. This architectural gap was discovered via user observation of GitHub issues showing stale data after living docs updates.

**Evidence**:
- ✅ Skipped test exists: `tests/unit/github/github-sync-living-docs.skip.test.ts`
- ✅ GitHub updater infrastructure exists: `plugins/specweave-github/lib/github-issue-updater.ts`
- ❌ Integration code missing: `LivingDocsSync` never calls external tool updaters
- ❌ No test coverage for this workflow

**Impact**:
- GitHub/JIRA/ADO issues show STALE data
- Manual sync required (`/specweave-github:sync` after `/specweave:sync-docs`)
- Source-of-truth discipline broken
- Stakeholders see wrong information

**Solution**:
- Add external tool detection to `LivingDocsSync.syncIncrement()`
- Trigger external tool sync automatically after living docs update
- Comprehensive unit test coverage (6 test cases, 90%+ coverage)
- Enable skipped test

---

## Architectural Gap

### Current Broken Flow

```
User: /specweave:sync-docs update 0040
  ↓
LivingDocsSync.syncIncrement('0040')
  ↓
1. Parse spec.md → user stories, ACs
2. Create living docs files (.specweave/docs/)
  ↓
❌ STOPS HERE - External tools NOT updated
  ↓
GitHub issue #123 still shows OLD data
  ↓
User must manually run: /specweave-github:sync
```

### Expected Correct Flow

```
User: /specweave:sync-docs update 0040
  ↓
LivingDocsSync.syncIncrement('0040')
  ↓
1. Parse spec.md → user stories, ACs
2. Create living docs files (.specweave/docs/)
  ↓
3. Detect external tools from metadata.json
   - metadata.github? → Yes (issue #123)
   - metadata.jira? → No
  ↓
4. Sync to GitHub:
   - Call updateIssueLivingDocs(123, livingDocs, owner, repo)
   - Update issue body with living docs links
   - Post comment: "Living docs updated"
  ↓
✅ COMPLETE - Both living docs AND GitHub updated
```

---

## Evidence

### 1. Skipped Test (Smoking Gun)

**File**: `tests/unit/github/github-sync-living-docs.skip.test.ts`

```typescript
/**
 * Unit tests for GitHub Living Docs Sync
 * ❌ CURRENTLY SKIPPED - Feature not implemented!
 */

describe('GitHub Living Docs Sync', () => {
  describe('collectLivingDocs', () => {
    it('should collect specs, architecture, and diagrams', async () => {
      // This test EXPECTS living docs sync to collect files
      // for GitHub issue update, but the integration doesn't exist!

      const result = await collectLivingDocs(testIncrementId);

      expect(result.specs).toHaveLength(2);
      expect(result.architecture).toContain('.specweave/docs/internal/architecture/adr/0001-decision.md');
      expect(result.diagrams).toContain('.specweave/docs/internal/architecture/diagrams/1-main-flow.mmd');
    });
  });
});
```

**Conclusion**: Feature was PLANNED (test exists) but NEVER IMPLEMENTED.

### 2. Living Docs Sync Code (Missing Integration)

**File**: `src/core/living-docs/living-docs-sync.ts:70-146`

```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // ... existing code ...

  // ✅ Creates living docs files
  await fs.writeFile(featureFile, featureContent, 'utf-8');
  await fs.writeFile(readmePath, readmeContent, 'utf-8');
  // ... more file creation ...

  result.success = true;
  console.log(`✅ Synced ${incrementId} → ${featureId}`);

  // ❌ MISSING: Detect external tools
  // ❌ MISSING: Trigger GitHub/JIRA/ADO sync

  return result;
}
```

**Conclusion**: No integration code exists.

### 3. GitHub Issue Updater (Infrastructure Exists)

**File**: `plugins/specweave-github/lib/github-issue-updater.ts:34-55`

```typescript
/**
 * Update GitHub issue with living docs section
 * ✅ CODE EXISTS - Just not called by living docs sync!
 */
export async function updateIssueLivingDocs(
  issueNumber: number,
  livingDocs: LivingDocsSection,
  owner: string,
  repo: string
): Promise<void> {
  console.log(`📝 Updating GitHub issue #${issueNumber} with living docs...`);

  // 1. Get current issue body
  const currentBody = await getIssueBody(issueNumber, owner, repo);

  // 2. Build living docs section
  const livingDocsSection = buildLivingDocsSection(livingDocs, owner, repo);

  // 3. Update or append living docs section
  const updatedBody = updateBodyWithLivingDocs(currentBody, livingDocsSection);

  // 4. Update issue
  await updateIssueBody(issueNumber, updatedBody, owner, repo);

  console.log(`✅ Living docs section updated in issue #${issueNumber}`);
}
```

**Conclusion**: Infrastructure exists, just needs to be called.

---

## Unit Test Strategy

### Test Philosophy

**Why Unit Tests (User's Preference)**:
- ✅ **Fast**: No real GitHub API calls, no file I/O
- ✅ **Isolated**: Mock all dependencies
- ✅ **Comprehensive**: Cover all scenarios
- ✅ **Maintainable**: Clear test cases, good assertions

### Test File Location

**Primary Test**: `tests/unit/living-docs/living-docs-external-tool-sync.test.ts` (NEW)
**Enable Skipped Test**: `tests/unit/github/github-sync-living-docs.test.ts` (rename from .skip.test.ts)

### Test Cases (6 Scenarios - 90%+ Coverage)

#### Test 1: GitHub Configured → Sync Triggered (Happy Path)

```typescript
it('should trigger GitHub sync when living docs updated and GitHub configured', async () => {
  // Given: Increment with GitHub issue configured
  const metadata = {
    id: '0040-test-feature',
    github: { issue: 123, owner: 'test-owner', repo: 'test-repo' }
  };

  mockReadJson.mockResolvedValue(metadata);
  mockUpdateIssueLivingDocs.mockResolvedValue(undefined);

  // When: Sync living docs
  const sync = new LivingDocsSync(testRoot);
  const result = await sync.syncIncrement('0040-test-feature');

  // Then: GitHub sync triggered
  expect(result.success).toBe(true);
  expect(mockUpdateIssueLivingDocs).toHaveBeenCalledOnce();
  expect(mockUpdateIssueLivingDocs).toHaveBeenCalledWith(
    123,
    expect.objectContaining({
      specs: expect.arrayContaining([expect.stringMatching(/FS-040/)]),
      architecture: expect.any(Array),
      diagrams: expect.any(Array)
    }),
    'test-owner',
    'test-repo'
  );
});
```

**Coverage**: External tool integration logic, GitHub-specific sync.

---

#### Test 2: No External Tools → Sync NOT Triggered (Guard Clause)

```typescript
it('should NOT trigger external tool sync when no external tools configured', async () => {
  // Given: Increment WITHOUT any external tool config
  const metadata = { id: '0041-test-feature' };

  mockReadJson.mockResolvedValue(metadata);
  const mockUpdateIssueLivingDocs = vi.fn();

  // When: Sync living docs
  const sync = new LivingDocsSync(testRoot);
  const result = await sync.syncIncrement('0041-test-feature');

  // Then: No external sync triggered
  expect(result.success).toBe(true);
  expect(mockUpdateIssueLivingDocs).not.toHaveBeenCalled();
});
```

**Coverage**: Guard clause, early return logic.

---

#### Test 3: Multiple External Tools → All Synced (Multi-Tool)

```typescript
it('should trigger ALL configured external tools (GitHub + JIRA + ADO)', async () => {
  // Given: Increment with multiple external tools
  const metadata = {
    id: '0042-multi-tool',
    github: { issue: 123, owner: 'test', repo: 'repo' },
    jira: { issue: 'SPEC-456', project: 'SPEC' },
    ado: { workItem: 789, project: 'MyProject' }
  };

  mockReadJson.mockResolvedValue(metadata);

  const mockUpdateIssueLivingDocs = vi.fn();
  const mockUpdateJiraIssue = vi.fn();
  const mockUpdateAdoWorkItem = vi.fn();

  // When: Sync living docs
  const sync = new LivingDocsSync(testRoot);
  await sync.syncIncrement('0042-multi-tool');

  // Then: ALL external tools synced
  expect(mockUpdateIssueLivingDocs).toHaveBeenCalledOnce();
  expect(mockUpdateJiraIssue).toHaveBeenCalledOnce();
  expect(mockUpdateAdoWorkItem).toHaveBeenCalledOnce();
});
```

**Coverage**: Multi-tool orchestration, iteration over external tools.

---

#### Test 4: GitHub Sync Failure → Error Logged, Sync Continues (Error Handling)

```typescript
it('should log error if GitHub sync fails but continue with other syncs', async () => {
  // Given: Increment with GitHub + JIRA
  const metadata = {
    id: '0043-error-test',
    github: { issue: 123, owner: 'test', repo: 'repo' },
    jira: { issue: 'SPEC-456' }
  };

  mockReadJson.mockResolvedValue(metadata);

  // Mock GitHub sync failure
  const mockUpdateIssueLivingDocs = vi.fn()
    .mockRejectedValue(new Error('GitHub API rate limit exceeded'));

  const mockUpdateJiraIssue = vi.fn().mockResolvedValue(undefined);

  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // When: Sync living docs
  const sync = new LivingDocsSync(testRoot);
  const result = await sync.syncIncrement('0043-error-test');

  // Then: Error logged, JIRA still synced
  expect(result.success).toBe(true); // Living docs sync succeeded
  expect(result.errors).toContain(expect.stringMatching(/GitHub.*rate limit/));
  expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringMatching(/GitHub sync failed/));
  expect(mockUpdateJiraIssue).toHaveBeenCalledOnce(); // Still called!

  consoleErrorSpy.mockRestore();
});
```

**Coverage**: Error handling, resilience, continue-on-error logic.

---

#### Test 5: Dry Run Mode → External Tools NOT Synced (Dry Run)

```typescript
it('should NOT trigger external tool sync in dry-run mode', async () => {
  // Given: Increment with GitHub configured
  const metadata = {
    id: '0044-dry-run',
    github: { issue: 123, owner: 'test', repo: 'repo' }
  };

  mockReadJson.mockResolvedValue(metadata);
  const mockUpdateIssueLivingDocs = vi.fn();

  // When: Sync living docs in DRY RUN mode
  const sync = new LivingDocsSync(testRoot);
  const result = await sync.syncIncrement('0044-dry-run', { dryRun: true });

  // Then: No external sync triggered
  expect(result.success).toBe(true);
  expect(result.filesCreated.every(f => f.includes('(dry-run)'))).toBe(true);
  expect(mockUpdateIssueLivingDocs).not.toHaveBeenCalled();
});
```

**Coverage**: Dry-run mode, early return in syncToExternalTools.

---

#### Test 6: Living Docs Collected → Passed to GitHub Updater (Data Flow)

```typescript
it('should pass correct living docs structure to GitHub updater', async () => {
  // Given: Increment that creates specs, architecture, diagrams
  const incrementId = '0045-full-docs';
  const metadata = {
    id: incrementId,
    github: { issue: 123, owner: 'test', repo: 'repo' }
  };

  mockReadJson.mockResolvedValue(metadata);
  const mockUpdateIssueLivingDocs = vi.fn();

  // When: Sync living docs
  const sync = new LivingDocsSync(testRoot);
  await sync.syncIncrement(incrementId);

  // Then: Verify living docs structure passed to GitHub
  const call = mockUpdateIssueLivingDocs.mock.calls[0];
  const livingDocs = call[1];

  expect(livingDocs).toEqual({
    specs: expect.arrayContaining([
      expect.stringMatching(/\.specweave\/docs\/internal\/specs\//)
    ]),
    architecture: expect.any(Array),
    diagrams: expect.any(Array)
  });
});
```

**Coverage**: Data collection, data structure validation.

---

## Implementation Changes

### File 1: Add External Tool Integration to LivingDocsSync

**File**: `src/core/living-docs/living-docs-sync.ts`

**Add Method 1: detectExternalTools()**

```typescript
/**
 * Detect external tools configured for increment
 */
private async detectExternalTools(incrementId: string): Promise<{
  github?: GitHubConfig;
  jira?: JiraConfig;
  ado?: AdoConfig;
}> {
  const metadataPath = path.join(
    this.projectRoot,
    '.specweave/increments',
    incrementId,
    'metadata.json'
  );

  if (!await fs.pathExists(metadataPath)) {
    return {};
  }

  const metadata = await fs.readJson(metadataPath);

  const tools: any = {};

  if (metadata.github) {
    tools.github = metadata.github;
  }

  if (metadata.jira) {
    tools.jira = metadata.jira;
  }

  if (metadata.ado) {
    tools.ado = metadata.ado;
  }

  return tools;
}
```

**Add Method 2: syncToExternalTools()**

```typescript
/**
 * Sync living docs to external tools
 */
private async syncToExternalTools(
  incrementId: string,
  syncResult: SyncResult,
  options: SyncOptions
): Promise<void> {
  // Skip if dry-run
  if (options.dryRun) {
    console.log('⏭️  Skipping external tool sync (dry-run mode)');
    return;
  }

  // Detect external tools
  const tools = await this.detectExternalTools(incrementId);

  if (Object.keys(tools).length === 0) {
    console.log('⏭️  No external tools configured');
    return;
  }

  console.log(`📡 Syncing to external tools: ${Object.keys(tools).join(', ')}`);

  // Collect living docs paths
  const livingDocs = this.collectLivingDocsPaths(syncResult);

  // Sync to GitHub
  if (tools.github) {
    try {
      const { updateIssueLivingDocs } = await import(
        '../../../plugins/specweave-github/lib/github-issue-updater.js'
      );

      await updateIssueLivingDocs(
        tools.github.issue,
        livingDocs,
        tools.github.owner,
        tools.github.repo
      );

      console.log(`✅ Synced to GitHub issue #${tools.github.issue}`);
    } catch (error) {
      console.error('❌ GitHub sync failed:', error);
      syncResult.errors.push(`GitHub sync failed: ${error}`);
    }
  }

  // Sync to JIRA (similar pattern)
  // Sync to ADO (similar pattern)
}
```

**Add Method 3: collectLivingDocsPaths()**

```typescript
/**
 * Collect living docs paths from sync result
 */
private collectLivingDocsPaths(syncResult: SyncResult): LivingDocsSection {
  return {
    specs: syncResult.filesCreated.filter(f =>
      f.includes('/specs/') && !f.includes('(dry-run)')
    ),
    architecture: syncResult.filesCreated.filter(f =>
      f.includes('/architecture/')
    ),
    diagrams: syncResult.filesCreated.filter(f =>
      f.includes('/diagrams/')
    )
  };
}
```

**Modify Method: syncIncrement()**

```typescript
async syncIncrement(incrementId: string, options: SyncOptions = {}): Promise<SyncResult> {
  // ... existing code ...

  // ✅ NEW: Sync to external tools
  await this.syncToExternalTools(incrementId, result, options);

  result.success = true;
  console.log(`✅ Synced ${incrementId} → ${featureId}`);

  if (result.errors.length > 0) {
    console.warn(`⚠️  Errors: ${result.errors.length}`);
    result.errors.forEach(err => console.error(`   - ${err}`));
  }

  return result;
}
```

---

## Mock Strategy (Vitest Best Practices)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs-extra
vi.mock('fs-extra');
import fs from 'fs-extra';
const mockReadJson = vi.mocked(fs.readJson);
const mockPathExists = vi.mocked(fs.pathExists);
const mockEnsureDir = vi.mocked(fs.ensureDir);
const mockWriteFile = vi.mocked(fs.writeFile);

// Mock GitHub updater
vi.mock('../../../plugins/specweave-github/lib/github-issue-updater');
import { updateIssueLivingDocs } from '../../../plugins/specweave-github/lib/github-issue-updater';
const mockUpdateIssueLivingDocs = vi.mocked(updateIssueLivingDocs);

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock implementations
  mockPathExists.mockResolvedValue(true);
  mockEnsureDir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
});
```

---

## Test Execution Plan

**Phase 1: Write Unit Tests** (TDD - Red Phase)
```bash
# Create test file
tests/unit/living-docs/living-docs-external-tool-sync.test.ts

# Run tests (should FAIL initially)
npm run test:unit -- living-docs-external-tool-sync

# Expected: All 6 tests FAIL (methods don't exist yet)
```

**Phase 2: Implement External Tool Integration** (TDD - Green Phase)
```bash
# Modify LivingDocsSync class
src/core/living-docs/living-docs-sync.ts

# Add methods:
# - detectExternalTools()
# - syncToExternalTools()
# - collectLivingDocsPaths()

# Run tests again
npm run test:unit -- living-docs-external-tool-sync

# Expected: All 6 tests PASS
```

**Phase 3: Verify Coverage** (TDD - Refactor Phase)
```bash
# Check coverage
npm run test:coverage -- living-docs-external-tool-sync

# Target: 90%+ coverage
# Refactor if needed to improve coverage
```

**Phase 4: Enable Skipped Test**
```bash
# Rename skipped test
mv tests/unit/github/github-sync-living-docs.skip.test.ts \
   tests/unit/github/github-sync-living-docs.test.ts

# Update test to use new implementation
# Run again to verify
npm run test:unit -- github-sync-living-docs

# Expected: All tests PASS
```

---

## Success Criteria

**Unit Test Coverage**: ✅ 90%+
- ✅ All scenarios covered (6 test cases)
- ✅ All code paths tested
- ✅ Error handling verified
- ✅ Dry-run mode verified

**Integration**: ✅ Working
- ✅ Living docs sync triggers external tool sync
- ✅ Only configured tools are synced
- ✅ Errors logged but don't break living docs sync

**Performance**: ✅ Fast
- ✅ Unit tests run in < 1s
- ✅ No real API calls
- ✅ No real file I/O

**User Experience**: ✅ Improved
- ✅ One command (`/specweave:sync-docs`) updates everything
- ✅ No manual sync required
- ✅ GitHub/JIRA/ADO always in sync with living docs

---

## Why This Wasn't Caught

1. **No Integration Test**: Living docs → GitHub sync has no test coverage
2. **Skipped Test**: Feature was planned (`github-sync-living-docs.skip.test.ts`) but never implemented
3. **Manual Workflow**: Users manually run `/specweave-github:sync` after `/specweave:sync-docs`
4. **No Validation**: No check verifies external tools are updated after living docs sync
5. **Independent Development**: Living docs sync and external tool sync developed separately without integration

---

## Related Files

**Source Code**:
- `src/core/living-docs/living-docs-sync.ts` (MODIFY)
- `plugins/specweave-github/lib/github-issue-updater.ts` (USE EXISTING)
- `plugins/specweave-jira/lib/jira-issue-updater.ts` (USE EXISTING - if exists)
- `plugins/specweave-ado/lib/ado-workitem-updater.ts` (USE EXISTING - if exists)

**Test Files**:
- `tests/unit/living-docs/living-docs-external-tool-sync.test.ts` (CREATE NEW)
- `tests/unit/github/github-sync-living-docs.skip.test.ts` (ENABLE - rename to .test.ts)

**Documentation**:
- `.specweave/increments/0043-spec-md-desync-fix/spec.md` (UPDATED - added US-005)
- This ultrathink report

---

## Next Steps

1. ✅ **DONE**: Ultrathink analysis
2. ✅ **DONE**: Update spec.md with US-005
3. **TODO**: Write unit tests (TDD red phase)
4. **TODO**: Implement external tool integration (TDD green phase)
5. **TODO**: Verify coverage 90%+ (TDD refactor phase)
6. **TODO**: Enable skipped test
7. **TODO**: Run full test suite
8. **TODO**: Update increment to active status

---

**Conclusion**: This architectural gap violates SpecWeave's core source-of-truth principle. The unit test strategy provides comprehensive coverage (6 scenarios, 90%+ target) while remaining fast and maintainable. Implementation is straightforward (3 new methods) with clear separation of concerns.

**Impact**: After fix, `/specweave:sync-docs` will automatically update GitHub/JIRA/ADO issues, eliminating manual sync commands and ensuring external tools always reflect living docs state.

---

**Last Updated**: 2025-11-18
**Author**: Claude (Sonnet 4.5)
**Status**: Analysis Complete, Ready for Implementation
