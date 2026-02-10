# E2E Test Infrastructure Fix - Technical Plan

## Executive Summary

Fix critical E2E test infrastructure issues preventing test execution. Primary focus: resolve Playwright/Vitest Symbol conflict and fix test discovery.

## Root Cause Analysis

### Issue 1: Symbol Conflict
**Problem**: `TypeError: Cannot redefine property: Symbol($$jest-matchers-object)`

**Root Cause**: Both Vitest and Playwright attempt to define Jest-compatible matchers on the same global Symbol. When both are loaded in the same process, they conflict.

**Location**: `/Users/antonabyzov/Projects/github/specweave/node_modules/@vitest/expect/dist/index.js:589:10`

### Issue 2: Test Discovery
**Problem**: "No tests found" despite test files existing

**Root Cause**:
1. Overly complex grep-invert pattern excludes too many tests
2. playwright.config.ts testMatch may not align with actual file structure
3. Mixed naming (.spec.ts vs .e2e.ts) causes confusion

## Technical Approach

### Phase 1: Resolve Symbol Conflict (US-001)

**Strategy**: Separate Playwright and Vitest execution contexts

**Options:**
1. **Option A (Recommended)**: Use Playwright's built-in test runner exclusively for E2E
   - Remove Vitest from E2E test imports
   - Use `@playwright/test` for assertions
   - Keep Vitest for unit/integration tests only

2. **Option B**: Isolate test runners with separate configs
   - Run E2E with playwright only
   - Ensure no vitest imports in E2E test files

**Implementation:**
```typescript
// ❌ BEFORE (causes conflict)
import { describe, it, expect } from 'vitest';
import { test } from '@playwright/test';

// ✅ AFTER (playwright only)
import { test, expect, describe } from '@playwright/test';
```

**Files to modify:**
- `tests/e2e/**/*.spec.ts` - Remove vitest imports, use playwright
- `tests/e2e/**/*.e2e.ts` - Same fix

### Phase 2: Fix Test Discovery (US-002)

**Strategy**: Standardize naming and simplify configuration

**Changes:**

1. **Playwright Config** (`playwright.config.ts`):
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',  // Simple pattern
  // Remove complex project-based filtering
});
```

2. **Package.json** test:e2e script:
```json
{
  "test:e2e": "playwright test"
  // Remove grep-invert complexity
}
```

3. **File naming standardization:**
   - Rename `*.e2e.ts` → `*.spec.ts`
   - Keep all E2E tests in `tests/e2e/`

**Files to modify:**
- `playwright.config.ts`
- `package.json`
- Rename files in `tests/e2e/auto/` and other subdirs

### Phase 3: Clean Up Configuration (US-003)

**Goals:**
- Simplify playwright.config.ts
- Document conventions
- Add developer-friendly scripts

**Implementation:**

1. **Simplified config:**
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  fullyParallel: false,  // Prevent flaky tests
  retries: 2,
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  }
});
```

2. **New npm scripts:**
```json
{
  "test:e2e": "playwright test",
  "test:e2e:watch": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:headed": "playwright test --headed"
}
```

3. **README.md** in tests/e2e/:
   - Naming conventions
   - How to write E2E tests
   - Running specific tests
   - Debugging tips

### Phase 4: Verify All Tests Pass (US-004)

**Strategy**: Systematic test fixing

**Process:**
1. Run full suite: `npm run test:e2e`
2. Identify failures
3. Fix each failing test:
   - Update selectors if stale
   - Fix assertions
   - Update test data
4. Re-run until 100% pass
5. Add to CI pipeline

## Testing Strategy

### Unit Tests
- No unit tests needed (infrastructure fix)

### Integration Tests
- Verify test runner executes without errors
- Verify test discovery finds all files

### E2E Tests (Self-testing)
- All existing E2E tests must pass
- Add meta-test: "E2E runner works correctly"

## Implementation Phases

### Phase 1: Quick Win (US-001) - 2 hours
1. Audit all E2E test files for vitest imports
2. Replace with playwright imports
3. Test for Symbol error elimination

### Phase 2: Discovery Fix (US-002) - 2 hours
1. Update playwright.config.ts
2. Simplify package.json script
3. Rename .e2e.ts files to .spec.ts
4. Verify discovery

### Phase 3: Cleanup (US-003) - 1 hour
1. Optimize config
2. Add new scripts
3. Write README.md

### Phase 4: Verification (US-004) - 3 hours
1. Run full suite
2. Fix failing tests one by one
3. Verify 100% pass rate
4. Update CI

**Total Estimate**: 8 hours (1 day)

## Files Requiring Changes

### Configuration Files
1. `playwright.config.ts` - Simplify testMatch
2. `package.json` - Update test:e2e script

### Test Files (Replace Imports)
1. `tests/e2e/ac-to-github-sync-flow.spec.ts`
2. `tests/e2e/auto/full-workflow.e2e.ts` → rename to .spec.ts
3. `tests/e2e/auto/stop-hook-reliability.e2e.ts` → rename to .spec.ts
4. `tests/e2e/crash-recovery.e2e.ts` → rename to .spec.ts
5. `tests/e2e/lsp/plugin-activation.spec.ts`
6. All other E2E test files

### Documentation
1. `tests/e2e/README.md` (create)

## Success Criteria

✅ No Symbol errors when running E2E tests
✅ All E2E tests discovered by playwright
✅ 100% E2E test pass rate
✅ Simplified, maintainable configuration
✅ Clear documentation for future E2E tests
✅ E2E tests passing in CI

## Risk Mitigation

**Risk**: Breaking existing tests during refactor
**Mitigation**: Test after each file change

**Risk**: Missing edge cases in test discovery
**Mitigation**: Compare file count before/after changes

**Risk**: CI pipeline failures
**Mitigation**: Test locally first, then update CI

## Rollback Plan

If issues arise:
1. Revert playwright.config.ts changes
2. Restore original package.json scripts
3. Keep import fixes (those are safe improvements)
