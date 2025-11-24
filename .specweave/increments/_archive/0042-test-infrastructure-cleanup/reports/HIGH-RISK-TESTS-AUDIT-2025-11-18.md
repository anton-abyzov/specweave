# HIGH RISK Test Files Audit

**Date**: 2025-11-18
**Increment**: 0042-test-infrastructure-cleanup
**Task**: T-006 (Audit All process.cwd() Usages)
**Status**: COMPLETE

---

## Executive Summary

**Total process.cwd() Usages**: 112 instances across 63 unique test files

**Risk Categorization**:
- 🔴 **HIGH RISK**: 28 unique test files (references .specweave AND has deletion operations)
- 🟡 **MEDIUM RISK**: 4 test files (write operations with process.cwd())
- 🟢 **LOW RISK**: ~38 test files (read-only operations)

**Critical Finding**: 28 test files have the potential to **catastrophically delete** the project `.specweave/` directory if executed in the wrong context.

---

## HIGH RISK Test Files (28 files)

These files reference `.specweave` directories AND use deletion operations (`fs.rm`, `fs.rmSync`, `fs.rmdirSync`, `fs.remove`).

### E2E Tests (11 files)
1. tests/e2e/fix-duplicates-command.test.ts
2. tests/e2e/github-api-integration.test.ts
3. tests/e2e/github-feature-sync-flow.test.ts
4. tests/e2e/github-frontmatter-update.test.ts
5. tests/e2e/github-sync-idempotency.test.ts
6. tests/e2e/github-user-story-status-sync.test.ts
7. tests/e2e/github-user-story-sync.test.ts
8. tests/e2e/i18n/living-docs-translation.test.ts
9. tests/e2e/i18n/multilingual-workflows.test.ts
10. tests/e2e/living-docs-sync-bidirectional.test.ts
11. tests/e2e/status-auto-transition.test.ts

### Integration Tests - Commands (2 files)
12. tests/integration/commands/plan-command.integration.test.ts
13. tests/integration/core/commands/plan-command.integration.test.ts

### Integration Tests - Core (7 files)
14. tests/integration/core/deduplication/hook-integration.test.ts ✅ (ALREADY FIXED)
15. tests/integration/core/hooks/ac-status-hook.test.ts
16. tests/integration/core/living-docs/intelligent-sync.test.ts
17. tests/integration/core/status-line-hook.test.ts
18. tests/integration/core/sync-specs-command.test.ts
19. tests/integration/core/task-consistency.test.ts

### Integration Tests - External Tools (4 files)
20. tests/integration/external-tools/ado/ado-multi-project/ado-multi-project.test.ts
21. tests/integration/external-tools/ado/ado-multi-project/ado-sync-scenarios.test.ts
22. tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts
23. tests/integration/external-tools/jira/jira-incremental-sync.test.ts

### Integration Tests - Features (2 files)
24. tests/integration/features/status-line/multi-window.test.ts
25. tests/integration/features/status-line/update-status-line-hook.test.ts

### Unit Tests (3 files)
26. tests/unit/increment/duplicate-prevention.test.ts
27. tests/unit/increment/metadata-manager.test.ts
28. tests/unit/increment/status-auto-transition.test.ts

---

## Risk Analysis

### Why These Are CRITICAL

Each of these files follows a dangerous pattern:

```typescript
// ❌ DANGEROUS PATTERN (can delete entire .specweave/):
const projectRoot = process.cwd();
const testDir = path.join(projectRoot, '.specweave', 'increments', '0001-test');

afterEach(async () => {
  await fs.rm(testDir, { recursive: true });  // 🔴 CATASTROPHIC if projectRoot is actual project!
});
```

**What Can Go Wrong**:
1. Test runs in actual project directory (not isolated temp dir)
2. `process.cwd()` returns `/Users/username/Projects/specweave`
3. Cleanup deletes `/Users/username/Projects/specweave/.specweave/increments/0001-test`
4. **ALL increment work is permanently deleted**

### Historical Incident

**Date**: 2025-11-17
**Event**: Multiple `.specweave/` deletions traced to dangerous test patterns
**Root Cause**: Tests using `process.cwd()` + `fs.rm()` combination
**Recovery**: All files recovered via `git restore`, but incident demonstrates EXACT risk
**Prevention**: This audit + systematic fixes (T-007, T-008)

---

## SAFE Pattern (MANDATORY)

All 28 files MUST be migrated to:

```typescript
import { createIsolatedTestDir } from '../../test-utils/isolated-test-dir';

test('my test', async () => {
  const { testDir, cleanup } = await createIsolatedTestDir('my-test');

  try {
    // Setup .specweave structure in ISOLATED directory
    const incrementPath = path.join(testDir, '.specweave', 'increments', '0001-test');
    await fs.ensureDir(incrementPath);

    // Test code here - NEVER touches project .specweave/
    // ...

  } finally {
    await cleanup();  // ALWAYS cleanup isolated directory
  }
});
```

**Why This Is Safe**:
- ✅ `testDir` is in `os.tmpdir()` (e.g., `/tmp/test-my-test-1234567890/`)
- ✅ Cleanup deletes temp directory, NOT project directory
- ✅ Failures don't pollute project
- ✅ Tests can run in parallel (unique temp dirs)

---

## Next Steps (T-007)

**Immediate Action**: Fix all 28 HIGH RISK test files

**Strategy**: Risk-based triage
1. Fix HIGH RISK first (28 files) - **CRITICAL PRIORITY**
2. Fix MEDIUM RISK (4 files) - Important
3. Fix LOW RISK (38 files) - Lower priority

**Timeline**: ~2-3 hours (10-15 minutes per file)

**Approach**: Manual fix for each file (patterns vary)

---

## Verification

After T-007 completion, verify:
- [ ] All 28 files use `createIsolatedTestDir()`
- [ ] No `process.cwd()` + `.specweave` combinations remain
- [ ] All tests passing
- [ ] No project .specweave/ pollution

**Final Checkpoint**: `grep -rn "process\.cwd()" tests/ | wc -l` should be SIGNIFICANTLY reduced

---

**Status**: AUDIT COMPLETE ✅
**Next Task**: T-007 (Fix HIGH RISK tests)
**Safety Level**: CRITICAL - These tests can delete project .specweave/
