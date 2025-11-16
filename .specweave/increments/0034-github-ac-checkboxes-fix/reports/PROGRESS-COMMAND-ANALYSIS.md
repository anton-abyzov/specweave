# /specweave:progress Command Analysis and Fix

**Date**: 2025-11-15
**Increment**: 0034-github-ac-checkboxes-fix
**Issue**: `/specweave:progress` slash command references non-existent CLI command

---

## Problem Statement

When users run the `/specweave:progress` slash command, it attempts to execute:
```bash
node dist/src/cli/index.js progress
```

This fails with:
```
Error: Cannot find module '/Users/antonabyzov/Projects/github/specweave/dist/src/cli/index.js'
```

**Root Causes**:
1. ❌ No `dist/src/cli/index.js` file exists (wrong path)
2. ❌ No `progress` CLI command exists (wrong command name)
3. ❌ The actual CLI command is `status-line`, not `progress`
4. ❌ Documentation uses `/specweave:progress` but implementation uses `status-line`

---

## Current Architecture

### Slash Command (`/specweave:progress`)
**File**: `plugins/specweave/commands/specweave-progress.md`

```yaml
---
name: specweave:progress
description: Show progress for ALL active increments (up to 2)...
---
```

**What it does**:
- Expands prompt with progress tracking instructions
- Attempts to execute: `node dist/src/cli/index.js progress`

### CLI Command (`status-line`)
**File**: `bin/specweave.js` (lines 116-177)

```javascript
program
  .command('status-line')  // ← The actual command name
  .description('Display current increment status line')
  .option('--json', 'Output JSON format')
  .option('--clear', 'Clear status line cache')
  .action(async (options) => { ... })
```

**Usage**:
```bash
# ✅ Works
node bin/specweave.js status-line

# ❌ Doesn't work
node dist/src/cli/index.js progress
```

---

## Why This Happens

### 1. Wrong Entry Point
**Slash command tries**: `dist/src/cli/index.js`
**Actual entry point**: `bin/specweave.js`

**Explanation**: The CLI entry point is defined in `package.json`:
```json
{
  "bin": {
    "specweave": "./bin/specweave.js"
  }
}
```

### 2. Wrong Command Name
**Slash command expects**: `progress`
**Actual command**: `status-line`

**Why different?**
- CLI uses `status-line` (consistent with `status` command naming)
- Slash command uses `progress` (user-friendly, semantic)
- No alias registered

### 3. No `dist/src/cli/index.js`
**Build output**: TypeScript compiles to `dist/src/cli/commands/*.js`
**What's missing**: No top-level `index.js` aggregator

**Evidence**:
```bash
$ ls dist/src/cli/
commands/  helpers/
# No index.js!
```

---

## Solutions (3 Options)

### Option 1: Add `progress` Alias to CLI (Recommended) ✅

**Changes**:
1. Add `progress` as alias for `status-line` command
2. Keep slash command as-is (`/specweave:progress`)
3. Update slash command to use correct entry point

**Implementation**:
```javascript
// bin/specweave.js
program
  .command('status-line')
  .alias('progress')  // ← Add this
  .description('Display current increment status line')
  // ...rest of command
```

**Benefits**:
- ✅ Minimal changes (1 line)
- ✅ User-facing docs remain unchanged
- ✅ Both `status-line` and `progress` work
- ✅ No breaking changes

### Option 2: Rename CLI Command to `progress`

**Changes**:
1. Rename `status-line` → `progress` in CLI
2. Update all references
3. Breaking change for existing scripts

**Impact**:
- ❌ Breaking change (users using `status-line` will break)
- ❌ Inconsistent with `status` command naming
- ❌ More work (update docs, tests, examples)

### Option 3: Update Slash Command to Use `status-line`

**Changes**:
1. Rename slash command `/specweave:progress` → `/specweave:status-line`
2. Update all documentation
3. Change user-facing command

**Impact**:
- ❌ Less user-friendly name
- ❌ Confusing (`status` vs `status-line`)
- ❌ Documentation updates needed

---

## Recommended Fix: Option 1 (Alias)

### Step 1: Add Alias to CLI

**File**: `bin/specweave.js` (line 118)

```diff
program
  .command('status-line')
+ .alias('progress')
  .description('Display current increment status line')
```

### Step 2: Fix Slash Command Entry Point

**File**: `plugins/specweave/commands/specweave-progress.md`

**Current** (line 409 - estimated):
```bash
node dist/src/cli/index.js progress
```

**Fixed**:
```bash
node bin/specweave.js progress
```

### Step 3: Verify Fix

```bash
# Test CLI directly
node bin/specweave.js progress
# Expected: Shows status line

node bin/specweave.js status-line
# Expected: Same output (alias works)

# Test slash command
/specweave:progress
# Expected: Executes without error
```

---

## Implementation Plan

### Phase 1: CLI Alias (5 min)

**Task 1**: Add alias to `bin/specweave.js`
```typescript
// Line 118
program
  .command('status-line')
  .alias('progress')  // ← Add this line
  .description('Display current increment status line')
```

**Task 2**: Build and test
```bash
npm run build
node bin/specweave.js progress
# Should work ✅
```

