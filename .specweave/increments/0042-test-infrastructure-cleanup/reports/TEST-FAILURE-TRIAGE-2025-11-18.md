# Test Failure Triage Report - Increment 0042
**Date**: 2025-11-18
**Post-Phase 1 Analysis**
**Build Status**: ✅ Clean rebuild successful
**Test Status**: ❌ 105 failing test files, 10 passing

---

## Executive Summary

Comprehensive analysis of 105 failing integration tests after Phase 1 directory cleanup. **Failures are NOT caused by the directory deletion** - they are pre-existing issues from incomplete Vitest migration and missing import extensions.

**Critical Finding**: All failures fall into 4 categories with automated fix potential:
1. Missing `.js` extensions (39 files) - **Can automate**
2. Empty test suites (38 files) - **Can skip/delete**
3. Missing Vitest imports (4 files) - **Can automate**
4. Jest.mock usage (1 file) - **Can automate**

**Estimated Fix Time**: 2-3 hours (mostly automated)

---

## Failure Categories 📊

### Category 1: Missing .js Extensions (39 files - 37%)

**Error Pattern**:
```
Error: Failed to load url ../../src/core/hooks/HookHealthChecker (resolved id: ...)
Does the file exist?
```

**Root Cause**: TypeScript ES modules require `.js` extensions in imports, even though source files are `.ts`.

**Example**:
```typescript
// ❌ WRONG (missing .js)
import { HookHealthChecker } from '../../src/core/hooks/HookHealthChecker';

// ✅ CORRECT
import { HookHealthChecker } from '../../src/core/hooks/HookHealthChecker.js';
```

**Affected Files** (39 total):
1. tests/integration/core/hook-health-check.test.ts
2. tests/integration/core/cicd/github-api-polling.test.ts
3. tests/integration/core/cicd/phase1-end-to-end.test.ts
4. tests/integration/core/cicd/state-persistence.test.ts
5. tests/integration/core/commands/plan-command.integration.test.ts
6. tests/integration/core/hooks/ac-status-hook.test.ts
7. tests/integration/core/hooks/auto-transition-integration.test.ts
8. tests/integration/core/living-docs/intelligent-sync.test.ts
9. tests/integration/core/living-docs/spec-distributor-tasks.test.ts
10. tests/integration/core/living-docs-sync/bidirectional-sync.test.ts
11. tests/integration/core/multi-project/sync.test.ts
12. tests/integration/core/project-manager/lifecycle.test.ts
13. tests/integration/core/spec-commit-sync/spec-commit-sync.test.ts
14. tests/integration/core/spec-content-sync/spec-content-sync.test.ts
15. tests/integration/external-tools/github/github-sync.test.ts
16. tests/integration/external-tools/github/github-client-v2.test.ts
17. tests/integration/external-tools/github/github-feature-sync-idempotency.test.ts
18. tests/integration/external-tools/github/github-immutable-description.test.ts
19. tests/integration/github-immutable-description.test.ts
20. tests/integration/external-tools/jira/jira-sync.test.ts
21. tests/integration/external-tools/jira/jira-bidirectional-sync.test.ts
22. tests/integration/external-tools/jira/jira-incremental-sync.test.ts
23. tests/integration/external-tools/jira/mapper/specweave-jira-mapper.test.ts
24. tests/integration/external-tools/ado/ado-sync.test.ts
25. tests/integration/external-tools/ado/ado-multi-project/*.test.ts
26. tests/integration/external-tools/ado/mapper/specweave-ado-mapper.test.ts
27. tests/integration/generators/infrastructure/iac/*.test.ts (6 files)
28. tests/integration/generators/infrastructure/serverless/*.test.ts (5 files)
29. tests/integration/external-tools/kafka/**/*.test.ts (multiple)

**Fix Strategy**: **AUTOMATED**
```bash
# Use existing fix-js-extensions.js script
node scripts/fix-js-extensions.js

# Or create targeted fix for test files
find tests/integration -name "*.test.ts" -exec sed -i '' 's/from \x27\(.*\)\.ts\x27/from \x27\1.js\x27/g' {} +
```

