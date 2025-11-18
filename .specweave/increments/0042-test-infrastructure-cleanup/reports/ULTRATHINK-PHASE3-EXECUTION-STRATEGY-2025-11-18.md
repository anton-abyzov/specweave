# ULTRATHINK: Phase 3 Execution Strategy
**Date**: 2025-11-18
**Phase**: 3 (Test Isolation Fixes)
**Status**: PLANNING
**Autonomous Execution**: YES

---

## Executive Summary

**Goal**: Eliminate 112 dangerous `process.cwd()` usages in tests to prevent catastrophic .specweave/ deletion

**Current State**:
- process.cwd() usages: **112** (down from 213 - some cleanup already done)
- Tests using safe pattern (createIsolatedTestDir): **0**
- Utility exists: ✅ YES (`tests/test-utils/isolated-test-dir.ts`)
- ESLint rule: ❌ NO
- Pre-commit hook: ❌ NO (current hook exists but doesn't check this)

**Target State**:
- process.cwd() usages: **0**
- Tests using safe pattern: **112** (100%)
- ESLint rule: ✅ YES (blocks future violations)
- Pre-commit hook: ✅ YES (double protection)

**Critical Risk**: Tests with `process.cwd() + fs.rm()` can delete entire project .specweave/ folder containing all work

**Historical Incident**: 2025-11-17 - Test deleted 1,200+ files from project. All recovered via git restore, but this MUST NEVER happen again.

---

## Phase 3 Task Breakdown

### T-006: Audit All process.cwd() Usages (~30 min)
**Status**: Execute first
**Actions**:
1. Run comprehensive grep audit
2. Categorize by risk level (high/medium/low)
3. Identify top 10 most dangerous (with fs.rm)
4. Generate audit report
5. Save to increment reports/

**Output**: `unsafe-tests-audit.txt`, `unsafe-tests-high-danger.txt`

### T-007: Fix Top 10 Most Dangerous Tests (~2 hours)
**Status**: After T-006
**Strategy**: Manual fix (each test is unique)
**Risk**: HIGH - These tests can delete .specweave/
**Actions**:
1. For each of top 10:
   - Add createIsolatedTestDir import
   - Replace process.cwd() with testDir
   - Wrap in try/finally with cleanup
   - Test individually
   - Commit individually

**Estimated**: 10-15 minutes per test = 2-2.5 hours

### T-008: Batch Migrate Remaining Tests (~3-4 hours)
**Status**: After T-007
**Strategy**: Semi-automated batch approach
**Risk**: MEDIUM - Still unsafe but lower deletion risk
**Actions**:
1. Get list of remaining unsafe tests (112 - 10 = 102)
2. Use pattern matching for common cases
3. Manual fix for unique cases
4. Test in batches of 10-20
5. Commit in batches

**Optimization**: Group by similar test patterns

### T-009: Add ESLint Rule and Pre-commit Hook (~30 min)
**Status**: After T-008
**Strategy**: Prevention layer
**Actions**:
1. Add ESLint no-restricted-syntax rule
2. Update pre-commit hook script
3. Test both mechanisms
4. Document in CLAUDE.md

**Critical**: This prevents regression

### T-010: Final Validation and Commit (~30 min)
**Status**: Final step
**Actions**:
1. Verify 0 process.cwd() usages
2. Run full test suite
3. Run ESLint
4. Comprehensive commit message
5. Reference 2025-11-17 incident

---

## Execution Strategy

### Strategy A: Sequential (Conservative)
**Approach**: T-006 → T-007 → T-008 → T-009 → T-010
**Pros**: Safe, methodical, easy to track
**Cons**: Slow (~6-7 hours total)
**Risk**: LOW

### Strategy B: Parallel Where Possible (Optimized)
**Approach**:
1. T-006 (audit) - 30min
2. T-007 + T-008 combined (smart batching) - 3-4 hours
3. T-009 (prevention) - 30min
4. T-010 (validation) - 30min
**Pros**: Faster (~4.5-5.5 hours)
**Cons**: Requires careful orchestration
**Risk**: MEDIUM

### Strategy C: Risk-Based Triage (RECOMMENDED)
**Approach**:
1. T-006: Audit + triage by risk (30min)
2. Fix HIGH risk first (with fs.rm) - 2 hours
3. Fix MEDIUM risk (batch) - 2 hours
4. Fix LOW risk (batch) - 1 hour
5. T-009: Prevention - 30min
6. T-010: Validation - 30min
**Total**: ~6 hours
**Pros**: Eliminates highest risk first, methodical
**Cons**: Slightly longer than Strategy B
**Risk**: LOW

**DECISION**: Use Strategy C (Risk-Based Triage)

**Why?**
- ✅ Eliminates catastrophic risk first
- ✅ Provides natural checkpoints
- ✅ Easier to commit incrementally
- ✅ Clear progress tracking
- ✅ Lower error rate (no rushing)

---

## Risk Analysis

### Risk 1: Breaking Tests During Migration
**Probability**: MEDIUM
**Impact**: HIGH (could block development)
**Mitigation**:
- ✅ Test each fix individually before batching
- ✅ Run test suite after each batch
- ✅ Commit frequently (easy rollback)
- ✅ Keep original audit list for reference

### Risk 2: Missing edge cases in automation
**Probability**: HIGH
**Impact**: MEDIUM (some tests still unsafe)
**Mitigation**:
- ✅ Final grep audit (must be 0)
- ✅ ESLint rule catches future violations
- ✅ Pre-commit hook as second line of defense
- ✅ Manual review of complex tests

### Risk 3: New process.cwd() added during migration
**Probability**: LOW
**Impact**: LOW (would be caught by final audit)
**Mitigation**:
- ✅ Work on isolated branch
- ✅ Final validation step (T-010)
- ✅ ESLint will catch in future

### Risk 4: Utility has bugs
**Probability**: LOW
**Impact**: HIGH (could cause test failures)
**Mitigation**:
- ✅ Utility already exists and looks well-tested
- ✅ Test migration in small batches first
- ✅ Validate cleanup works correctly

---

## Pattern Analysis (for Batch Migration)

### Pattern 1: Simple Directory Reference
**Count**: ~60 tests (estimated)
**Example**:
```typescript
const projectRoot = process.cwd();
const incrementPath = path.join(projectRoot, '.specweave', 'increments');
```

**Fix Template**:
```typescript
const { testDir, cleanup } = await createIsolatedTestDir('test-name');
try {
  const incrementPath = path.join(testDir, '.specweave', 'increments');
  // ... test code
} finally {
  await cleanup();
}
```

**Automation**: Semi-automated (can use sed with patterns)

### Pattern 2: With FS Operations
**Count**: ~40 tests (estimated)
**Example**:
```typescript
const projectRoot = process.cwd();
await fs.writeFile(path.join(projectRoot, '.specweave', 'file.md'), content);
```

**Fix**: Same as Pattern 1 + ensure cleanup
**Risk**: MEDIUM (creates files in project)

### Pattern 3: With Deletion (HIGH DANGER)
**Count**: ~10-12 tests (estimated)
**Example**:
```typescript
const projectRoot = process.cwd();
await fs.rm(path.join(projectRoot, '.specweave'), { recursive: true });
```

**Fix**: CRITICAL - highest priority
**Risk**: CRITICAL (can delete entire .specweave/)

### Pattern 4: Complex/Unique
**Count**: ~5-10 tests (estimated)
**Example**: Custom logic, multiple paths, conditional logic
**Fix**: Manual case-by-case
**Risk**: MEDIUM

---

## Efficiency Optimizations

### Optimization 1: Batch Grep Audits
Instead of running grep 112 times, generate complete list once:
```bash
grep -rn "process\.cwd()" tests/ --include="*.test.ts" > all-unsafe-tests.txt
```

Then process the list programmatically.

### Optimization 2: Pattern-Based Sed Replacements
For simple cases (Pattern 1), use sed:
```bash
find tests/ -name "*.test.ts" -exec sed -i.bak \
  's/process\.cwd()/testDir/g' {} \;
```

**CAUTION**: Only for simple patterns, manual review required

### Optimization 3: Parallel Test Execution
After migration, run tests in parallel:
```bash
npm run test:integration -- --reporter=json > results.json &
npm run test:unit -- --reporter=json > results-unit.json &
wait
```

### Optimization 4: Smart Batching
Group tests by directory for batch commits:
```bash
# Commit all core/ tests together
git add tests/integration/core/
git commit -m "fix: safe isolation for core tests (batch 1/5)"
```

---

## Validation Checkpoints

### Checkpoint 1: After T-006 (Audit)
- [ ] Audit file generated
- [ ] High-danger tests identified (expected: ~10-12)
- [ ] Total unsafe count matches grep (expected: 112)

### Checkpoint 2: After T-007 (Top 10)
- [ ] 10 most dangerous tests fixed
- [ ] All 10 tests passing
- [ ] process.cwd() count: 112 → ~102

### Checkpoint 3: After T-008 (Batch Migration)
- [ ] All remaining tests fixed
- [ ] process.cwd() count: 0
- [ ] All tests passing (100% pass rate)

### Checkpoint 4: After T-009 (Prevention)
- [ ] ESLint rule active
- [ ] Pre-commit hook updated
- [ ] Both mechanisms tested and working

### Checkpoint 5: Final (T-010)
- [ ] Zero process.cwd() in tests (verified)
- [ ] All tests passing
- [ ] ESLint clean
- [ ] Comprehensive commit
- [ ] Documentation updated

---

## Autonomous Execution Plan

### Phase 1: Preparation (T-006) - 30 minutes
1. Run comprehensive audit
2. Generate risk-categorized list
3. Identify top 10 high-danger tests
4. Save audit reports
5. Create execution tracker

### Phase 2: High-Risk Elimination (T-007) - 2 hours
1. Fix test 1 → test → commit
2. Fix test 2 → test → commit
3. ... (repeat for all 10)
4. Update progress tracker
5. Verify process.cwd() count reduced

### Phase 3: Batch Migration (T-008) - 3 hours
1. Group remaining tests by pattern
2. Migrate Pattern 1 tests (batch 1)
3. Test batch 1 → commit
4. Migrate Pattern 2 tests (batch 2)
5. Test batch 2 → commit
6. Migrate remaining (manual)
7. Final verification: grep count = 0

### Phase 4: Prevention (T-009) - 30 minutes
1. Add ESLint rule to .eslintrc.js
2. Test ESLint rule (create temp unsafe test)
3. Update pre-commit hook
4. Test pre-commit hook (attempt unsafe commit)
5. Document both mechanisms in CLAUDE.md

### Phase 5: Validation & Commit (T-010) - 30 minutes
1. Run final grep audit (must be 0)
2. Run full test suite (must be 100%)
3. Run ESLint (must pass)
4. Create comprehensive commit message
5. Update tasks.md (mark T-006 through T-010 complete)
6. Generate completion report

**Total Estimated Time**: ~6 hours

---

## Success Criteria

### Must Have (Mandatory)
- ✅ Zero process.cwd() usages in tests
- ✅ All tests passing (100% pass rate)
- ✅ ESLint rule active and tested
- ✅ Pre-commit hook updated and tested
- ✅ All 5 tasks (T-006 through T-010) complete

### Should Have (Important)
- ✅ Comprehensive audit report saved
- ✅ Migration documented in increment reports
- ✅ CLAUDE.md updated with new guidelines
- ✅ Individual commits for high-risk fixes
- ✅ Batch commits for remaining fixes

### Nice to Have (Optional)
- ✅ Migration statistics (before/after)
- ✅ Pattern analysis documented
- ✅ Lessons learned captured
- ✅ Reusable migration scripts created

---

## Rollback Plan

### If Critical Error Occurs

**Scenario 1**: Test suite fails after migration
```bash
# Rollback to last good commit
git reset --hard HEAD~1
# Investigate failure
# Fix and retry
```

**Scenario 2**: ESLint or hook breaks build
```bash
# Remove problematic rule temporarily
# Fix configuration
# Re-enable with fix
```

**Scenario 3**: Process.cwd() count doesn't reach 0
```bash
# Re-run audit to find remaining cases
# Manual fix for edge cases
# Update automation for future
```

---

## Post-Execution Actions

1. **Update CLAUDE.md** with test isolation guidelines
2. **Update tasks.md** progress (11/18 tasks = 61%)
3. **Create completion report** in increment reports/
4. **Run /specweave:sync-docs** to update living documentation
5. **Create PR** if working on branch (optional)

---

## Expected Outcomes

**Before Phase 3**:
- process.cwd() usages: 112
- Catastrophic deletion risk: CRITICAL
- Test isolation: 0%
- Prevention mechanisms: None

**After Phase 3**:
- process.cwd() usages: 0 ✅
- Catastrophic deletion risk: ELIMINATED ✅
- Test isolation: 100% ✅
- Prevention mechanisms: 2 layers (ESLint + hook) ✅

**Annual Impact**:
- Developer confidence: ↑ HIGH
- Test safety: ↑ 100%
- Accidental deletions: 0 (prevented)
- Time saved on recovery: ~10 hours/year (incident prevention)

---

**Status**: READY TO EXECUTE
**Strategy**: Risk-Based Triage (Strategy C)
**Estimated Duration**: ~6 hours
**Next Action**: Begin T-006 (Audit)

---

**Report Author**: Claude (Autonomous Agent)
**Analysis Timestamp**: 2025-11-18
**Approval**: AUTO-APPROVED (autonomous execution authorized)
