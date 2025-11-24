# CRITICAL BUG FIX: PROJECT_ROOT Order-of-Operations (v0.26.1)

**Date**: 2025-11-24
**Severity**: P0 (CRITICAL - Caused Claude Code crashes)
**Status**: FIXED
**Version**: v0.26.1

---

## Executive Summary

**Bug**: `PROJECT_ROOT` variable used **BEFORE** it was defined in `post-task-completion.sh`, causing recursion guard to fail and triggering infinite hook loops that crashed Claude Code.

**Impact**:
- PreToolUse hook fired 3+ times per Edit operation
- Recursion guard created at invalid path (`/.specweave/state/.hook-recursion-guard`)
- Other hooks checked correct path, didn't find guard, continued execution
- Resulted in infinite recursion and Claude Code crashes

**Root Cause**: Variable initialization order bug introduced in v0.26.0

**Fix**: Moved `PROJECT_ROOT` definition from line 112 to line 66 (before recursion guard creation)

---

## The Bug

### Code Before Fix (v0.26.0)

```bash
# Line 71: Uses $PROJECT_ROOT (UNDEFINED!)
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  exit 0  # Never executes because path is wrong
fi

# Line 81: Creates guard at WRONG location
mkdir -p "$PROJECT_ROOT/.specweave/state"  # Actually: /.specweave/state
touch "$RECURSION_GUARD_FILE"  # Creates: /.specweave/state/.hook-recursion-guard

# ... 40 lines later ...

# Line 112: FINALLY defines PROJECT_ROOT
PROJECT_ROOT="$(find_project_root ...)"
```

### What Happened

1. `post-task-completion.sh` runs after TodoWrite
2. Creates guard file at **invalid path**: `/.specweave/state/.hook-recursion-guard` (no project root!)
3. Spawns background process with `consolidated-sync.js`
4. `consolidated-sync.js` writes to `tasks.md` via `fs.writeFile()`
5. Claude Code detects write → fires `post-edit-write-consolidated.sh` hook
6. Hook checks guard file at **correct path**: `/Users/anton/.../specweave/.specweave/state/.hook-recursion-guard`
7. Guard file NOT found (wrong location!) → hook doesn't exit early
8. Hook continues → writes more files → triggers more hooks
9. **INFINITE RECURSION** → process exhaustion → **Claude Code CRASH**

### Evidence

**User observed**:
```
⏺ Update(src/cli/commands/init.ts)
  ⎿  Running PreToolUse hook…

⏺ Update(src/cli/commands/init.ts)
  ⎿  Running PreToolUse hook…

⏺ Update(src/cli/commands/init.ts)
  ⎿  Running PreToolUse hook…

✅ Finally succeeded
```

**This matches the pattern from the 2025-11-24 incident** (27 duplicate GitHub comments):
- Recursion guard not working
- Hooks firing repeatedly
- Eventually stabilizes (after timeout/lock contention)

---

## The Fix (v0.26.1)

### Code After Fix

```bash
# Lines 47-64: Define find_project_root() function FIRST
find_project_root() {
  local dir="$1"
  while [ "$dir" != "/" ]; do
    if [ -d "$dir/.specweave" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  echo "$(pwd)"
}

# Line 66: Define PROJECT_ROOT IMMEDIATELY
PROJECT_ROOT="$(find_project_root "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
cd "$PROJECT_ROOT" 2>/dev/null || true

# Line 101: NOW use PROJECT_ROOT (correctly defined!)
RECURSION_GUARD_FILE="$PROJECT_ROOT/.specweave/state/.hook-recursion-guard"

if [[ -f "$RECURSION_GUARD_FILE" ]]; then
  exit 0  # NOW works correctly!
fi

# Creates guard at CORRECT path
touch "$RECURSION_GUARD_FILE"
```

### Verification

**All hooks checked**:
```bash
✅ post-edit-write-consolidated.sh: PROJECT_ROOT (line 51) < RECURSION_GUARD_FILE (line 71)
✅ post-metadata-change.sh:         PROJECT_ROOT (line 38) < RECURSION_GUARD_FILE (line 49)
✅ pre-edit-write-consolidated.sh:  PROJECT_ROOT (line 50) < RECURSION_GUARD_FILE (line 66)
✅ post-task-completion.sh:         PROJECT_ROOT (line 66) < RECURSION_GUARD_FILE (line 101) [FIXED]
```

---

## Why This Bug Existed

**Timeline**:
1. **v0.25.1**: Added `SPECWEAVE_IN_HOOK=1` env var recursion guard
2. **2025-11-24**: Discovered env vars don't work with background processes (`&`)
3. **v0.26.0**: Switched to **file-based recursion guard** (ADR-0073)
4. **Bug introduced**: In `post-task-completion.sh`, copy-pasted guard code but forgot to move `PROJECT_ROOT` initialization
5. **Other hooks**: Already had correct order (project root first, then guard)
6. **Result**: Only `post-task-completion.sh` had the bug

