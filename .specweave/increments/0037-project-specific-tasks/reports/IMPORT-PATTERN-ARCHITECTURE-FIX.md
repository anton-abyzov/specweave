# Import Pattern Architecture Fix: Increment Scripts vs Hooks

**Date**: 2025-11-16
**Increment**: 0037-project-specific-tasks
**Issue**: Increment script incorrectly importing from `dist/` instead of `src/`

---

## Executive Summary

Fixed architectural mismatch where increment script `update-all-increments-status.ts` was copying hook import patterns (importing from `dist/`), causing:
- Build dependency (requires `npm run build` before execution)
- Stale code issues (changes to `src/` not reflected until rebuild)
- Semantic confusion (TypeScript runtime importing JavaScript modules)

**Solution**: Changed import from `dist/src/` → `src/` and shebang from `ts-node` → `tsx`.

---

## The Problem

### Original Code

```typescript
#!/usr/bin/env ts-node
import { ACStatusManager } from '../../../../dist/src/core/increment/ac-status-manager.js';
```

### Issues Identified

1. **Build Dependency**:
   ```bash
   # Script fails if dist/ doesn't exist:
   npm run clean
   npx ts-node .specweave/.../update-all-increments-status.ts
   # Error: Cannot find module '../../../../dist/src/...'
   ```

2. **Stale Code**:
   ```bash
   # Edit source:
   vim src/core/increment/ac-status-manager.ts

   # Run script:
   npx ts-node .specweave/.../update-all-increments-status.ts
   # Still uses OLD version from dist/ !

   # Must rebuild first:
   npm run build && npx ts-node .specweave/.../update-all-increments-status.ts
   ```

3. **Semantic Mismatch**:
   - TypeScript runtime (`ts-node`) → JavaScript imports (`dist/`)
   - Mixed compilation contexts (ts-node transpiles .ts, but imports pre-compiled .js)

4. **Role Confusion**:
   - Increment scripts = development utilities
   - Hooks = production executables
   - Different purposes require different patterns

---

## Root Cause Analysis

### Why Hooks Use `dist/`

**Hooks** (`plugins/**/lib/hooks/*.ts`) are **production executables**:

```typescript
#!/usr/bin/env node                      // ← Node.js runtime (JavaScript)
import { ACStatusManager } from          // ← JavaScript module
  '../../../../dist/src/core/...'       // ✅ Consistent!
```

**Hook constraints**:
1. Executed by shell scripts (not TypeScript tooling)
2. Must be pure JavaScript (no TypeScript runtime)
3. Compiled separately with `esbuild` (not `tsc`)
4. Must work in production (no dev dependencies)

### Why Increment Scripts Should Use `src/`

**Increment scripts** (`.specweave/increments/####/scripts/*.ts`) are **development utilities**:

```typescript
#!/usr/bin/env tsx                       // ← TypeScript runtime
import { ACStatusManager } from          // ← TypeScript module
  '../../../../src/core/...'            // ✅ Consistent!
```

**Script characteristics**:
1. Development-only (not production)
2. One-off tasks (migrations, analysis, cleanup)
3. Temporary (specific to increment)
4. Developers have full tooling (tsx, TypeScript)

---

## The Solution

### Fixed Code

```typescript
#!/usr/bin/env tsx

/**
 * Update All Increments Status - Autonomous Sync
 *
 * Usage:
 *   npx tsx update-all-increments-status.ts [--dry-run]
 *
 * Note: Uses tsx (not ts-node) for better ESM + TypeScript support.
 *       Imports from src/ (not dist/) for live code during development.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ACStatusManager } from '../../../../src/core/increment/ac-status-manager.js';
```

### Changes Made

1. **Shebang**: `ts-node` → `tsx` (better ESM support)
2. **Import path**: `../../../../dist/src/` → `../../../../src/`
3. **Documentation**: Added inline comment explaining pattern

### Why `tsx` Instead of `ts-node`?

**tsx** is a modern TypeScript execution engine with better ESM support:

```bash
# ts-node (old):
npx ts-node script.ts
# Issue: Looks for .js files on disk (ESM loader)

# tsx (modern):
npx tsx script.ts
# Works: Transpiles TypeScript on-the-fly, handles ESM correctly
```

**Verification**:
```bash
$ npx tsx .specweave/increments/0037-*/scripts/update-all-increments-status.ts --dry-run
🔄 Updating all non-archived increments...
⚠️  DRY RUN MODE - No changes will be made
✅ Increments Processed:  10
✅ Tasks Updated:         0
✅ ACs Updated:           0
```

---

## Architecture Decision

### Pattern Definition

| Component | Location | Runtime | Imports | Purpose |
|-----------|----------|---------|---------|---------|
| **Hooks** | `plugins/**/lib/hooks/` | `node` | `dist/src/` | Production executables |
| **Increment Scripts** | `.specweave/increments/####/scripts/` | `tsx` | `src/` | Development utilities |
| **Source Code** | `src/` | N/A | N/A | TypeScript source |
| **Compiled Output** | `dist/src/` | N/A | N/A | JavaScript output |

### Import Pattern Matrix

| From → To | `src/` (TS) | `dist/src/` (JS) |
|-----------|-------------|------------------|
| **Hooks** (`.ts` → `.js`) | ❌ No | ✅ Yes |
| **Increment Scripts** (`.ts` via tsx) | ✅ Yes | ❌ No |
| **Production Code** (`src/`) | ✅ Yes | ❌ No |
| **Compiled Code** (`dist/`) | ❌ No | ✅ Yes |

