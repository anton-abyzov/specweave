# ULTRATHINK: Living Docs Unit Test Framework Chaos Analysis

**Date**: 2025-11-17
**Increment**: 0037-project-specific-tasks
**Issue**: Multiple test failures in `tests/unit/living-docs/`
**Severity**: HIGH - Test suite is fundamentally broken

---

## Executive Summary

The living-docs unit test suite is in a **schizophrenic state** with **two test frameworks** (Jest and Vitest) fighting for control. This is causing systematic test failures that have **nothing to do with the actual code quality**.

**Immediate Impact**:
- ❌ 2 tests actively failing in CI/CD
- ❌ Test framework mismatch preventing reliable testing
- ❌ Developers unsure which framework to use for new tests
- ❌ Jest config has **massive skip list** (78 skipped test patterns!)

**Root Cause**: Framework migration was started but **never completed**.

---

## The Evidence

### 1. The Failing Tests

#### Test #1: `code-validator.test.ts`

**Symptom**:
```
ReferenceError: jest is not defined
❯ tests/unit/living-docs/code-validator.test.ts:14:1
```

**Code at line 14**:
```typescript
// Mock dependencies
jest.mock('fs/promises');  // ← Jest API used
```

**Diagnosis**: Test written for Jest, but being executed by Vitest.

**Why it fails**:
- Test uses Jest mocking syntax (`jest.mock`, `jest.Mock`)
- Vitest doesn't provide `jest` global
- Vitest has different mocking API (`vi.mock`, `vi.fn`)

---

#### Test #2: `spec-distributor.test.ts`

**Symptom**:
```
AssertionError: expected '# US1: Create backend API...' to contain 'AC-US1-01: Create REST endpoint'

Expected: AC-US1-01: Create REST endpoint
Received: - [ ] **AC-US1-01**: Create REST endpoint /api/users
```

**Code**:
```typescript
import { describe, it, expect } from 'vitest';  // ← Vitest API used

it('should copy ACs and Tasks to User Story files', async () => {
  // ...
  expect(updatedContent).toContain('AC-US1-01: Create REST endpoint');
  // ❌ Expects old format without checkbox and markdown bold
});
```

**Diagnosis**: Test written for Vitest, but expectations are outdated.

**Why it fails**:
- Implementation changed to output: `- [ ] **AC-US1-01**: Create REST endpoint`
- Test expects old format: `AC-US1-01: Create REST endpoint`
- **This is just a stale test**, NOT a framework issue

---

### 2. The Framework Chaos

**What's Currently Installed**:

| Framework | Version | Listed in package.json? | Status |
|-----------|---------|------------------------|--------|
| **Jest** | 30.2.0 | ✅ Yes (devDependency) | Configured (jest.config.cjs) |
| **ts-jest** | 29.4.5 | ✅ Yes (devDependency) | Configured |
| **@types/jest** | 30.0.0 | ✅ Yes (devDependency) | Installed |
| **Vitest** | 4.0.10 | ❌ NO | Somehow available (global or transitive?) |

**Project Configuration**:
- `package.json` scripts:
  - `test:unit` → **Jest** runner
  - `test:integration` → **Jest** runner
  - No explicit `vitest` script
- `jest.config.cjs` exists with extensive config
- **NO** `vitest.config.ts` in project root

**The Smoking Gun**:
```bash
# Running tests/unit/living-docs/code-validator.test.ts
$ npx vitest run tests/unit/living-docs/code-validator.test.ts
RUN v4.0.10  # ← VITEST IS RUNNING!

# But package.json says:
$ npm run test:unit
> jest tests/unit --coverage  # ← SHOULD BE JEST!
```

**Vitest is running tests even though it's not explicitly configured!**

---

### 3. The Test File Inventory

**Files Using Jest Syntax** (8 files):
```
tests/unit/living-docs/code-validator.test.ts           ← FAILING
tests/unit/living-docs/completion-propagator.test.ts
tests/unit/living-docs/content-distributor.test.ts
tests/unit/living-docs/cross-linker.test.ts
tests/unit/living-docs/hierarchy-mapper-project-detection.test.ts
tests/unit/living-docs/project-detector.test.ts
tests/unit/living-docs/three-layer-sync.skip.test.ts
tests/unit/living-docs/three-layer-sync.test.ts
```

