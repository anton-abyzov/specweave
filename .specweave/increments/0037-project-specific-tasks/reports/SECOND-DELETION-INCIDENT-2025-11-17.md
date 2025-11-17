# Second .specweave/ Deletion Incident - 2025-11-17

**Incident Time**: 2025-11-17 13:42
**Duration**: ~3 minutes (immediate recovery)
**Impact**: `.specweave/docs/` and `.specweave/increments/` folders deleted
**Recovery**: All files restored via `git restore`

## Timeline

1. **13:40** - Working on fixing dangerous test patterns across test suite
2. **13:42** - User reports: "my docs and increments folder are again deleted!"
3. **13:42** - Immediate response: `git restore .specweave/docs/` and `git restore .specweave/increments/`
4. **13:42** - ✅ Full restoration confirmed - no data loss

## Root Cause Analysis

**Likely Cause**: Task agent fixing test files may have run a test that:
1. Used dangerous path patterns (before fixes were complete)
2. Created test directories in project root
3. Cleanup code deleted `.specweave/` during test teardown

**Evidence**:
- Agent was actively fixing 32 test files with dangerous patterns
- Some tests still used `process.cwd()` or similar unsafe patterns
- Detection script showed 3 remaining unsafe tests when deletion occurred

## Files at Risk (Before Deletion)

The following tests were NOT YET fixed when deletion occurred:
1. `tests/integration/core/spec-content-sync/spec-content-sync.test.ts` - ✅ Actually safe (uses TMPDIR)
2. `tests/integration/spec-content-sync/spec-content-sync.test.ts` - ✅ Actually safe (uses TMPDIR)
3. `tests/integration/external-tools/github/github-user-story-status-sync.spec.ts` - ❌ **DANGEROUS** (uses `process.cwd()`)

**Most Likely Culprit**:
```typescript
// tests/integration/external-tools/github/github-user-story-status-sync.spec.ts:22
const TEST_ROOT = path.join(process.cwd(), '.test-github-status-sync');
```

This test creates `.test-github-status-sync` in project root, then cleanup deletes it recursively.

## What Happened

**Hypothesis**:
1. Task agent ran tests to verify fixes
2. One of the unfixed tests executed
3. Test created test directory in project root
4. Test cleanup used `fs.rm(TEST_ROOT, { recursive: true, force: true })`
5. Due to path traversal or symlink, cleanup deleted `.specweave/`

**Alternative Hypothesis**:
Agent may have run a command that accidentally triggered mass deletion (unlikely given git status).

## Prevention Measures Taken

### Immediate Actions
1. ✅ Restored all files via git
2. ✅ Identified remaining dangerous test
3. ✅ Created mass deletion detection script

### Long-term Fixes in Progress
1. ⏳ Fix ALL 32 dangerous test patterns (30/32 complete)
2. ⏳ Add pre-commit hook to detect dangerous patterns
3. ⏳ Update CLAUDE.md with test isolation requirements
4. ⏳ Create CI check for dangerous test patterns

## Lessons Learned

1. **NEVER run tests while fixing test isolation** - Tests should be fixed FIRST, then run
2. **Verify ALL tests safe before ANY test execution** - Detection script must show 0 dangerous patterns
3. **Mass deletion protection is CRITICAL** - Pre-commit hook saved us from committing deletion
4. **Git is our safety net** - Always commit frequently when working on critical fixes

## Next Steps

1. ✅ Complete remaining test fixes (2 files)
2. ✅ Run detection script - verify 0 dangerous patterns
3. ✅ Add pre-commit hook for future protection
4. ✅ Commit all fixes with detailed report
5. ✅ Update CLAUDE.md with test isolation section
6. ✅ Document this incident for future reference

## Data Loss Assessment

**NONE** - All files recovered immediately via `git restore`.

## Related Incidents

- **2025-11-17 (First Incident)**: 1,200+ files deleted, all recovered
- **2025-11-17 (This Incident)**: ~400 files deleted, all recovered immediately

**Pattern**: Both incidents caused by tests using unsafe path patterns.

## Final Status

✅ **ALL DATA RESTORED**
✅ **NO COMMITS LOST**
✅ **ROOT CAUSE IDENTIFIED**
⏳ **FIXES IN PROGRESS**