### Decision Rationale

**Hooks MUST use `dist/`** because:
- Executed as standalone processes (no TypeScript runtime)
- Called by shell scripts (production context)
- Must work without dev dependencies

**Increment Scripts MUST use `src/`** because:
- Executed with TypeScript runtime (tsx available)
- Development context (dev dependencies present)
- Benefits from live code (no rebuild required)
- Clear separation: dev tools ≠ production infrastructure

---

## Benefits

### Before (Incorrect Pattern)

```typescript
#!/usr/bin/env ts-node
import from '../../../../dist/src/...'
```

**Issues**:
- 🔴 Build dependency
- 🔴 Stale code possible
- 🔴 Semantic confusion
- 🔴 Extra step (rebuild before run)

### After (Correct Pattern)

```typescript
#!/usr/bin/env tsx
import from '../../../../src/...'
```

**Benefits**:
- ✅ No build dependency
- ✅ Always fresh code
- ✅ Semantic clarity
- ✅ Development-friendly

---

## Documentation Updates

### CLAUDE.md

Added new section: **"Increment Scripts vs Hooks"** (line 440) documenting:
- Difference between hooks and increment scripts
- Import patterns for each
- Common mistakes
- Comparison table
- Examples with explanations

**Location**: `/Users/antonabyzov/Projects/github/specweave/CLAUDE.md:440-496`

### CONTRIBUTING.md

**Status**: Checked - already has sufficient build documentation. The new CLAUDE.md section provides increment-specific guidance. No updates needed.

---

## Additional Files Fixed

After the initial fix, found **2 more increment scripts** with the same issue:

### Increment 0031 Scripts

**1. sync-all-epics-to-github.ts**:
```diff
- import { GitHubClientV2 } from '../../../../dist/plugins/specweave-github/lib/github-client-v2.js';
- import { GitHubEpicSync } from '../../../../dist/plugins/specweave-github/lib/github-epic-sync.js';
+ import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
+ import { GitHubEpicSync } from '../../../../plugins/specweave-github/lib/github-epic-sync.js';
```

**2. test-single-epic.ts**:
```diff
- import { GitHubClientV2 } from '../../../../dist/plugins/specweave-github/lib/github-client-v2.js';
- import { GitHubEpicSync } from '../../../../dist/plugins/specweave-github/lib/github-epic-sync.js';
+ import { GitHubClientV2 } from '../../../../plugins/specweave-github/lib/github-client-v2.js';
+ import { GitHubEpicSync } from '../../../../plugins/specweave-github/lib/github-epic-sync.js';
```

**Pattern**: Changed `dist/plugins/` → `plugins/` (plugin lib has TypeScript source).

**Total Files Fixed**: 3 increment scripts across 2 increments.

## Testing

### Manual Verification

```bash
# Test increment 0037 script:
npx tsx .specweave/increments/0037-*/scripts/update-all-increments-status.ts --dry-run
# ✅ Success: Processed 10 increments

# Test increment 0031 scripts:
npx tsx .specweave/increments/0031-*/scripts/test-single-epic.ts
# ✅ Success: Module resolution works (fails on missing dir, but import succeeds)

# Verify no dist/ imports remain:
grep "^import.*from.*dist/" .specweave/increments/**/*.ts
# ✅ No matches (only comments mentioning "not dist/")
```

### Automated Tests

No automated tests needed - these are increment-specific development scripts, not production code.

---

## Lessons Learned

### For Future Increments

**When creating increment scripts**:

1. ✅ **DO**:
   - Use `#!/usr/bin/env tsx`
   - Import from `src/` (TypeScript source)
   - Document usage in script header
   - Add inline comments explaining pattern

2. ❌ **DON'T**:
   - Copy hook patterns (they're different!)
   - Import from `dist/` (creates build dependency)
   - Use `ts-node` (tsx has better ESM support)
   - Assume hooks and scripts follow same pattern

### Pattern Recognition

**If you see**:
- File in `plugins/**/lib/hooks/` → Use `dist/` imports
- File in `.specweave/increments/####/scripts/` → Use `src/` imports
- TypeScript runtime (tsx/ts-node) → TypeScript imports (`src/`)
- JavaScript runtime (node) → JavaScript imports (`dist/`)

---

## Conclusion

This fix corrects an architectural mismatch by aligning increment scripts with their purpose as **development utilities** rather than **production executables**.

**Key Takeaway**: Different components serve different purposes and require different patterns. Hooks and increment scripts may both be TypeScript files, but their execution context, purpose, and import patterns are fundamentally different.

**Impact**:
- ✅ 3 increment scripts fixed across 2 increments
- ✅ Scripts now work without build dependency
- ✅ Always use fresh source code (no stale code issues)
- ✅ Clear architectural boundaries (dev scripts ≠ production hooks)
- ✅ Better developer experience (no rebuild step)
- ✅ Documented pattern for future contributors (CLAUDE.md)

---

**Next Steps**:
1. Monitor other increment scripts for same pattern
2. Consider adding linting rule to detect incorrect import patterns
3. Update template generator if increment scripts are scaffolded

**Related Documentation**:
- CLAUDE.md: Line 440-496 (Increment Scripts vs Hooks)
- Increment 0039: HOOK-IMPORT-ERROR-ULTRATHINK-ANALYSIS.md (hooks analysis)
- Build verification tests: `tests/integration/build/build-verification.test.ts`