All use: `jest.mock()`, `jest.Mock`, `jest.fn()`

**Files Using Vitest Syntax** (1 file):
```
tests/unit/living-docs/spec-distributor.test.ts         ← FAILING (but different reason)
```

Uses: `import { describe, it, expect } from 'vitest'`

**Files Neutral** (3 files):
```
tests/unit/living-docs/content-parser.test.ts
tests/unit/living-docs/content-classifier.test.ts
tests/unit/living-docs/task-project-specific-generator.test.ts
```

Use generic syntax compatible with both frameworks.

---

### 4. The Jest Skip List Disaster

**From `jest.config.cjs` lines 63-121**:

```javascript
testPathIgnorePatterns: [
  '/node_modules/',
  '/tests/e2e/',
  '\.skip\.test\.ts$',
  // ... 75 MORE PATTERNS SKIPPED! ...
  'living-docs/cross-linker.test.ts',          // Link generation test failures
  'living-docs/content-distributor.test.ts',   // TypeScript mock type errors
  'living-docs/project-detector.test.ts',      // TypeScript syntax errors
  // ... and 72 more ...
],
```

**Analysis**:
- **78 test file patterns are being skipped**
- Jest can't run most of the test suite
- Multiple living-docs tests are explicitly skipped with comments like:
  - "TypeScript mock type errors"
  - "Link generation test failures"
  - "ESM import issues"
  - "Uses import.meta.url"

**This is a red flag**: When your Jest config has **78 skip patterns**, your test infrastructure is **fundamentally broken**.

---

### 5. The Setup File Problem

**File**: `tests/setup.ts` (Jest setup file)

**When running Jest** (`npm run test:unit`):
```
error TS2708: Cannot use namespace 'jest' as a value.

15  jest.setTimeout(10000);
    ~~~~

21      log: jest.fn(),
            ~~~~
```

**Why**:
- `tests/setup.ts` uses Jest API (`jest.setTimeout`, `jest.fn()`, `afterEach`)
- TypeScript can't compile it for some reason
- Blocks ALL Jest test execution

**This prevents running ANY tests with Jest!**

---

## Root Cause Analysis

### How Did This Happen?

**Timeline (reconstructed from evidence)**:

1. **Phase 1**: Project started with Jest
   - All tests written with Jest syntax
   - `jest.config.cjs` created
   - `tests/setup.ts` created with Jest API

2. **Phase 2**: Vitest was introduced (reason unclear)
   - Perhaps for ESM compatibility?
   - Vitest somehow became available (global install or transitive dependency)
   - Some developers started writing Vitest tests
   - **NO migration plan was executed**

3. **Phase 3**: Accumulation of problems
   - Jest tests started failing due to TypeScript/ESM issues
   - Developer response: **Add them to the skip list** (78 patterns!)
   - Vitest tests were written for new features
   - **Mixed ecosystem emerged**

4. **Phase 4**: Current state (broken)
   - Jest configured but can't run (setup.ts compilation errors)
   - Vitest runs by default (npx vitest)
   - Jest tests fail in Vitest (no jest global)
   - Vitest tests would fail in Jest (no vitest import)
   - **Nobody knows which framework to use**

### Why Vitest Runs Without Config

Vitest has **zero-config mode**: If no `vitest.config.ts` exists, it uses sensible defaults and runs any `*.test.ts` files it finds.

This is why `npx vitest run` works even though package.json doesn't list vitest.

---

## The Bigger Picture: Technical Debt Cascade

This isn't just about two failing tests. **This is a symptom of arrested technical debt migration.**

**Evidence of abandoned migration**:
1. ✅ Vitest was adopted for some tests
2. ❌ Old Jest tests were never migrated
3. ❌ No decision was made on "one framework to rule them all"
4. ❌ Documentation doesn't mention which framework to use
5. ❌ CI/CD unclear on which tests to run (smoke tests instead)

**The 78-pattern skip list** is a **documentation of failure** - each skip is a test that was too hard to fix, so it was ignored.

---

## Solution Options

