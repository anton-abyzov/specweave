# Cancel-Auto Command Fix Summary

**Date**: 2026-01-05
**Issue**: Automatic cancel-auto invocations with unsupported `--reason` flag

## Problem Analysis

1. **Command Signature Mismatch**:
   - Bash script supported `--reason` option
   - TypeScript CLI didn't support `--reason`
   - Resulted in "unknown option '--reason'" error

2. **Conceptual Issue**:
   - Something was calling `specweave cancel-auto --force --reason "Switching to Profile completion"`
   - **Auto mode should NEVER auto-cancel itself**
   - Cancel-auto should be manual emergency-only command

## Changes Made

### 1. Removed `--reason` Option

**Files Modified**:
- [`plugins/specweave/scripts/cancel-auto.sh`](plugins/specweave/scripts/cancel-auto.sh)
  - Removed `--reason` argument parsing
  - Hardcoded reason to "User manually cancelled"
  - Added error handling for unknown options

- [`plugins/specweave/commands/cancel-auto.md`](plugins/specweave/commands/cancel-auto.md)
  - Removed `--reason` from options table
  - Removed `--reason` example

### 2. Positioned as Emergency-Only

**Documentation Updates**:
- Marked command as **⚠️ EMERGENCY ONLY** in all locations
- Added clear guidance: "Just close Claude Code to pause"
- Documented preferred approach: close session, resume with `/sw:do`

**When to Use**:
- ✅ True emergencies (system resources, critical bugs)
- ✅ Force-stop runaway session
- ❌ Normal pause/resume (use close/reopen)
- ❌ Switching contexts (close tab)
- ❌ "Profile switches" (not a valid concept)

### 3. Updated All References

**Files Updated**:
- [`CLAUDE.md`](CLAUDE.md) - Main contributor guide
- [`src/templates/CLAUDE.md.template`](src/templates/CLAUDE.md.template) - Template for new projects
- [`plugins/specweave/commands/cancel-auto.md`](plugins/specweave/commands/cancel-auto.md) - Command docs
- [`plugins/specweave/scripts/cancel-auto.sh`](plugins/specweave/scripts/cancel-auto.sh) - Bash implementation

## Verification

✅ **No automatic cancel-auto invocations found** in codebase
```bash
grep -r "execSync\|spawn\|exec(" src plugins --include="*.ts" --include="*.sh" | grep -i "cancel-auto"
# Result: No matches
```

✅ **Build succeeded** after changes

## Command Signatures (Final)

### Supported
```bash
/sw:cancel-auto              # Interactive with confirmation
/sw:cancel-auto --force      # Emergency force cancel
```

### Removed
```bash
/sw:cancel-auto --reason "..." # ❌ REMOVED - unnecessary complexity
```

## Philosophy

**Auto mode is designed to run until completion.**

- **Normal workflow**: Close Claude Code → Pause automatically → Resume with `/sw:do`
- **Emergency only**: Use `/sw:cancel-auto` for true emergencies
- **No auto-cancellation**: System never auto-cancels itself

## Migration Notes

For any external scripts/tools calling `cancel-auto --reason`:
1. Remove the `--reason` argument
2. Use `--force` if non-interactive needed
3. Consider if manual close/resume is better approach

---

**Status**: ✅ Completed
**Impact**: Low (emergency-only command, rarely used)
**Breaking**: Minor (removes unsupported `--reason` option from bash script)
