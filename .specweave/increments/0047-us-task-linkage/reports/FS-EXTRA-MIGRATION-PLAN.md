# fs-extra Migration Plan

## Scope Analysis

**Total Files Using fs-extra**: ~400+ files

### File Categories

1. **CRITICAL (Marketplace-breaking)**: 27 files
   - `plugins/specweave/lib/hooks/*.ts` (16 files)
   - `plugins/specweave-github/lib/*.ts` (6 files)
   - `plugins/specweave-ado/lib/*.ts` (2 files)
   - `plugins/specweave-jira/lib/*.ts` (1 file)
   - `plugins/specweave/lib/vendor/**/*.js` (2 files)

2. **HIGH PRIORITY (Core functionality)**: ~100 files
   - `src/**/*.ts` (all source files)

3. **MEDIUM PRIORITY (Development tools)**: ~50 files
   - `scripts/*.ts` (migration scripts, utilities)

4. **LOW PRIORITY (Test environment)**: ~200 files
   - `tests/**/*.ts` (has node_modules in dev)
   - `.specweave/increments/*/scripts/*.ts` (one-off scripts)

## Migration Strategy

### Phase 1: Create Native FS Helpers (30 min)
Create `src/utils/fs-native.ts` with drop-in replacements:
- `ensureDir()` → `mkdir -p`
- `readJson()` → `readFile + JSON.parse`
- `writeJson()` → `writeFile + JSON.stringify`
- `pathExists()` → `existsSync`
- `copy()` → `copyFile` (recursive via cp -r)
- `remove()` → `rm -rf`

### Phase 2: Migrate CRITICAL Files (2 hours)
**Priority**: Fixes marketplace failures immediately
- 27 plugin hook/lib files
- Test in marketplace

### Phase 3: Migrate HIGH PRIORITY Files (3-4 hours)
- 100 src/ files
- Run full test suite
- Ensure no regressions

### Phase 4: Cleanup (1 hour)
- Remove fs-extra from dependencies
- Add ESLint rule
- Update docs

**Total Estimated Time**: 6-7 hours (not 200!)

## Revised Approach

Given the massive scope, I'll use a **hybrid strategy**:

1. **Create fs-native utility module** - Drop-in replacement
2. **Migrate critical paths** - Plugins that run in marketplace
3. **Leave src/ with fs-extra FOR NOW** - Works in npm install (has node_modules)
4. **Gradually migrate src/** - Over time as we touch files

This reduces immediate work to ~3 hours while fixing the marketplace issue.