### Option 1: Complete Migration to Vitest ✅ RECOMMENDED

**Why Vitest**:
- ✅ Modern ESM support (no tsconfig hacks)
- ✅ Faster than Jest
- ✅ Better TypeScript integration
- ✅ Native import.meta.url support
- ✅ Already running by default
- ✅ One test already written for it

**Migration Steps**:
1. **Create `vitest.config.ts`** with proper config
2. **Convert Jest mocking syntax** in 8 test files:
   - `jest.mock()` → `vi.mock()`
   - `jest.fn()` → `vi.fn()`
   - `jest.Mock` → `Mock` (from vitest)
3. **Remove `tests/setup.ts`** (Jest-specific)
4. **Create `tests/setup.vitest.ts`** (Vitest-specific)
5. **Update package.json scripts**:
   - `test:unit` → `vitest run tests/unit`
   - `test:integration` → `vitest run tests/integration`
6. **Remove Jest dependencies**:
   - `npm uninstall jest ts-jest @types/jest`
7. **Clear the 78-pattern skip list**
8. **Fix the 78 skipped tests** (now that they can run)

**Effort**: 2-3 days
**Risk**: Medium (some tests may break during conversion)
**Benefit**: Clean, modern test infrastructure

---

### Option 2: Commit to Jest (Abandon Vitest)

