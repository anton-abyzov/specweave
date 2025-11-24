# Integration Test Failures Analysis - 2025-11-18

## Executive Summary

**Status**: ✅ **Unit tests: 100% passing** (2222 passed, 47 skipped)
**Status**: ❌ **Integration tests: 46% failing** (89 failed, 296 passed)

**Root Cause**: Two distinct categories of failures:
1. **Status-line hook tests** (8 failures): Test setup creates `metadata.json` but hook reads from `spec.md`
2. **Build-verification tests** (2 unhandled errors): Test looks for hooks in wrong directory

**Impact**: Integration test suite unreliable, preventing CI/CD confidence

---

## Failure Category 1: Status-Line Hook Tests (8 failures)

### Root Cause

**The Problem**: Test/implementation contract mismatch

```typescript
// Test creates increment with metadata.json ONLY:
function createIncrement(id: string, status: string, tasksContent: string) {
  const metadata = { id, status, created: new Date().toISOString() };
  fs.writeFileSync('metadata.json', JSON.stringify(metadata));
  fs.writeFileSync('tasks.md', tasksContent);
  // ❌ MISSING: spec.md (hook's source of truth!)
}
```

```bash
# Hook reads status from spec.md YAML frontmatter (line 50):
status=$(grep -m1 "^status:" "$spec_file" | cut -d: -f2 | tr -d ' ')

# ❌ spec.md doesn't exist → status is empty → increment not detected as "open"
```

**Why This Matters**:
- Hook uses **spec.md as source of truth** (correct architecture decision from increment 0038)
- Test uses **metadata.json only** (outdated pattern)
- Result: Hook sees **zero open increments**, returns `current: null`

### Failing Tests

All in `tests/integration/features/status-line/update-status-line-hook.test.ts`:

1. **"should detect **Completed**: <date> format"** (line 89)
   - Expected: `cache.current.total` = 1
   - Actual: `cache.current` = `undefined` (because `current: null`)

2. **"should prioritize oldest increment"** (line 262)
   - Expected: `cache.current.id` = '0001-oldest'
   - Actual: `cache.current` = `undefined`

3. **"should count all open increments"** (line 277)
   - Expected: `cache.openCount` = 3
   - Actual: `cache.openCount` = 0 (no spec.md files!)

4. **"should handle increment with no tasks"** (line 289)
   - Expected: `cache.current.total` = 0
   - Actual: `cache.current` = `undefined`

5. **"should handle increment with all tasks complete"** (line 311)
   - Expected: `cache.current.total` = 2
   - Actual: `cache.current` = `undefined`

6. **"should handle tasks with emoji in headers"** (line 350)
   - Expected: `cache.current.total` = 3
   - Actual: `cache.current` = `undefined`

7. **"should handle tasks with complex headers"** (line 387)
   - Expected: `cache.current.total` = 3
   - Actual: `cache.current` = `undefined`

8. **"should write cache with correct schema"** (line 404)
   - Expected: `cache.current.id` exists
   - Actual: `TypeError: Cannot convert undefined or null to object`

9. **"should match actual increment 0037 format"** (line 489)
   - Expected: `cache.current.id` = '0037-project-specific-tasks'
   - Actual: `cache.current` = `undefined`

### Fix Required

**Update test helper** `createIncrement()` to create `spec.md`:

```typescript
function createIncrement(id: string, status: string, tasksContent: string) {
  const incrementDir = path.join(tempDir, '.specweave/increments', id);
  fs.mkdirSync(incrementDir, { recursive: true });

  // ✅ CREATE spec.md (hook's source of truth)
  const specContent = `---
increment: ${id}
status: ${status}
created: ${new Date().toISOString()}
---

# ${id}

Specification content.
`;
  fs.writeFileSync(path.join(incrementDir, 'spec.md'), specContent);

  // ✅ KEEP metadata.json (still useful)
  const metadata = {
    id,
    status,
    created: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(incrementDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // ✅ KEEP tasks.md
  fs.writeFileSync(path.join(incrementDir, 'tasks.md'), tasksContent);
}
```

**Why This Fix**:
- Aligns test with **actual hook implementation** (spec.md as source of truth)
- Matches production increment structure
- No changes needed to hook (hook is correct!)

---

## Failure Category 2: Build-Verification Unhandled Errors (2 errors)

### Root Cause

**The Problem**: Test imports hooks from wrong directory

```typescript
// ❌ WRONG: Test tries to import from tests/ directory
Error: Failed to load url /Users/.../specweave/tests/plugins/specweave/lib/hooks/update-ac-status.js
//                                              ^^^^^
//                                              WRONG LOCATION!

// ✅ CORRECT: Hook actually exists here
/Users/.../specweave/plugins/specweave/lib/hooks/update-ac-status.js
```

**Error Details**:

```
Unhandled Rejection: Error: Failed to load url
  /Users/antonabyzov/Projects/github/specweave/tests/plugins/specweave/lib/hooks/update-ac-status.js
  (resolved id: /Users/antonabyzov/Projects/github/specweave/tests/plugins/specweave/lib/hooks/update-ac-status.js).
  Does the file exist?

This error originated in "tests/integration/core/build/build-verification.test.ts"
```

### Investigation

