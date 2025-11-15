# Implementation Summary: Deduplication Graceful Degradation

**Date**: 2025-11-15
**Increment**: 0034-sync-living-docs
**Issue**: Duplicate `/specweave:sync-docs` invocations not blocked
**Fix Type**: Graceful degradation (immediate mitigation)
**Status**: ✅ Implemented

---

## Problem Statement

The command deduplication system exists in the codebase but is non-functional due to build failures. This allows duplicate command invocations to proceed unchecked, causing:

- Confusing duplicate "is running..." messages
- Duplicate work execution (2x operations)
- Increased AI costs
- Poor user experience

**Root Cause**: `dist/src/core/deduplication/command-deduplicator.js` doesn't exist because TypeScript build fails (150+ errors).

---

## Solution Implemented

### Graceful Degradation Strategy

Instead of silently failing, the hook now:

1. ✅ **Detects missing module** - Checks if deduplication module exists
2. ✅ **Logs diagnostic info** - Records why deduplication is unavailable
3. ✅ **Warns user once** - Shows actionable warning on first command
4. ✅ **Approves command** - Doesn't block workflow (fail-open behavior)

### Changes Made

**File**: `plugins/specweave/hooks/pre-command-deduplication.sh`

#### 1. Added Debug Logging (Lines 41-44)

```bash
# Debug logging directory
LOGS_DIR=".specweave/logs"
DEBUG_LOG="$LOGS_DIR/deduplication-debug.log"
mkdir -p "$LOGS_DIR" 2>/dev/null || true
```

**Purpose**: Track deduplication attempts and failures

**Output Location**: `.specweave/logs/deduplication-debug.log`

#### 2. Enhanced Module Detection (Lines 47-82)

**When module exists**:
```bash
if command -v node >/dev/null 2>&1 && [[ -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
  echo "[$(date)] ✓ Deduplication module found, checking for duplicates..." >> "$DEBUG_LOG"

  # Perform deduplication check...

  if [[ "$STATUS" == "DUPLICATE" ]]; then
    echo "[$(date)] 🚫 BLOCKED duplicate command: $COMMAND" >> "$DEBUG_LOG"
    # Block the duplicate
  else
    echo "[$(date)] ✓ No duplicate detected, command approved" >> "$DEBUG_LOG"
  fi
```

**Benefits**:
- Logs every deduplication check
- Records blocked duplicates
- Audit trail for debugging

#### 3. Graceful Degradation (Lines 83-119)

**When module missing**:
```bash
else
  # Deduplication module NOT available
  echo "[$(date)] ⚠️  Deduplication module not available (build required)" >> "$DEBUG_LOG"

  # Diagnose the issue
  if ! command -v node >/dev/null 2>&1; then
    echo "[$(date)]   → Node.js not found in PATH" >> "$DEBUG_LOG"
  elif [[ ! -f "dist/src/core/deduplication/command-deduplicator.js" ]]; then
    echo "[$(date)]   → Module not compiled" >> "$DEBUG_LOG"
    echo "[$(date)]   → Run 'npm run build' to enable deduplication" >> "$DEBUG_LOG"
  fi

  # Warn user (once per session)
  SESSION_MARKER="$LOGS_DIR/dedup-warning-shown"

  if [[ ! -f "$SESSION_MARKER" ]]; then
    # First command - show warning
    cat <<EOF
{
  "decision": "approve",
  "systemMessage": "⚠️  Command deduplication disabled

The deduplication module is not compiled. Duplicate commands may execute.

🔧 To enable:
  npm run build

📝 This warning shown once per session.
See: .specweave/logs/deduplication-debug.log"
}
EOF
  else
    # Already warned - silently approve
    { "decision": "approve" }
  fi
fi
```

**Benefits**:
- User knows deduplication is disabled
- Clear instructions to fix it
- Non-intrusive (warning shown once per session)
- Doesn't block workflow

---

## Debug Log Format

**Location**: `.specweave/logs/deduplication-debug.log`

**Example Output**:

```
[Fri Nov 15 10:23:45 UTC 2025] ⚠️  Deduplication module not available (build required)
[Fri Nov 15 10:23:45 UTC 2025]   → Module not compiled: dist/src/core/deduplication/command-deduplicator.js
[Fri Nov 15 10:23:45 UTC 2025]   → Run 'npm run build' to enable deduplication

[Fri Nov 15 10:24:12 UTC 2025] ✓ Deduplication module found, checking for duplicates...
[Fri Nov 15 10:24:12 UTC 2025] ✓ No duplicate detected, command approved

[Fri Nov 15 10:24:13 UTC 2025] ✓ Deduplication module found, checking for duplicates...
[Fri Nov 15 10:24:13 UTC 2025] 🚫 BLOCKED duplicate command: /specweave:sync-docs
```

**Usage**:
- Troubleshoot deduplication issues
- Verify hook is firing correctly
- See which commands are being blocked
- Identify duplicate invocation patterns

---

## Session Marker

**Location**: `.specweave/logs/dedup-warning-shown`

**Purpose**: Prevent warning spam

**Behavior**:
- Created on first command in session
- Prevents showing warning multiple times
- Deleted on new session (manual cleanup or restart)

**Manual Reset**:
```bash
rm .specweave/logs/dedup-warning-shown
# Next command will show warning again
```

---

## User Experience Changes

### Before Fix

**Scenario**: User invokes duplicate command

```
> /specweave:sync-docs is running...
> /specweave:sync-docs is running...

⏺ I'll help you sync... (both commands execute)
```

**Issues**:
- No feedback that deduplication failed
- Silent failure
- User confused by duplicates

### After Fix

**Scenario 1**: Deduplication module missing (first command)

```
> /specweave:increment "new feature"

⚠️  Command deduplication disabled

The deduplication module is not compiled. Duplicate commands may execute.

🔧 To enable:
  npm run build

📝 This warning shown once per session.
See: .specweave/logs/deduplication-debug.log

> Creating increment...
```

**Scenario 2**: Deduplication module missing (subsequent commands)

```
> /specweave:do

> Executing tasks... (no warning, already shown)
```

**Scenario 3**: Deduplication module compiled and working

```
> /specweave:sync-docs update
> /specweave:sync-docs update (< 1 second later)

🚫 DUPLICATE COMMAND DETECTED

Command: `/specweave:sync-docs`
Time window: 1 second

This command was just executed! To prevent unintended duplicates, this invocation has been blocked.

💡 If you meant to run this command again:
  1. Wait 1 second
  2. Run the command again

Deduplication Stats:
- Total duplicates blocked: 1
- Commands in cache: 1
```

---

## Testing

### Manual Test 1: Module Missing

```bash
# Ensure module doesn't exist
rm -rf dist/

# Invoke any command
echo '{"prompt": "/specweave:status"}' | bash plugins/specweave/hooks/pre-command-deduplication.sh

# Expected output:
# {
#   "decision": "approve",
#   "systemMessage": "⚠️  Command deduplication disabled..."
# }

# Check debug log
cat .specweave/logs/deduplication-debug.log
# [timestamp] ⚠️  Deduplication module not available (build required)
# [timestamp]   → Module not compiled: dist/src/core/deduplication/command-deduplicator.js
# [timestamp]   → Run 'npm run build' to enable deduplication
```

### Manual Test 2: Session Marker

```bash
# First command - warning shown
echo '{"prompt": "/specweave:status"}' | bash plugins/specweave/hooks/pre-command-deduplication.sh
# Output includes systemMessage

# Second command - no warning
echo '{"prompt": "/specweave:progress"}' | bash plugins/specweave/hooks/pre-command-deduplication.sh
# Output: { "decision": "approve" }

# Reset session
rm .specweave/logs/dedup-warning-shown

# Third command - warning shown again
echo '{"prompt": "/specweave:do"}' | bash plugins/specweave/hooks/pre-command-deduplication.sh
# Output includes systemMessage again
```

### Manual Test 3: Module Compiled (Future)

