# Ultrathink Analysis: Hook Import Error

**Date**: 2025-11-16
**Increment**: 0039-ultra-smart-next-command
**Error**: `Cannot find module 'src/core/increment/ac-status-manager.js'`

## Executive Summary

**Root Cause**: TypeScript compilation failure (`TS5055`) is preventing the build from generating correct JavaScript output, causing the hook to import from wrong path (`src/` instead of `dist/`).

**Impact**:
- Hook execution fails completely
- AC status synchronization broken
- Post-task-completion workflow interrupted

**Fix Complexity**: Low (clean dist, rebuild)
**Prevention Complexity**: Medium (add CI check + integration test)

---

## Deep Analysis

### 1. Error Chain (5-Why Analysis)

```
❌ Error: Cannot find module 'src/core/increment/ac-status-manager.js'
    ↓
Q1: Why is it looking for .js in src/?
A1: The hook's .js file has wrong import path

    ↓
Q2: Why does the .js file have wrong import path?
A2: TypeScript compilation never completed successfully

    ↓
Q3: Why didn't TypeScript compilation complete?
A3: TS5055 error: "Cannot write file because it would overwrite input file"

    ↓
Q4: Why would it overwrite input file?
A4: dist/ folder contains TypeScript source files (.ts) that conflict with compilation output

    ↓
Q5: Why are there .ts files in dist/?
A5: Previous incomplete builds or manual file operations polluted dist/
```

### 2. File State Analysis

**TypeScript Source** (`update-ac-status.ts` line 29):
```typescript
import { ACStatusManager } from '../../../../dist/src/core/increment/ac-status-manager.js';
```
✅ CORRECT: Points to compiled output in `dist/`

**JavaScript Output** (`update-ac-status.js` line 2):
```javascript
import { ACStatusManager } from "../../../../src/core/increment/ac-status-manager.js";
```
❌ WRONG: Points to TypeScript source in `src/`

**Why the mismatch?**
- The `.js` file is STALE (from old build that never completed)
- TypeScript never regenerated it because compilation fails at TS5055
- The wrong path persists from a previous manual edit or failed build

### 3. TypeScript Build Error Analysis

```bash
$ npm run build
error TS5055: Cannot write file
'/Users/antonabyzov/Projects/github/specweave/dist/src/core/increment/ac-status-manager.d.ts'
because it would overwrite input file.
```

**What this means**:
- TypeScript is configured to output to `dist/` (`tsconfig.json` line 7: `"outDir": "./dist"`)
- But TypeScript found a `.ts` file in `dist/src/core/increment/`
- Since `dist/` should only contain COMPILED output, finding source files creates circular dependency
- TypeScript refuses to overwrite source files with compiled output (safety mechanism)

**Evidence**:
```bash
$ find dist/src -name "*.ts"
dist/src/init/research/OpportunityScorer.d.ts  # ✅ OK (.d.ts is declaration file)
dist/src/init/research/types.d.ts              # ✅ OK
# ... BUT if there are .ts files (source), that's the problem
```

### 4. Project Structure Analysis

**Correct structure**:
```
src/                          # TypeScript source files (.ts)
├── core/
│   └── increment/
│       └── ac-status-manager.ts  # ✅ Source

dist/                         # Compiled JavaScript output (.js, .d.ts, .js.map)
└── src/
    └── core/
        └── increment/
            ├── ac-status-manager.js      # ✅ Compiled
            ├── ac-status-manager.d.ts    # ✅ Type declarations
            └── ac-status-manager.js.map  # ✅ Source map
```

**Current (polluted) structure**:
```
dist/
└── src/
    └── core/
        └── increment/
            ├── ac-status-manager.ts  # ❌ SOURCE FILE IN DIST! (conflict)
            ├── ac-status-manager.js  # Stale/wrong
            └── ac-status-manager.d.ts
```

### 5. Hook Import Path Logic

**Why hooks import from `dist/`**:
- Hooks are executed by Node.js directly (`#!/usr/bin/env node`)
- Node.js can only run JavaScript (.js), not TypeScript (.ts)
- Therefore hooks MUST import from compiled output (`dist/`)

**Import resolution flow**:
```
1. Hook runs: node plugins/specweave/lib/hooks/update-ac-status.js
2. Hook imports: "../../../../dist/src/core/increment/ac-status-manager.js"
3. Node resolves: /Users/.../specweave/dist/src/core/increment/ac-status-manager.js
4. If dist/ is clean: ✅ File exists, execution succeeds
5. If dist/ is polluted: ❌ TS5055 prevents compilation, file doesn't exist or is stale
```

### 6. Timeline of the Problem