**Hook files DO exist**:
```bash
$ ls plugins/specweave/lib/hooks/*.js
plugins/specweave/lib/hooks/auto-transition.js          ✅ EXISTS
plugins/specweave/lib/hooks/update-ac-status.js         ✅ EXISTS
plugins/specweave/lib/hooks/invoke-translator-skill.js  ✅ EXISTS
plugins/specweave/lib/hooks/translate-file.js           ✅ EXISTS
```

**Test expectations** (build-verification.test.ts:91-96):
```typescript
const hookFiles = [
  'plugins/specweave/lib/hooks/update-ac-status.js',
  'plugins/specweave/lib/hooks/auto-transition.js',
  'plugins/specweave/lib/hooks/invoke-translator-skill.js',
  'plugins/specweave/lib/hooks/translate-file.js'
];
```

**Mystery**: Test declares correct paths, but Vitest resolves to `tests/plugins/...`

### Hypothesis

**Potential causes**:
1. **Vitest configuration issue**: Incorrect `resolve.alias` or `root` setting
2. **Import statement resolution**: Test imports the hooks, triggering Vitest's module resolution
3. **Test working directory**: Test runs from wrong directory

### Fix Required

**Option A**: Check test imports
```typescript
// Does test import hooks directly?
// If so, imports should use absolute paths or PROJECT_ROOT
```

**Option B**: Verify Vitest config
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    root: process.cwd(), // ✅ Should be project root
    // ...
  }
});
```

**Option C**: Use correct import paths in test
```typescript
// ❌ WRONG (relative import from test file)
import { someHook } from '../../../plugins/specweave/lib/hooks/update-ac-status.js';

// ✅ CORRECT (absolute path from project root)
const hookPath = path.join(process.cwd(), 'plugins/specweave/lib/hooks/update-ac-status.js');
```

**Investigation needed**: Read build-verification.test.ts lines 104-128 to see how it imports hooks.

---

## Recommended Fix Order

### Phase 1: Status-Line Hook Tests (High Priority)
**Time**: 15 minutes
**Impact**: Fixes 8 test failures
**Risk**: Low (straightforward test fix)

1. Update `createIncrement()` helper to create `spec.md`
2. Run status-line tests: `npm run test:integration -- update-status-line-hook`
3. Verify all 8 tests pass

### Phase 2: Build-Verification Tests (Medium Priority)
**Time**: 30 minutes
**Impact**: Fixes 2 unhandled errors
**Risk**: Medium (needs investigation)

1. Read build-verification.test.ts imports section
2. Identify why Vitest resolves to `tests/plugins/`
3. Fix import paths or Vitest config
4. Run build tests: `npm run test:integration -- build-verification`
5. Verify no unhandled errors

### Phase 3: Other Integration Test Failures (Low Priority)
**Time**: 2-4 hours
**Impact**: Fixes remaining ~79 failures (estimate)
**Risk**: Unknown (need ultrathink analysis)

**Approach**:
1. Group failures by category (like we did here)
2. Identify root causes per category
3. Fix systematically (don't fix one-by-one!)

---

## Success Metrics

**Target**: ✅ 90%+ integration test pass rate

**Current**:
- Unit tests: **100%** (2222/2222) ✅
- Integration tests: **54%** (296/385) ❌

**After Phase 1**:
- Integration tests: **56%** (304/385) - 8 more passing

**After Phase 2**:
- Integration tests: **56%** (304/385) - No new passes, but unhandled errors gone

**After Phase 3** (estimate):
- Integration tests: **90%+** (346+/385) ✅

---

## Architecture Insights

### Why spec.md is Source of Truth (Increment 0038)

**Decision**: Use `spec.md` YAML frontmatter for increment status, not `metadata.json`

**Rationale**:
1. **Consistency**: spec.md always exists (mandatory), metadata.json can be missing
2. **Single source**: One file defines status (no sync issues)
3. **Human-readable**: Developers see status in spec.md (where they write specs)
4. **Git-friendly**: YAML frontmatter merges cleanly, JSON has trailing comma issues

**Impact on tests**: Tests MUST create spec.md, not just metadata.json

### Hook Import Path Architecture (See CLAUDE.md)

**Decision**: Hooks import from `dist/src/` (compiled), not `src/` (source)

**Rationale**:
1. **Production runtime**: Hooks run in Node.js (JavaScript), not TypeScript
2. **Build dependency**: Hooks depend on compiled output existing
3. **Type safety**: TypeScript types checked during compilation

**Test implications**:
- Tests should verify hooks CAN import from dist/
- Tests should NOT import hooks as ES modules (they're Node.js executables)
- Tests should execute hooks via `execSync()` or similar (not direct imports)

---

## Related Documentation

**Increment 0038**: Serverless architecture intelligence (introduced spec.md source of truth)
**Increment 0041**: Living docs test fixes (ultrathink analysis of test issues)
**Increment 0042**: Test infrastructure cleanup (this increment)

**CLAUDE.md Sections**:
- "Build & Test" → Testing framework (Vitest)
- "Build Architecture" → Hooks compilation (esbuild)
- "Test Isolation" → Critical test patterns

---

**Generated**: 2025-11-18
**Analyst**: Claude Code (Ultrathink Mode)
**Test Run**: `npm run test:unit --no-coverage` (100% pass) + `npm run test:integration --no-coverage` (54% pass)
