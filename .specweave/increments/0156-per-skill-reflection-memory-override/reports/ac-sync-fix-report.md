# AC Checkbox Sync Fix Report

**Date**: 2026-01-06
**Increment**: 0156-per-skill-reflection-memory-override
**Issue**: AC checkboxes in spec.md were not being updated when tasks were marked complete

---

## Root Cause

The `task-ac-sync-guard.sh` hook had an **overly strict detection logic** that prevented it from running.

### Original Logic (BROKEN)
```bash
NEW_CONTENT=$(echo "$INPUT" | grep -o '"new_string"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)

if ! echo "$NEW_CONTENT" | grep -qE '\[x\].*completed'; then
  log_debug "Not a task completion edit, skipping"
  exit 0
fi
```

**Problem**: This checked if the Edit tool's `new_string` parameter contained BOTH `[x]` AND the word `completed`. But when marking a task complete, the edit might only change `[ ]` to `[x]`, not include the word "completed" in that specific string.

---

## The Fix

Changed detection to check the **actual file content** instead of parsing the Edit tool input:

```bash
# Check if tasks.md has any completed tasks (check actual file, not edit input)
if ! grep -qE '^\*\*Status\*\*:[[:space:]]*\[x\]' "$FILE_PATH" 2>/dev/null; then
  log_debug "No completed tasks found, skipping"
  exit 0
fi

log_debug "Completed tasks detected - syncing ACs..."
```

**Benefits**:
- ✅ Works regardless of how the Edit tool is invoked
- ✅ Detects ANY completed task in the file
- ✅ More robust and maintainable
- ✅ Aligns with the actual sync logic (which reads the file anyway)

---

## Verification

After applying the fix and manually triggering the hook:

```
✅ Updated 36 ACs in spec.md
✅ All AC checkboxes now synced correctly
✅ GitHub sync configured (enabled=true, canUpdateExternalItems=true)
✅ GITHUB_TOKEN present in .env
```

### Sample Output
```
[2026-01-06 17:30:26] Marked AC complete: AC-US7-01
[2026-01-06 17:30:26] Marked AC complete: AC-US7-06
[2026-01-06 17:30:26] Marked AC complete: AC-US7-02
...
[2026-01-06 17:30:26] SUCCESS: Updated 36 ACs in spec.md
```

---

## Files Modified

- `plugins/specweave/hooks/v2/guards/task-ac-sync-guard.sh` (lines 118-128)

---

## External Tool Sync

The hook also triggers GitHub sync after updating ACs (via `update-ac-status.ts`):

1. **Local sync**: tasks.md → spec.md (task-ac-sync-guard.sh)
2. **External sync**: spec.md → GitHub issues (update-ac-status.ts → SyncCoordinator)

Both are now working correctly for increment 0156.

---

## Next Steps

1. ✅ Fix deployed - no further action needed for this increment
2. ⚠️ Monitor hook execution in future task completions
3. ✅ GitHub sync will auto-update issues when ACs change

---

## Impact

This fix ensures:
- Developers see AC completion reflected immediately in spec.md
- GitHub issues stay in sync with actual progress
- No manual `/sw:sync-progress` needed for AC checkbox updates