### Phase 2: Fix Slash Command (10 min)

**Task 3**: Update slash command execution path

**File**: `plugins/specweave/commands/specweave-progress.md`

Find the line executing the CLI (search for `node dist/src/cli/index.js progress`) and replace with:
```bash
node bin/specweave.js progress
```

**Task 4**: Test slash command
```bash
# In Claude Code
/specweave:progress
# Should execute successfully ✅
```

### Phase 3: Documentation Update (5 min)

**Task 5**: Add note about alias to CLI help

**File**: `bin/specweave.js` (line 119)
```diff
program
  .command('status-line')
  .alias('progress')
- .description('Display current increment status line')
+ .description('Display current increment status line (alias: progress)')
```

**Task 6**: Update CLAUDE.md

Add note in "Quick Reference" section:
```markdown
*Primary commands*:
- `/specweave:progress` - Check current progress (alias: status-line)
```

---

## Testing Strategy

### Unit Test (Verify Alias)
```bash
# Test alias works
node bin/specweave.js progress

# Test original command still works
node bin/specweave.js status-line

# Both should produce identical output
```

### Integration Test (Verify Slash Command)
```bash
# In Claude Code session
/specweave:progress

# Expected behavior:
# 1. Shows progress for active increments
# 2. No errors about missing module
# 3. Uses correct CLI entry point (bin/specweave.js)
```

### E2E Test (Full Workflow)
```bash
# 1. Create new increment
/specweave:increment "test progress command"

# 2. Check progress
/specweave:progress
# Should show: 0% complete, 0/X tasks

# 3. Complete a task
/specweave:do

# 4. Check progress again
/specweave:progress
# Should show: >0% complete, 1/X tasks
```

---

## Success Criteria

### Must Have ✅
- [ ] `node bin/specweave.js progress` works
- [ ] `node bin/specweave.js status-line` works (original)
- [ ] `/specweave:progress` executes without errors
- [ ] Shows correct progress for active increments

### Nice to Have 📋
- [ ] Documentation mentions alias
- [ ] CLAUDE.md updated with correct command
- [ ] Help text shows both names

---

## Edge Cases

### Case 1: No Active Increments
```bash
node bin/specweave.js progress
# Expected: "No active increment"
# Exit code: 1
```

### Case 2: Multiple Active Increments
```bash
node bin/specweave.js progress
# Expected: Shows ALL active increments (max 2)
# Shows: WIP limit warning if >2
```

### Case 3: JSON Output
```bash
node bin/specweave.js progress --json
# Expected: JSON format with increment data
```

### Case 4: Cache Clear
```bash
node bin/specweave.js progress --clear
# Expected: Clears cache, shows "✅ Status line cache cleared"
```

---

## Related Files

### CLI Implementation
- `bin/specweave.js` - Entry point, command registration
- `src/cli/commands/status-line.ts` - Command logic (unused in current setup)
- `src/core/status-line/status-line-manager.ts` - Core logic

### Slash Command
- `plugins/specweave/commands/specweave-progress.md` - Slash command definition

### Documentation
- `CLAUDE.md` - Quick reference (needs update)
- `plugins/specweave/COMMANDS.md` - Command catalog

### Tests
- `tests/unit/status-line/status-line-manager.test.ts` - Unit tests
- `tests/e2e/status-line.spec.ts` - E2E tests (if exists)

---

## Timeline

**Total Estimated Time**: 20 minutes

| Phase | Duration | Tasks |
|-------|----------|-------|
| Phase 1: CLI Alias | 5 min | Add `.alias('progress')`, build, test |
| Phase 2: Slash Command | 10 min | Update entry point, test execution |
| Phase 3: Documentation | 5 min | Update help text, CLAUDE.md |

---

## Migration Notes

### For Users
- ✅ **No breaking changes** - Both names work
- ✅ `status-line` still works (original)
- ✅ `progress` works (new alias)
- ✅ Slash command `/specweave:progress` now works

### For Developers
- ✅ Alias pattern can be used for other commands
- ✅ Entry point: Always use `bin/specweave.js`
- ✅ Never use `dist/src/cli/index.js` (doesn't exist)

---

## References

### Similar Commands with Aliases
```javascript
// Example from Commander.js docs
program
  .command('list')
  .alias('ls')  // ← Alias pattern
  .description('List items')
```

### SpecWeave Alias Candidates
- `status` → `st` (short alias)
- `validate` → `check` (semantic alias)
- `abandon` → `cancel` (user-friendly alias)

---

## Conclusion

**Root Cause**: Naming mismatch between slash command (`progress`) and CLI command (`status-line`)

**Solution**: Add `.alias('progress')` to CLI command registration

**Impact**:
- ✅ Zero breaking changes
- ✅ 1-line code change
- ✅ Fixes user-reported issue
- ✅ Improves UX (both names work)

**Next Steps**:
1. Apply fix (add alias)
2. Update slash command entry point
3. Test both commands work
4. Update documentation
5. Close issue

---

**Status**: Analysis Complete ✅
**Ready for Implementation**: Yes ✅
**Estimated Effort**: 20 minutes
**Risk Level**: Low (non-breaking change)