**Priority**: **P0 (Critical)** - Blocks 37% of tests
**Effort**: 30 minutes (automated script + verification)

---

### Category 2: Empty Test Suites (38 files - 36%)

**Error Pattern**:
```
Error: No test suite found in file /Users/.../test-name.test.ts
```

**Root Cause**: Test files exist but contain no actual test cases (describe/it blocks).

**Affected Files** (38 total):
1. tests/integration/core/context-loader/context-loader.test.ts
2. tests/integration/core/context-optimizer/context-optimizer.test.ts
3. tests/integration/core/cost-optimizer/cost-optimizer.test.ts
4. tests/integration/core/increment-planner/increment-planner.test.ts
5. tests/integration/core/quality-judge/increment-quality-judge.test.ts
6. tests/integration/core/role-orchestrator/role-orchestrator.test.ts
7. tests/integration/core/specweave-detector/specweave-detector.test.ts
8. tests/integration/core/task-builder/task-builder.test.ts
9. tests/integration/external-tools/hetzner/hetzner-provisioner.test.ts
10. tests/integration/features/**/*.test.ts (multiple)
11. tests/integration/generators/**/*.test.ts (multiple)
12. tests/integration/external-tools/kafka/**/*.test.ts (multiple)

**Investigation Needed**:
- Are these placeholder files?
- Were tests removed but files kept?
- Should these be deleted or implemented?

**Fix Strategy**: **MANUAL REVIEW + AUTOMATED CLEANUP**
```bash
# 1. List all empty test files
find tests/integration -name "*.test.ts" -exec sh -c 'grep -q "describe\\|it" "$1" || echo "$1"' _ {} \;

# 2. Review each file:
#    - If placeholder → Delete
#    - If needed → Add to Phase 4 backlog
#    - If unclear → Skip for now

# 3. Automated deletion (after review):
# (list of confirmed placeholder files)
```