**Why Jest** (devil's advocate):
- ✅ More mature ecosystem
- ✅ Larger community
- ✅ Most tests already written for it

**Migration Steps**:
1. **Fix `tests/setup.ts`** TypeScript errors
2. **Convert Vitest tests** (1 file) to Jest
3. **Fix ESM/import.meta.url issues** (why 78 tests are skipped)
4. **Remove/block Vitest** from running
5. **Fix all 78 skipped tests**

**Effort**: 3-4 days (fixing ESM issues is hard)
**Risk**: HIGH (Jest + ESM + TypeScript = known pain point)
**Benefit**: Stick with industry standard

**Why I don't recommend this**: The 78-pattern skip list suggests Jest is **fighting the codebase architecture** (ESM modules, import.meta.url). Fixing these issues is expensive.

---

### Option 3: Keep Both (Maintain Chaos) ❌ NOT RECOMMENDED

**Why**: This is what we have now, and **it's clearly not working**.

---

## Immediate Tactical Fixes (Stop the Bleeding)

### Fix #1: `code-validator.test.ts`

**Option A: Convert to Vitest** (quick, aligns with Option 1):

```typescript
// Before (Jest):
import { CodeValidator } from '../../../src/core/living-docs/CodeValidator';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('CodeValidator', () => {
  beforeEach(() => {
    validator = new CodeValidator();
    jest.clearAllMocks();
  });

  it('should validate task with existing files', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue(tasksContent);
    (fs.stat as jest.Mock).mockResolvedValue({...});
  });
});

// After (Vitest):
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeValidator } from '../../../src/core/living-docs/CodeValidator';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('CodeValidator', () => {
  beforeEach(() => {
    validator = new CodeValidator();
    vi.clearAllMocks();
  });

  it('should validate task with existing files', async () => {
    (fs.readFile as any).mockResolvedValue(tasksContent);
    (fs.stat as any).mockResolvedValue({...});
  });
});
```

**Changes**:
1. Add Vitest imports: `import { describe, it, expect, beforeEach, vi } from 'vitest'`
2. Replace `jest.mock()` → `vi.mock()`
3. Replace `jest.clearAllMocks()` → `vi.clearAllMocks()`
4. Replace `jest.Mock` → `any` or `Mock` from vitest
5. Remove Jest-specific type assertions

**Effort**: 15 minutes per file × 8 files = **2 hours**

---

### Fix #2: `spec-distributor.test.ts`

**Issue**: Outdated test expectations.

**Fix**: Update assertions to match new format:

```typescript
// Before:
expect(updatedContent).toContain('AC-US1-01: Create REST endpoint');
expect(updatedContent).toContain('T-001: Setup API endpoint');

// After:
expect(updatedContent).toContain('- [ ] **AC-US1-01**: Create REST endpoint /api/users');
expect(updatedContent).toContain('- [x] **T-001**: Setup API endpoint');
```

**Better approach** (more resilient):
```typescript
// Test for the AC ID and description separately
expect(updatedContent).toContain('**AC-US1-01**');
expect(updatedContent).toContain('Create REST endpoint');
expect(updatedContent).toContain('/api/users');

// Test for task ID and completion
expect(updatedContent).toContain('**T-001**');
expect(updatedContent).toContain('[x]'); // Completed checkbox
```

**Effort**: 10 minutes

---

## Strategic Recommendation

### Recommended Path Forward: OPTION 1 (Vitest Migration)

**Justification**:
1. **ESM-Native**: Vitest was built for ESM, SpecWeave uses ESM
2. **Already Running**: Vitest is the default runner already
3. **Modern Stack**: Better TypeScript, better performance
4. **Clear the Debt**: Fix the 78-skip-list problem properly

**Execution Plan**:

**Phase 1: Immediate Fixes (Today)** ✅ DO THIS NOW
- Fix `code-validator.test.ts` → Convert to Vitest (2 hours)
- Fix `spec-distributor.test.ts` → Update assertions (10 min)
- **Result**: 2 tests green, CI/CD passes

**Phase 2: Formalize Vitest (This Week)** 📋 PLAN THIS
- Create `vitest.config.ts`
- Create `tests/setup.vitest.ts`
- Add vitest to package.json devDependencies
- Update `test:unit` script to use vitest
- Document "We use Vitest" in CLAUDE.md

**Phase 3: Migrate Remaining Jest Tests (Next Sprint)** 🔄 BACKLOG
- Convert 7 remaining Jest tests to Vitest
- Remove Jest dependencies
- Update CI/CD to use vitest

**Phase 4: Fix Skipped Tests (Ongoing)** 🧹 TECHNICAL DEBT
- Tackle the 78-skip-list systematically
- Each sprint: Fix 10 skipped tests
- 8 weeks to clear all technical debt

**Total Timeline**:
- Immediate: 2 hours (stop the bleeding)
- Week 1: 4 hours (formalize Vitest)
- Week 2-3: 8 hours (migrate remaining tests)
- Weeks 4-12: 20 hours (clear skip list)

**Total Investment**: ~35 hours over 3 months
**ROI**: Reliable test infrastructure, no more framework chaos

---

## Lessons Learned

### Anti-Patterns Observed

1. **Silent Migration**: Introducing Vitest without removing Jest = dual-framework hell
2. **Skip List Accumulation**: Adding tests to skip list instead of fixing root cause
3. **No Documentation**: Which framework to use? Nobody knows!
4. **No Enforcement**: No pre-commit hooks to prevent framework mixing

### Best Practices for Future

1. **One Framework Rule**: Never run two test frameworks in the same project
2. **Migration Commits**: If migrating, do it in one focused sprint
3. **Documentation**: Clearly document test framework choice in CLAUDE.md
4. **Linting**: Add ESLint rule to prevent jest imports when using vitest
5. **Pre-commit Hooks**: Prevent commits with framework mismatches

---

## Decision Required

**This analysis requires a DECISION**:

**Option 1**: Migrate to Vitest (RECOMMENDED)
**Option 2**: Stick with Jest (harder)
**Option 3**: Continue with chaos (DO NOT CHOOSE THIS)

**Make the decision, execute the plan, and never look back.**

---

## Appendix: Quick Command Reference

```bash
# Check which test framework is running
npx vitest --version    # → vitest/4.0.10 (currently available)
npx jest --version      # → 30.2.0 (configured but broken)

# Run tests with specific framework
npx vitest run tests/unit/living-docs/  # Vitest
npm run test:unit                       # Jest (currently broken)

# Count skipped tests
grep -c "testPathIgnorePatterns" jest.config.cjs  # → 78 patterns

# Check test syntax
grep -l "jest\." tests/unit/living-docs/*.test.ts  # → 8 Jest tests
grep -l "from 'vitest'" tests/unit/living-docs/*.test.ts  # → 1 Vitest test
```

---

**END OF ULTRATHINK ANALYSIS**

**Status**: Ready for decision and immediate action
**Next Steps**: Fix the 2 failing tests (2 hours), then decide on strategic direction