**Why it wasn't caught immediately**:
- Other 3 hooks had correct order → recursion prevention worked for them
- `post-task-completion.sh` is the **primary trigger** (fires on TodoWrite)
- Bug only manifests when `post-task-completion.sh` spawns background work that writes files
- Subtle timing: Sometimes locks/debouncing prevented full recursion

---

## Testing

### Manual Test

```bash
# 1. Mark a task complete (triggers hook)
# TodoWrite in Claude Code

# 2. Check guard file location
ls -la /Users/anton/Projects/github/specweave/.specweave/state/.hook-recursion-guard
# Expected: File exists at CORRECT path (with full project root)

# 3. Check hook logs
tail -50 .specweave/logs/hooks-debug.log | grep "Recursion guard"
# Expected: "🔒 Recursion guard created" (not "⏭️ Recursion guard detected")

# 4. Verify no recursion
tail -100 .specweave/logs/hooks-debug.log | grep -c "pre-edit-write: Detected"
# Expected: 1-2 (not 10+)
```

### Regression Test (Unit)

Add to `tests/unit/hooks/recursion-guard.test.ts`:

```typescript
describe('Recursion Guard Path Validation', () => {
  it('creates guard file at correct path with PROJECT_ROOT', async () => {
    const projectRoot = '/Users/test/project';
    process.env.PROJECT_ROOT = projectRoot;

    await runHook('post-task-completion.sh');

    // Verify guard file created at correct location
    const guardPath = `${projectRoot}/.specweave/state/.hook-recursion-guard`;
    expect(fs.existsSync(guardPath)).toBe(true);

    // Verify NOT at wrong location
    const wrongPath = '/.specweave/state/.hook-recursion-guard';
    expect(fs.existsSync(wrongPath)).toBe(false);
  });
});
```

---

## Related Incidents

| Date | Incident | Root Cause | Fix |
|------|----------|------------|-----|
| 2025-11-22 | Claude Code crash on TodoWrite | Hook process storm (6 hooks → 300 processes/min) | v0.25.0: Hook consolidation (6 → 4 hooks) |
| 2025-11-23 | 27 duplicate GitHub comments (#719) | Env var guard failed with background processes | v0.26.0: File-based guard (ADR-0073) |
| 2025-11-24 | 3x PreToolUse hook fires, crash | PROJECT_ROOT undefined when guard created | v0.26.1: **THIS FIX** (order correction) |

---

## Prevention

### Pre-commit Hook Check (TODO)

Add to `scripts/pre-commit-hooks-validation.sh`:

```bash
# Validate PROJECT_ROOT defined before RECURSION_GUARD_FILE in all hooks
for hook in plugins/*/hooks/*.sh; do
  guard_line=$(grep -n "RECURSION_GUARD_FILE=" "$hook" | cut -d: -f1)
  root_line=$(grep -n "^PROJECT_ROOT=" "$hook" | cut -d: -f1)

  if [[ -n "$guard_line" && -n "$root_line" ]]; then
    if [[ $root_line -gt $guard_line ]]; then
      echo "❌ ERROR: $hook has PROJECT_ROOT after RECURSION_GUARD_FILE"
      echo "   PROJECT_ROOT must be defined BEFORE recursion guard creation"
      exit 1
    fi
  fi
done

echo "✅ All hooks have correct variable initialization order"
```

### Code Review Checklist

When adding new hooks:
- [ ] Define `PROJECT_ROOT` first (lines 40-50)
- [ ] Use `RECURSION_GUARD_FILE` after PROJECT_ROOT defined (lines 60+)
- [ ] Verify with: `grep -n "PROJECT_ROOT=" hook.sh && grep -n "RECURSION_GUARD_FILE=" hook.sh`
- [ ] Ensure PROJECT_ROOT line number < RECURSION_GUARD_FILE line number

---

## Summary

| Aspect | Details |
|--------|---------|
| **Bug** | `PROJECT_ROOT` used before definition in `post-task-completion.sh` |
| **Impact** | Recursion guard created at wrong path → infinite hook loops → crashes |
| **Symptom** | PreToolUse hook fired 3+ times, eventual timeout/crash |
| **Root Cause** | Copy-paste error in v0.26.0 refactor |
| **Fix** | Moved `find_project_root()` and `PROJECT_ROOT=` to lines 47-67 |
| **Prevention** | Add pre-commit validation for variable order |
| **Status** | FIXED in v0.26.1 |

---

**Lesson**: Variable initialization order bugs are subtle but catastrophic in hook systems. Always validate that dependencies (like `PROJECT_ROOT`) are defined **before** they're used in path construction.

**See Also**:
- ADR-0073: Hook Recursion Prevention Strategy
- `.../reports/GITHUB-COMMENT-RECURSION-ROOT-CAUSE-2025-11-24.md`
- CLAUDE.md Section 9a: Hook Performance & Safety