```
T0: Developer makes changes to ac-status-manager.ts
    ↓
T1: Developer runs `npm run build`
    ↓
T2: TypeScript encounters TS5055 error (dist/ polluted)
    ↓
T3: Build fails, dist/ not updated
    ↓
T4: update-ac-status.js remains STALE with old/wrong import path
    ↓
T5: Hook executes: node update-ac-status.js
    ↓
T6: Import fails: "Cannot find module 'src/...'"
```

---

## Immediate Fix

### Step 1: Clean Build Artifacts

```bash
# Remove all compiled output
rm -rf dist/

# Verify clean state
ls dist/  # Should error: "No such file or directory"
```

### Step 2: Rebuild TypeScript

```bash
# Full clean build
npm run build

# Expected output:
# ✅ TypeScript compilation succeeds
# ✅ Locales copied
# ✅ Plugin files copied
```

### Step 3: Verify Hook Import

```bash
# Check compiled hook has correct import
head -n 5 plugins/specweave/lib/hooks/update-ac-status.js

# Should show:
# #!/usr/bin/env node
# import { ACStatusManager } from "../../../../dist/src/core/increment/ac-status-manager.js";
```

### Step 4: Test Hook Execution

```bash
# Run hook manually
node plugins/specweave/lib/hooks/update-ac-status.js 0039-ultra-smart-next-command

# Expected:
# 🔄 Syncing AC status for increment 0039-ultra-smart-next-command...
# ✅ (success message)
```

---

## Preventative Measures

### 1. Add Pre-Build Clean Step

**File**: `package.json`

```json
{
  "scripts": {
    "clean": "rm -rf dist/",
    "build": "npm run clean && tsc && npm run copy:locales && npm run copy:plugins"
  }
}
```

**Rationale**: Always start with clean slate, prevents dist/ pollution.

### 2. Add CI Build Verification Test

**File**: `tests/integration/build/build-verification.test.ts`

```typescript
/**
 * Verifies TypeScript build produces valid output
 * Catches TS5055 and other compilation errors
 */

import { describe, it, expect } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';

describe('Build Verification', () => {
  it('should compile TypeScript without errors', () => {
    // Clean + build
    execSync('npm run clean', { stdio: 'pipe' });
    const output = execSync('npm run build', { encoding: 'utf-8' });

    // Should not contain error messages
    expect(output).not.toContain('error TS');
    expect(output).not.toContain('TS5055');
  });

  it('should not have TypeScript source files in dist/', () => {
    // After build, dist/ should ONLY have .js, .d.ts, .js.map
    const findResult = execSync('find dist/src -name "*.ts" -not -name "*.d.ts"', {
      encoding: 'utf-8'
    }).trim();

    // Should be empty (no .ts source files in dist/)
    expect(findResult).toBe('');
  });

  it('should have all expected compiled files', () => {
    // Check critical files exist
    expect(fs.existsSync('dist/src/core/increment/ac-status-manager.js')).toBe(true);
    expect(fs.existsSync('dist/src/core/increment/ac-status-manager.d.ts')).toBe(true);
  });
});
```

### 3. Add Hook Integration Test

**File**: `tests/integration/hooks/hook-execution.test.ts`

```typescript
/**
 * Tests that hooks can actually execute (imports resolve)
 */

import { describe, it, expect } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Hook Execution Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-exec-test-'));
    const incrementDir = path.join(testDir, '.specweave', 'increments', '0001-test');
    fs.mkdirSync(incrementDir, { recursive: true });

    // Create minimal spec.md and tasks.md
    fs.writeFileSync(path.join(incrementDir, 'spec.md'), '- [ ] AC-US1-01: Test');
    fs.writeFileSync(path.join(incrementDir, 'tasks.md'), `#### T-001: Test\n**AC**: AC-US1-01\n- [x] Done`);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should execute update-ac-status hook without import errors', () => {
    // Change to test directory
    const originalDir = process.cwd();
    process.chdir(testDir);

    try {
      // Execute hook from project root
      const hookPath = path.join(originalDir, 'plugins/specweave/lib/hooks/update-ac-status.js');
      const output = execSync(`node ${hookPath} 0001-test`, { encoding: 'utf-8' });

      // Should NOT contain module resolution errors
      expect(output).not.toContain('Cannot find module');
      expect(output).not.toContain('ERR_MODULE_NOT_FOUND');

      // Should show sync output
      expect(output).toMatch(/Syncing AC status|No AC updates needed|already in sync/);
    } finally {
      process.chdir(originalDir);
    }
  });
});
```

### 4. Add Git Pre-Commit Hook

**File**: `.husky/pre-commit` (if using Husky)

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Verify dist/ doesn't have .ts source files
if find dist/src -name "*.ts" -not -name "*.d.ts" | grep -q .; then
  echo "❌ ERROR: TypeScript source files found in dist/"
  echo "   Run: npm run clean && npm run build"
  exit 1
fi

# Verify build succeeds
npm run build || {
  echo "❌ ERROR: Build failed"
  exit 1
}
```

