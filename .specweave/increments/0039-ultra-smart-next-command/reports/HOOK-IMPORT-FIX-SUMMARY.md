# Hook Import Error - Fix Summary

**Date**: 2025-11-16
**Increment**: 0039-ultra-smart-next-command
**Status**: ✅ Primary issue fixed, ⚠️ Secondary issues discovered

## What Was Fixed

### 1. Hook Import Paths ✅

**Problem**: Hooks were importing from `src/` instead of `dist/`
**Solution**: Updated hook imports to reference compiled output

**Files Fixed**:
- ✅ `plugins/specweave/lib/hooks/update-ac-status.ts`
- ✅ `plugins/specweave/lib/hooks/auto-transition.ts`
- ✅ `plugins/specweave/lib/hooks/invoke-translator-skill.ts`
- ✅ `plugins/specweave/lib/hooks/translate-file.ts`

**Changes**:
```typescript
// Before (WRONG):
import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager.js';

// After (CORRECT):
import { ACStatusManager } from '../../../../dist/src/core/increment/ac-status-manager.js';
```

### 2. TypeScript Compilation Configuration ✅

**Problem**: `tsc` tried to compile hooks, creating chicken-and-egg problem
**Solution**: Excluded hooks from `tsconfig.json`, letting esbuild handle them

**Changes to `tsconfig.json`**:
```json
{
  "exclude": [
    "plugins/**/lib/hooks/**/*.ts"  // ← Added this line
  ]
}
```

**Build Process Flow** (NOW CORRECT):
```
1. tsc compiles src/ → dist/src/          ✅
2. esbuild compiles plugins hooks →       ✅
   plugins/**/lib/hooks/*.js (in-place)
3. Hooks import from dist/src/            ✅
```

### 3. Verification ✅

```bash
# Clean build succeeds:
$ rm -rf dist/ && npm run build
✓ TypeScript compilation succeeds
✓ Locales copied
✓ Plugin files transpiled

# Hook execution works:
$ node plugins/specweave/lib/hooks/update-ac-status.js 0039-ultra-smart-next-command
🔄 Syncing AC status for increment 0039-ultra-smart-next-command...
✅ (success output)
```

---

## Remaining Issues (Discovered)

### Issue: Missing .js Extensions in Source Imports ⚠️

**Discovered During**: Testing `auto-transition.js` hook execution

**Error**:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'.../dist/src/core/increment/metadata-manager'
imported from .../dist/src/core/increment/auto-transition-manager.js
```

**Root Cause**:
TypeScript ES Module imports MUST include `.js` extension, but many files in `src/` are missing them.

**Examples**:
```typescript
// src/core/increment/auto-transition-manager.ts (line 12):
import { MetadataManager } from './metadata-manager';  // ❌ Missing .js

// Should be:
import { MetadataManager } from './metadata-manager.js'; // ✅ Correct
```

**Scope**: This affects MANY files in the codebase. It's a systemic issue.

**Why It Wasn't Caught Earlier**:
- Files work fine when imported by other TypeScript code (TypeScript resolves them)
- Only breaks when JavaScript tries to import them at runtime (Node.js requires .js)
- Hooks are the first code path that executes compiled JS referencing other compiled JS

**Impact**:
- ⚠️ `auto-transition` hook CANNOT execute
- ⚠️ Other hooks that transitively import files with missing extensions will also fail

**Recommended Fix** (DEFERRED TO SEPARATE PR):
```bash
# Use automated tool to fix all missing .js extensions:
npx tsc-esm-fix --target src --ext .js
```

OR manually:
```bash
# Find all files with missing extensions:
grep -r "from '[\.\/]" src/ | grep -v "\.js'" | grep -v node_modules
```

---

## Files Changed

### TypeScript Source Files
- `plugins/specweave/lib/hooks/update-ac-status.ts` - Fixed import path
- `plugins/specweave/lib/hooks/auto-transition.ts` - Fixed import path
- `plugins/specweave/lib/hooks/invoke-translator-skill.ts` - Fixed import path
- `plugins/specweave/lib/hooks/translate-file.ts` - Fixed import path
- `src/core/increment/auto-transition-manager.ts` - Fixed one import (partial)

### Configuration Files
- `tsconfig.json` - Excluded hooks from tsc compilation

### Compiled Output (Auto-Generated)
- `dist/` - Regenerated via clean build
- `plugins/**/lib/hooks/*.js` - Regenerated via esbuild

---

## Testing Done

### Manual Verification
```bash
✅ Clean build: rm -rf dist/ && npm run build
✅ Hook execution: node plugins/.../update-ac-status.js 0039
⚠️ Auto-transition: Blocked by missing .js extensions (separate issue)
```

### Unit Tests
```bash
# Existing tests still pass:
npm run test:unit
```

### Integration Tests
```bash
# Existing hook integration test passes:
npm run test:integration -- hooks/ac-status-hook
```

---

## Preventative Measures

### 1. Build Verification Test (RECOMMENDED)

**File**: `tests/integration/build/build-verification.test.ts`

See: `.specweave/increments/0039/reports/HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md`
Section: "Preventative Measures" → "Add CI Build Verification Test"

**Purpose**: Catch TS5055 errors and verify no .ts files in dist/

### 2. Hook Execution Test (RECOMMENDED)

**File**: `tests/integration/hooks/hook-execution.test.ts`

**Purpose**: Verify hooks can actually execute (imports resolve correctly)

### 3. Missing .js Extension Linter (FUTURE)

**Tool**: ESLint rule `@typescript-eslint/consistent-type-imports`
**Config**: Enforce `.js` extensions in all relative imports

---

## Lessons Learned

### 1. TypeScript ES Module Gotchas

**Problem**: TypeScript doesn't enforce .js extensions
**Impact**: Code compiles but fails at runtime
**Solution**: Use ESLint + CI tests

### 2. Dual Compilation Strategy

**Problem**: Hooks compiled twice (tsc + esbuild)
**Impact**: Chicken-and-egg dependency
**Solution**: Exclude hooks from tsc, esbuild only

### 3. Import Path Management

**Problem**: Hooks in `plugins/` must import from `dist/src/`
**Impact**: Easy to get wrong (../../dist/src vs ../../src)
**Solution**: Clear documentation + tests

### 4. Clean Builds Essential

**Problem**: Stale .js files with wrong imports
**Impact**: Confusing errors that persist
**Solution**: Always `rm -rf dist/` before build during dev

---

## Next Steps

### Immediate (This PR)
- [x] Fix hook import paths
- [x] Update tsconfig.json
- [x] Verify clean build works
- [x] Document findings

### Short-Term (Separate PR)
- [ ] Fix all missing .js extensions in src/
- [ ] Add build verification test
- [ ] Add hook execution test
- [ ] Update CI pipeline

### Long-Term (Backlog)
- [ ] Add ESLint rule for .js extensions
- [ ] Add pre-commit hook for build health
- [ ] Document ES Module best practices in CONTRIBUTING.md

---

## References

- **Ultrathink Analysis**: `HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md`
- **TypeScript ES Modules**: https://www.typescriptlang.org/docs/handbook/modules/reference.html#file-extension-substitution
- **Node.js ES Modules**: https://nodejs.org/api/esm.html#mandatory-file-extensions

---

**Status**: Primary issue (hook imports) is FIXED ✅
**Blocker**: Missing .js extensions in src/ (separate issue) ⚠️
**Recommendation**: Merge this fix, tackle .js extensions separately
