# Process.cwd() Safety Migration Status

## Overview

Systematic audit and fix of `process.cwd()` usage in integration tests to prevent:
- ❌ Deletion risks (could delete project files if cleanup uses wrong cwd)
- ❌ Parallel execution failures (different workers have different cwd values)
- ❌ Unreliable paths (cwd can change during test execution)

## Solution: `findProjectRoot(import.meta.url)`

Created shared test utility at `tests/test-utils/project-root.ts` that:
- ✅ Uses `import.meta.url` to find test file location
- ✅ Traverses upward to find `.specweave/` directory
- ✅ Returns absolute path to project root
- ✅ Never relies on `process.cwd()`
- ✅ Safe for parallel test execution

## Progress: 6 of 20 Files Fixed (30%)

### ✅ Fixed Files (6)

1. **tests/integration/core/deduplication/hook-integration.test.ts**
   - Pattern: Hook path resolution
   - Changes: Added `findProjectRoot()`, replaced all `process.cwd()` usages
   - Status: ✅ SAFE

2. **tests/integration/hooks/sync-living-docs-hook.test.ts**
   - Pattern: Multiple hook path usages (9 occurrences)
   - Changes: Module-level `projectRoot` constant, replaced all usages
   - Status: ✅ SAFE

3. **tests/integration/core/sync-specs-command.test.ts**
   - Pattern: Save/restore CWD with `process.chdir()`
   - Changes: Removed `originalCwd` variable, use `projectRoot` for restore
   - Status: ✅ SAFE

4. **tests/integration/commands/done-command.test.ts**
   - Pattern: Hook path + mocked `process.cwd()`
   - Changes: Use `projectRoot` for hook path, keep mock for code under test
   - Status: ✅ SAFE

5. **tests/integration/hooks/status-line-hook.test.ts**
   - Pattern: Save/restore CWD + hook path
   - Changes: Removed `originalCwd`, use `projectRoot` for both
   - Status: ✅ SAFE

6. **tests/integration/core/task-consistency.test.ts**
   - Pattern: Multiple hook path usages (4 occurrences)
   - Changes: Used `replace_all: true` to fix all occurrences at once
   - Status: ✅ SAFE

### ⏳ Remaining Files (14)

#### High Priority (Core Functionality)
- [ ] tests/integration/core/hook-health-check.test.ts
- [ ] tests/integration/core/status-line-task-completion.test.ts
- [ ] tests/integration/core/status-line-desync-prevention.test.ts
- [ ] tests/integration/core/increment-status-sync.test.ts
- [ ] tests/integration/core/sync-docs-integration.test.ts

#### Medium Priority (Features)
- [ ] tests/integration/features/status-line/update-status-line-hook.test.ts
- [ ] tests/integration/features/status-line/multi-window.test.ts
- [ ] tests/integration/hook-health-check.test.ts

#### Lower Priority (External Tools - May Not Run Locally)
- [ ] tests/integration/external-tools/jira/jira-incremental-sync.test.ts
- [ ] tests/integration/external-tools/jira/jira-sync.test.ts
- [ ] tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts
- [ ] tests/integration/external-tools/github/github-sync.test.ts
- [ ] tests/integration/external-tools/ado/ado-multi-project/ado-sync-scenarios.test.ts
- [ ] tests/integration/external-tools/ado/ado-multi-project/ado-multi-project.test.ts

## Files Created

1. **tests/test-utils/project-root.ts**
   - Safe project root detection utility
   - `findProjectRoot(import.meta.url)` function
   - Comprehensive documentation with examples
   - Deprecation warning for unsafe pattern

2. **tests/test-utils/PROCESS_CWD_MIGRATION_GUIDE.md**
   - Complete migration guide with patterns
   - Before/after examples
   - Step-by-step checklist
   - Testing instructions

3. **tests/test-utils/PROCESS_CWD_MIGRATION_STATUS.md** (this file)
   - Progress tracking
   - Detailed status for each file
   - Priority classification

## Next Steps

1. **Continue fixing remaining 14 files** using the established pattern
2. **Run full integration test suite** to verify no breakage
3. **Update CLAUDE.md** with safety rule about `process.cwd()` in tests
4. **Add pre-commit hook** to detect and block new `process.cwd()` usages in tests

## Testing Strategy

After fixing each file:
```bash
# Test individual file
npm run test:integration -- path/to/fixed.test.ts

# Run all integration tests
npm run test:integration
```

## Safety Rules Established

1. **NEVER use `process.cwd()` in tests** for file operations
2. **ALWAYS use `findProjectRoot(import.meta.url)`** instead
3. **ALWAYS use `os.tmpdir()`** for test directories
4. **ALWAYS add safety comments** to explain the pattern

## Reference

- Implementation: `tests/test-utils/project-root.ts`
- Guide: `tests/test-utils/PROCESS_CWD_MIGRATION_GUIDE.md`
- User Request: "ultrathink if we ever could use .cwd() in tests as it might lead to potential deletion or errors? and fix tests"

---

**Last Updated**: 2025-11-19
**Progress**: 6/20 files fixed (30%)
**Estimated Remaining Work**: ~2 hours (15 min per file × 14 files)