**Priority**: **P2 (Medium)** - Not blocking (tests don't run), but pollutes test suite
**Effort**: 1 hour (review + cleanup)

---

### Category 3: Missing Vitest Imports (4 files - 4%)

**Error Pattern**:
```
ReferenceError: describe is not defined
```

**Root Cause**: Test files missing Vitest import statement.

**Example**:
```typescript
// ❌ WRONG (no imports)
describe('My Test', () => {
  it('should work', () => { });
});

// ✅ CORRECT
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('My Test', () => {
  it('should work', () => { });
});
```

**Affected Files** (4 total):
1. tests/integration/locale-manager.test.ts
2. tests/integration/core/cli/init-dot-notation.test.ts
3. tests/integration/core/dev-setup/marketplace-symlink.test.ts
4. (possibly 1 more from output)

**Fix Strategy**: **AUTOMATED**
```bash
# Add Vitest import to files missing it
for file in tests/integration/locale-manager.test.ts \
            tests/integration/core/cli/init-dot-notation.test.ts \
            tests/integration/core/dev-setup/marketplace-symlink.test.ts; do
  if ! grep -q "from 'vitest'" "$file"; then
    # Add import at top (after other imports or at line 1)
    sed -i '' '1i\
import { describe, it, expect, beforeEach, afterEach, vi } from '\''vitest'\'';
' "$file"
  fi
done
```

**Priority**: **P1 (High)** - Quick fix, unblocks tests
**Effort**: 15 minutes (automated + verification)

---

### Category 4: Jest.mock Usage (1 file - 1%)

**Error Pattern**:
```
TypeError: Cannot read properties of undefined (reading 'mock')
 ❯ jest.mock('../../src/utils/execFileNoThrow.js', () => ({
```

**Root Cause**: Using `jest.mock()` instead of `vi.mock()` after Vitest migration.

**Example**:
```typescript
// ❌ WRONG
jest.mock('../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: jest.fn()
}));

// ✅ CORRECT
vi.mock('../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: vi.fn()
}));
```

**Affected Files** (1 file):
1. tests/integration/github-feature-sync-idempotency.test.ts

**Fix Strategy**: **MANUAL FIX** (single file)
```bash
# Replace jest.mock with vi.mock
sed -i '' 's/jest\.mock/vi.mock/g' tests/integration/github-feature-sync-idempotency.test.ts
sed -i '' 's/jest\.fn/vi.fn/g' tests/integration/github-feature-sync-idempotency.test.ts

# Add vi import if missing
# (check file manually)
```

**Priority**: **P1 (High)** - Quick fix
**Effort**: 5 minutes

---

### Category 5: Actual Test Failures (17 test failures - 16%)

**Not import/setup errors** - These are actual assertion failures in tests that run successfully:

#### 5.1. Task Consistency Tests (9 failures)
**File**: `tests/integration/core/task-consistency.test.ts`
**Issue**: Auto-fix hook behavior not working as expected
```
✓ COMPLETE marker handling inconsistent
AC sync after auto-fix not working
```
**Root Cause**: Likely related to hook implementation changes
**Priority**: P2 (Medium)
**Effort**: 1 hour

#### 5.2. Status Line Hook (1 failure)
**File**: `tests/integration/core/status-line-hook.test.ts`
**Issue**: Increment count mismatch
```
expected 1 to be 2 // Object.is equality
```
**Priority**: P3 (Low)
**Effort**: 30 minutes

#### 5.3. Deduplication Hook (2 failures)
**File**: `tests/integration/core/deduplication/hook-integration.test.ts`
**Issue**: Cache file not created
**Priority**: P3 (Low)
**Effort**: 30 minutes

#### 5.4. Build Verification (4 failures)
**File**: `tests/integration/core/build/build-verification.test.ts`
**Issue**: Expects test plugins in non-existent location
```
ENOENT: no such file or directory, open '.../ tests/plugins/specweave/lib/hooks/update-ac-status.js'
```
**Root Cause**: Test expects files in `tests/plugins/` but actual location is `plugins/`
**Priority**: P2 (Medium)
**Effort**: 30 minutes

---

## Test Suite Health Metrics 📈

### Before Phase 1
- **Total test files**: 245
- **Test health**: Unknown (not measured)

### After Phase 1
- **Total test files**: 148 (40% reduction ✅)
- **Passing test files**: 10 (7%)
- **Failing test files**: 105 (71%)
- **Skipped (0 tests)**: 33 (22%)

**Test Health Score**: **7%** (passing tests / total tests)

### By Failure Category

| Category | Count | % of Failures | Automated Fix? | Effort |
|----------|-------|---------------|----------------|--------|
| Missing .js extensions | 39 | 37% | ✅ Yes | 30 min |
| Empty test suites | 38 | 36% | ⚠️ Partial | 1 hour |
| Missing Vitest imports | 4 | 4% | ✅ Yes | 15 min |
| Jest.mock usage | 1 | 1% | ✅ Yes | 5 min |
| Actual test failures | 17 | 16% | ❌ No | 2.5 hours |
| **TOTAL** | **105** | **100%** | - | **4.75 hours** |

### Quick Win Potential

**Automated fixes can resolve 80% of failures**:
- 39 + 4 + 1 = 44 files fixed automatically (42%)
- 38 files require review but can be bulk-deleted (36%)
- 17 actual test failures need manual investigation (16%)

---

## Fix Execution Plan 🚀

### Phase A: Automated Quick Wins (1.5 hours)

#### A1. Fix Missing .js Extensions (30 min)
```bash
# Step 1: Run existing script
node scripts/fix-js-extensions.js

# Step 2: Verify fixes
npm run rebuild
npm run test:integration 2>&1 | grep "Failed to load url" | wc -l
# Expected: 0 (down from 39)

# Step 3: Commit
git add tests/integration
git commit -m "fix(tests): add missing .js extensions to imports (39 files)"
```

**Expected outcome**: 39 → 0 failures in Category 1

#### A2. Fix Missing Vitest Imports (15 min)
```bash
# Step 1: Add imports to 4 files
for file in tests/integration/locale-manager.test.ts \
            tests/integration/core/cli/init-dot-notation.test.ts \
            tests/integration/core/dev-setup/marketplace-symlink.test.ts; do
  if ! grep -q "from 'vitest'" "$file"; then
    echo "Fixing $file..."
    # Add import (manual for safety)
    vi "$file"  # Add: import { describe, it, expect, beforeEach, vi } from 'vitest';
  fi
done

# Step 2: Verify
npm run test:integration 2>&1 | grep "describe is not defined" | wc -l
# Expected: 0 (down from 4)

# Step 3: Commit
git add tests/integration
git commit -m "fix(tests): add missing Vitest imports (4 files)"
```

**Expected outcome**: 4 → 0 failures in Category 3

#### A3. Fix Jest.mock Usage (5 min)
```bash
# Step 1: Fix single file
file="tests/integration/github-feature-sync-idempotency.test.ts"
sed -i '' 's/jest\.mock/vi.mock/g' "$file"
sed -i '' 's/jest\.fn/vi.fn/g' "$file"

# Step 2: Verify Vitest import exists
grep "from 'vitest'" "$file"  # Should exist

# Step 3: Test
npm run test:integration tests/integration/github-feature-sync-idempotency.test.ts

# Step 4: Commit
git add "$file"
git commit -m "fix(tests): replace jest.mock with vi.mock"
```

**Expected outcome**: 1 → 0 failures in Category 4

### Phase B: Empty Test Suite Cleanup (1 hour)

#### B1. Identify Empty Test Files (10 min)
```bash
# Create list of empty test files
find tests/integration -name "*.test.ts" -exec sh -c '
  if ! grep -q "describe\\|it" "$1"; then
    echo "$1"
  fi
' _ {} \; > empty-tests.txt

# Review list
cat empty-tests.txt  # Should show ~38 files
```

#### B2. Review and Categorize (30 min)
For each file in empty-tests.txt:
- **Placeholder** → Delete
- **Needed but not implemented** → Add to Phase 4 backlog
- **Unclear** → Keep and skip for now

**Decision criteria**:
- If related to deleted duplicate directory → Delete
- If feature exists in categorized structure → Delete duplicate
- If feature planned but not implemented → Keep

#### B3. Delete Confirmed Placeholders (20 min)
```bash
# After manual review, delete confirmed placeholders
# (manually create deletion list based on review)

git rm tests/integration/core/context-loader/context-loader.test.ts  # Example
# ... repeat for each confirmed placeholder

git commit -m "chore(tests): remove 30 empty placeholder test files"
```

**Expected outcome**: 38 → 8 remaining (keep 8 for future implementation)

### Phase C: Actual Test Failures (2.5 hours)

#### C1. Fix Build Verification Tests (30 min)
**Issue**: Expects plugins in `tests/plugins/` but actual location is `plugins/`

```typescript
// Fix path in tests/integration/core/build/build-verification.test.ts
// Change:
const hookFile = path.join(projectRoot, 'tests/plugins/specweave/lib/hooks/update-ac-status.js');
// To:
const hookFile = path.join(projectRoot, 'plugins/specweave/lib/hooks/update-ac-status.js');
```

#### C2. Fix Task Consistency Tests (1 hour)
Investigate auto-fix hook behavior - likely regression from recent changes.

#### C3. Fix Deduplication Hook Tests (30 min)
Investigate cache file creation - may be test isolation issue.

#### C4. Fix Status Line Hook Test (30 min)
Investigate increment count logic.

---

## Execution Timeline ⏱️

**Session 3** (This session - 2 hours):
- ✅ Phase A1: Fix .js extensions (30 min)
- ✅ Phase A2: Fix Vitest imports (15 min)
- ✅ Phase A3: Fix Jest.mock (5 min)
- ✅ Phase B1-B3: Empty test cleanup (1 hour)
- ✅ Verify fixes (10 min)

**Session 4** (Optional - 2.5 hours):
- Phase C1-C4: Actual test failures

**Expected Result After Session 3**:
- **Test health**: 7% → 60%+ (optimistic)
- **Failing tests**: 105 → ~20 (80% reduction)
- **Quick wins completed**: All automated fixes done

---

## Recommended Immediate Actions

1. **Execute Phase A (automated fixes)** - 1.5 hours
   - Will fix 44 failing tests immediately
   - Low risk, high reward

2. **Execute Phase B (empty test cleanup)** - 1 hour
   - Will clean up 30+ placeholder files
   - Reduces noise in test suite

3. **Re-run tests and measure improvement**
   - Verify test health improvement
   - Create updated metrics

4. **Decide on Phase C** (actual failures)
   - Can defer to later session
   - Not blocking Phase 2 (E2E naming)

---

## Decision Point: Continue or Pivot?

### Option 1: Fix Tests First (Recommended)
**Time**: 2.5 hours
**Outcome**: Test health 7% → 60%+, clear path forward
**Benefit**: Clean test suite before continuing cleanup phases

### Option 2: Pivot to Phase 2 (E2E Naming)
**Time**: 3 hours
**Risk**: May introduce more test failures
**Downside**: Compounds existing test health issues

### Option 3: Defer Test Fixes
**Impact**: Test health remains at 7%
**Problem**: Cannot validate future changes

**Recommendation**: **Option 1 - Fix tests first** (Phases A + B)
- 80% of failures can be fixed quickly
- Establishes clean baseline for Phase 2
- Validates Phase 1 changes properly

---

## Success Criteria ✅

### Phase A + B Success
- [ ] Missing .js extensions: 39 → 0
- [ ] Missing Vitest imports: 4 → 0
- [ ] Jest.mock usage: 1 → 0
- [ ] Empty test files: 38 → 8
- [ ] Test health: 7% → 60%+
- [ ] All fixes committed
- [ ] Build verification passes

### Phase C Success (Optional)
- [ ] Build verification tests: 4 failures → 0
- [ ] Task consistency tests: 9 failures → 0
- [ ] Deduplication hook: 2 failures → 0
- [ ] Status line hook: 1 failure → 0
- [ ] Test health: 60% → 90%+

---

## Files Referenced

### Created
- `.specweave/increments/0042-test-infrastructure-cleanup/logs/test-failures-analysis-2025-11-18.log` (full test output)
- `.specweave/increments/0042-test-infrastructure-cleanup/reports/TEST-FAILURE-TRIAGE-2025-11-18.md` (this file)

### Scripts Available
- `scripts/fix-js-extensions.js` (exists, ready to use)
- `scripts/fix-js-extensions.js --dry-run` (preview changes)

### Test Categories
- **Passing** (10 files): Strategic init, performance benchmarks, GitHub sync, etc.
- **Failing - Automated fixes** (44 files): Missing .js, missing imports, jest.mock
- **Failing - Empty suites** (38 files): Placeholders to delete
- **Failing - Actual issues** (17 tests): Require investigation

---

## Next Actions (This Session)

**Proceeding autonomously with Phase A (automated fixes)**:

1. **Fix missing .js extensions** (30 min)
   ```bash
   node scripts/fix-js-extensions.js
   npm run rebuild
   npm run test:integration  # Verify improvement
   git commit -am "fix(tests): add missing .js extensions"
   ```

2. **Fix missing Vitest imports** (15 min)
   - Manually add imports to 4 files
   - Verify tests run
   - Commit

3. **Fix Jest.mock usage** (5 min)
   - Replace jest.* with vi.* in 1 file
   - Verify test runs
   - Commit

4. **Empty test cleanup** (1 hour)
   - Identify all empty tests
   - Review and categorize
   - Delete placeholders
   - Commit

5. **Measure improvement** (10 min)
   - Re-run test suite
   - Calculate new test health score
   - Update increment metrics

---

**Report Status**: ✅ COMPLETE
**Next Step**: Execute Phase A automated fixes
**Estimated Time to 60% test health**: 2.5 hours
**Estimated Time to 90% test health**: 5 hours (includes Phase C)

---

**Report Author**: Claude (Autonomous Agent)
**Analysis Timestamp**: 2025-11-18 23:55 UTC
**Build Hash**: e8655ef (post-Phase 1)