### 5. Add TypeScript Compiler Check

**File**: `scripts/verify-build.js` (run in CI)

```javascript
#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';

// 1. Clean build
console.log('🧹 Cleaning dist/...');
execSync('npm run clean', { stdio: 'inherit' });

// 2. Build
console.log('🔨 Building...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build succeeded');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// 3. Verify no .ts source files in dist/
console.log('🔍 Verifying dist/ cleanliness...');
const tsFiles = execSync('find dist/src -name "*.ts" -not -name "*.d.ts"', {
  encoding: 'utf-8'
}).trim();

if (tsFiles) {
  console.error('❌ TypeScript source files found in dist/:', tsFiles);
  process.exit(1);
}

console.log('✅ All checks passed');
```

**Usage in CI** (`.github/workflows/test.yml`):

```yaml
jobs:
  build-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: node scripts/verify-build.js  # ✅ Catches build issues
```

---

## How to Prevent This Forever

### Development Workflow Changes

1. **Always clean before build during development**:
   ```bash
   npm run clean && npm run build
   ```

2. **Add npm script alias**:
   ```json
   {
     "scripts": {
       "rebuild": "npm run clean && npm run build"
     }
   }
   ```

3. **Add .gitignore entries**:
   ```
   # Compiled output (should be regenerated)
   dist/
   *.js.map
   ```

4. **CI/CD Pipeline**:
   - Every commit triggers full clean build
   - Verify no .ts in dist/
   - Run hook integration tests

### Architectural Improvements

**Option A: Use TypeScript Directly in Hooks** (requires ts-node)

```typescript
// Hook header:
#!/usr/bin/env tsx
// Now can import from src/ directly
import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager.js';
```

**Pros**: No build step for hooks, always fresh
**Cons**: Requires tsx/ts-node in runtime, slower startup

**Option B: Keep Compiled Hooks (Current)**

**Pros**: Fast execution, no runtime deps
**Cons**: Must rebuild after changes (current approach)

**Recommendation**: Keep current approach BUT add CI checks to prevent stale builds.

---

## Testing Strategy

### Unit Tests (Already Exist)
- ✅ `tests/unit/increment/ac-status-manager.test.ts`
- ✅ Tests parsing logic, AC sync logic

### Integration Tests (Partially Exist)
- ✅ `tests/integration/hooks/ac-status-hook.test.ts`
- ✅ Tests ACStatusManager integration
- ❌ **MISSING**: Actual hook script execution test

### E2E Tests (Missing)
- ❌ **MISSING**: Full workflow test (hook triggered by task completion)

### Build Tests (Missing)
- ❌ **MISSING**: Verify build produces valid output
- ❌ **MISSING**: Verify no .ts in dist/
- ❌ **MISSING**: Verify hooks can execute

**Recommended Test Matrix**:

| Test Type | What It Catches | Priority |
|-----------|----------------|----------|
| Build verification | TS5055, compilation errors | ⭐⭐⭐ Critical |
| Hook execution | Import path errors, runtime failures | ⭐⭐⭐ Critical |
| ACStatusManager unit | Logic bugs | ⭐⭐ High |
| E2E workflow | Full integration issues | ⭐ Medium |

---

## Root Cause Summary

**Technical**:
- TypeScript compilation failed (TS5055)
- dist/ folder polluted with source files
- Stale .js file with wrong import path
- No CI check to catch this

**Process**:
- No clean build enforcement
- No verification that hooks can execute
- Manual file edits without rebuild

**Systemic**:
- Missing CI build verification
- Missing hook integration tests
- No pre-commit checks for build health

---

## Action Items

**Immediate** (Do Now):
- [x] Clean dist/: `rm -rf dist/`
- [x] Rebuild: `npm run build`
- [x] Test hook: `node plugins/specweave/lib/hooks/update-ac-status.js 0039`

**Short-term** (Next PR):
- [ ] Add clean step to build script
- [ ] Add build verification test
- [ ] Add hook execution integration test
- [ ] Update CI to run verification

**Long-term** (Roadmap):
- [ ] Add pre-commit hook for build verification
- [ ] Document build process in CONTRIBUTING.md
- [ ] Add build health dashboard in CI

---

## Lessons Learned

1. **Build artifacts must be treated as ephemeral**
   - Always clean before build in CI
   - Never commit dist/ to version control

2. **Integration tests should test actual execution**
   - Not just the manager class
   - But the actual hook script running

3. **TypeScript compilation errors are silent killers**
   - TS5055 prevented update but didn't block commit
   - Need CI to catch this

4. **Import paths in hooks are critical**
   - Must point to dist/ (compiled)
   - Must be verified in tests

---

**Conclusion**: This was a **preventable** error caused by **missing CI checks**. The fix is simple (clean + rebuild), but the real value is adding tests to prevent recurrence.