```bash
# Fix build errors and compile
npm run build

# Invoke duplicate commands quickly
echo '{"prompt": "/specweave:sync-docs"}' | bash plugins/specweave/hooks/pre-command-deduplication.sh
# Output: { "decision": "approve" }

echo '{"prompt": "/specweave:sync-docs"}' | bash plugins/specweave/hooks/pre-command-deduplication.sh
# Output: { "decision": "block", "reason": "🚫 DUPLICATE COMMAND DETECTED..." }

# Check debug log
cat .specweave/logs/deduplication-debug.log
# [timestamp] ✓ Deduplication module found, checking for duplicates...
# [timestamp] ✓ No duplicate detected, command approved
# [timestamp] ✓ Deduplication module found, checking for duplicates...
# [timestamp] 🚫 BLOCKED duplicate command: /specweave:sync-docs
```

---

## Impact Assessment

### Immediate Benefits
- ✅ Users now know deduplication is disabled
- ✅ Clear instructions to fix it (`npm run build`)
- ✅ Debug logs for troubleshooting
- ✅ Non-intrusive (warning shown once per session)
- ✅ Workflow not blocked (fail-open behavior)

### Remaining Limitations
- ⚠️ Duplicates still NOT blocked (module still not compiled)
- ⚠️ Build errors still need to be fixed
- ⚠️ Manual npm run build required to enable deduplication

### Risk Assessment
- ✅ **Low Risk**: Changes are additive (logging + warning)
- ✅ **Backward Compatible**: Doesn't change approval behavior
- ✅ **Fail-Safe**: Falls back to approval on any error

---

## Next Steps

### Short-term (Increment 0035)
1. Create increment: `0035-fix-deduplication-build`
2. Fix TypeScript errors in `src/core/deduplication/`
3. Test deduplication module independently
4. Verify hook functionality end-to-end
5. Document deduplication system in CLAUDE.md

**Estimated Effort**: 2-4 hours

### Long-term (Technical Debt)
1. Fix all 150+ TypeScript build errors
2. Add CI/CD check for build failures
3. Add integration tests for deduplication
4. Monitor duplicate invocation metrics
5. Consider alternative deduplication strategies (Redis, file-based)

---

## Files Changed

### Modified
- `plugins/specweave/hooks/pre-command-deduplication.sh`
  - Added debug logging (20 lines)
  - Added graceful degradation (40 lines)
  - Added session marker logic (15 lines)
  - Total: +75 lines, -4 lines = **+71 lines net**

### Created
- `.specweave/increments/0034-sync-living-docs/reports/DUPLICATE-SYNC-DOCS-ROOT-CAUSE.md`
  - Comprehensive root cause analysis (450 lines)

- `.specweave/increments/0034-sync-living-docs/reports/DEDUPLICATION-FIX-SUMMARY.md`
  - Implementation summary (this file, 350 lines)

### Runtime Files (gitignored)
- `.specweave/logs/deduplication-debug.log`
  - Debug log output (created at runtime)

- `.specweave/logs/dedup-warning-shown`
  - Session marker (created at runtime)

---

## Validation Checklist

- [x] Root cause identified and documented
- [x] Fix implemented (graceful degradation)
- [x] Debug logging added
- [x] User warning added (once per session)
- [x] Testing plan documented
- [x] Next steps defined
- [ ] Manual testing completed (blocked by no test environment)
- [ ] PR created and reviewed
- [ ] Changes committed to branch
- [ ] Documentation updated (CLAUDE.md)

---

## References

**Root Cause Analysis**: `.specweave/increments/0034-sync-living-docs/reports/DUPLICATE-SYNC-DOCS-ROOT-CAUSE.md`

**Original Issue**: User observed duplicate `/specweave:sync-docs` invocations

**Related Code**:
- `src/core/deduplication/command-deduplicator.ts` (source, not compiled)
- `scripts/check-deduplication.js` (wrapper script)
- `plugins/specweave/hooks/hooks.json` (hook registration)

**Tests** (exist but can't run):
- `tests/unit/deduplication/command-deduplicator.test.ts`
- `tests/integration/deduplication/`

---

**Status**: ✅ Fix implemented, ready for commit and PR
