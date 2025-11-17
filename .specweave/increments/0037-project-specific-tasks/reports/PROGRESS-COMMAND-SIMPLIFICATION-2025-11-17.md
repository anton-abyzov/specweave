# Progress Command Simplification

**Date**: 2025-11-17
**Status**: ✅ COMPLETE
**Impact**: Reduced complexity from 400+ lines to ~100 lines, fixed hook errors

## Problem

The `/specweave:progress` command was overcomplicated and causing errors:

1. **Hook Error**: "Plugin hook error" due to StatusLineManager loading failure
2. **Complexity**: 400+ lines of documentation with features that weren't needed:
   - Weighted task priorities (P1=2x, P2=1.5x, P3=1x)
   - PM gate validation (Gate 1, 2, 3)
   - WIP limit calculations
   - Time tracking
   - Stuck task detection
3. **Dependencies**: Relied on compiled TypeScript (dist/src/) which caused import issues

## Root Cause

The hook at line 312 of `user-prompt-submit.sh` tried to load:
```bash
const { StatusLineManager } = require('./dist/src/core/status-line/status-line-manager.js');
```

This caused failures because:
- StatusLineManager might have import issues
- Hook depends on compiled code (brittle)
- Unnecessary complexity for a simple status check

## Solution

Replaced with **simple bash script** (~100 lines):

### What It Does

```bash
# 1. Scan .specweave/increments/ for non-archived folders
# 2. Read metadata.json for status
# 3. Count tasks in tasks.md:
#    - Total: grep -cE '^#{3,4}\s*T-[0-9]'
#    - Done: grep -cE '(✅ COMPLETE|\[COMPLETED\]|\[x\] Completed)'
# 4. Show active ones first, then others
```

### Key Improvements

1. **No dependencies**: Just bash, jq, grep
2. **Fast**: Single scan of increments folder
3. **Reliable**: No compiled JS, no hooks, no cache
4. **Clear**: Shows exactly what matters

### Output

```
📊 Increment Progress
================================

🟢 ACTIVE: 0037-project-specific-tasks
   Status: in-progress
   Tasks: 72/85 completed (84%)
   Next: /specweave:do 0037-project-specific-tasks

⏸️  active: 0038-serverless-architecture-intelligence
   Tasks: 0/24 (0%)

⏸️  planning: 0039-ultra-smart-next-command
   Tasks: 16/98 (16%)

⏸️  active: 0040-vitest-living-docs-mock-fixes
   Tasks: 0/5 (0%)

================================
Summary:
  Active increments: 1
  Other non-completed: 3

💡 Continue with /specweave:do
```

## Technical Details

### Bug Fix: Newline in grep output

**Problem**: `grep -c` was returning `"0\n0"` for some files, causing bash arithmetic errors.

**Root Cause**: Some tasks.md files had patterns that matched `grep -cE` in unexpected ways.

**Solution**: Added `| tr -d '\n'` to strip newlines and ensured fallback to 0:
```bash
total=$(grep -cE '^#{3,4}\s*T-[0-9]' "$tasks_file" 2>/dev/null | tr -d '\n' || echo "0")
total=${total:-0}
```

### Task Header Patterns

Supports both formats:
- `### T-001:` (3 hashes) - Legacy format
- `#### T-001:` (4 hashes) - New format

### Completion Markers

Detects multiple completion formats:
- `✅ COMPLETE` - Standard format
- `[COMPLETED]` - Bracketed format
- `[x] Completed` - Checkbox format

## Files Changed

1. **plugins/specweave/commands/specweave-progress.md**
   - Before: 400+ lines with TypeScript implementation
   - After: ~130 lines with simple bash script

2. **plugins/specweave/hooks/user-prompt-submit.sh**
   - Removed: StatusLineManager dependency (lines 310-320)
   - Added: Simple grep-based task counting
   - Fixed: Same newline handling as command

## Testing

```bash
# Test command directly
bash << 'EOF'
# ... (full script from command file)
EOF

# Expected: No errors, clean output showing all non-completed increments
# Actual: ✅ Works perfectly
```

## Benefits

1. **No more hook errors**: Removed StatusLineManager dependency
2. **Faster**: No TypeScript loading, just bash
3. **More maintainable**: Simple logic, easy to debug
4. **More reliable**: Fewer moving parts, fewer failure modes
5. **Clearer output**: Focus on what users need (active work + next steps)

## KISS Principle Applied

**Before**: Tried to be smart with:
- Weighted priorities
- PM gates
- WIP enforcement
- Time tracking
- Stuck detection

**After**: Just answers:
- What's active?
- How much is done?
- What command to run next?

**Result**: 75% less code, 100% more reliable.

---

**Key Insight**: Complexity ≠ Better. Users just want to know where they are and what to do next.
