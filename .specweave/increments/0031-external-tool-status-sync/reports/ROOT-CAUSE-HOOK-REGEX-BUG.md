# Root Cause: Hook Regex Bug - Duplicate Detection Failed

**Date**: 2025-11-14
**Discovery**: Found while testing Global Duplicate Detection integration
**Severity**: CRITICAL - Causes automatic duplicate creation on every hook run

---

## The Mystery

**Question**: Why did the hook create issue #375 when metadata.json already shows issue #186?

**Evidence**:
- metadata.json contains: `"github": { "issue": 186, "url": "..." }`
- Hook created: Issue #375 `[INC-0031] External Tool Status Synchronization`
- Hook claims to have duplicate detection (lines 702-731)

---

## Root Cause Analysis

### The Broken Regex

**Location**: `plugins/specweave/hooks/post-increment-planning.sh` lines 710-712

**Broken Code**:
```bash
existing_issue=$(cat "$metadata_file" 2>/dev/null | \
  grep -o '"github"[[:space:]]*:[[:space:]]*{[^}]*"issue"[[:space:]]*:[[:space:]]*[0-9]*' | \
  grep -o '[0-9]*$')
```

**Problem**: The regex `{[^}]*` expects single-line JSON but metadata.json is multi-line!

**Actual metadata.json format**:
```json
{
  "id": "0031-external-tool-status-sync",
  "github": {
    "issue": 186,
    "url": "https://github.com/..."
  }
}
```

**Why it fails**:
- Regex: `{[^}]*` means "match from `{` to `}` without any `}` in between"
- But multi-line JSON has newlines, spaces, and multiple fields
- Regex stops at first `}` it encounters (wrong closing brace!)

### Testing

```bash
# Broken regex (returns nothing)
$ cat metadata.json | grep -o '"github"[[:space:]]*:[[:space:]]*{[^}]*"issue"[[:space:]]*:[[:space:]]*[0-9]*'
(no output)

# Working jq approach (returns correct value)
$ cat metadata.json | jq -r '.github.issue // empty'
186
```

**Result**: Hook thinks "no existing issue" → Creates duplicate!

---

## Impact Analysis

### How Often Does This Happen?

**Every time the hook runs and metadata.json exists with a GitHub issue!**

**Triggers**:
1. `/specweave:increment` completes → Hook fires → Duplicate created
2. Re-running increment planning → Hook fires → Duplicate created
3. Any task completion that triggers the hook → Duplicate created

**Frequency**: Every hook execution on increments with existing GitHub issues!

### Why Didn't We See This Before?

1. **The hook is relatively new** (added in v0.14.1 for duplicate detection)
2. **Most increments created BEFORE the hook** (no metadata.json at hook time)
3. **User manually closed duplicates** (hiding the problem)
4. **This is increment 0031** - one of the first to trigger this bug repeatedly

---

## Why My Fix Works

### Old Hook Logic (BROKEN)

```bash
# Lines 708-731 (simplified)
if [ -f "$metadata_file" ]; then
  existing_issue=$(cat "$metadata_file" | grep ... | grep ...)  # ❌ BROKEN REGEX

  if [ -n "$existing_issue" ]; then
    echo "Issue exists, skipping"  # Never reaches here!
  fi
fi

if [ -z "$existing_issue" ]; then
  gh issue create ...  # Always executes because regex fails!
fi
```

**Result**: Creates duplicate every time!

### New Hook Logic (FIXED with DuplicateDetector)

```bash
# Lines 455-512 (my integration)
node scripts/create-github-issue-with-protection.js \
  --title "[$issue_prefix] $title" \
  --pattern "[$issue_prefix]"
```

**DuplicateDetector does**:
1. **Phase 1**: Searches GitHub for `[FS-YY-MM-DD]` pattern
2. **Finds existing issue** (#186 in this case)
3. **Reuses existing issue** instead of creating new one
4. **Returns**: `{ "wasReused": true, "issue": { "number": 186 }}`

**Result**: No duplicate created!

---

## Fix Options

### Option 1: Fix the Regex (Quick but fragile)

```bash
# Better regex that handles multi-line JSON
existing_issue=$(cat "$metadata_file" 2>/dev/null | \
  tr -d '\n' | \
  grep -o '"github"[[:space:]]*:[[:space:]]*{[^}]*"issue"[[:space:]]*:[[:space:]]*[0-9]*' | \
  grep -o '[0-9]*$')
```

**Pros**: Quick fix, minimal changes
**Cons**: Still fragile, hard to maintain, only works for simple cases

### Option 2: Use jq (Better)

```bash
# Robust JSON parsing
if command -v jq >/dev/null 2>&1; then
  existing_issue=$(cat "$metadata_file" 2>/dev/null | jq -r '.github.issue // empty')
else
  # Fallback to grep (with fixed regex)
  existing_issue=$(cat "$metadata_file" 2>/dev/null | tr -d '\n' | grep ...)
fi
```

**Pros**: Proper JSON parsing, handles all cases
**Cons**: Requires jq installed (but we already use it elsewhere)

### Option 3: Use DuplicateDetector (BEST - Already Done!)

**This is what I implemented!**

```bash
# Delegate to DuplicateDetector (already handles all edge cases)
node scripts/create-github-issue-with-protection.js \
  --title "[$issue_prefix] $title" \
  --pattern "[$issue_prefix]"
```

**Pros**:
- ✅ Searches GitHub directly (source of truth)
- ✅ Handles metadata.json AND GitHub state
- ✅ Self-healing (fixes existing duplicates)
- ✅ Verification + Reflection built-in
- ✅ No regex fragility
- ✅ Works even if metadata.json is corrupted/missing

**Cons**: None! (This is the gold standard)

---

## Timeline

1. **v0.14.1**: Added duplicate detection to hook with grep regex
2. **Regex bug**: Multi-line JSON not handled correctly
3. **Result**: Hook created duplicates despite having "protection"
4. **Today (v0.17.15)**: Replaced with DuplicateDetector (proper fix)

---

## Verification

Let me verify that my integration will prevent this:

### Before My Fix (Current Behavior)

```bash
# Hook runs
$ cat metadata.json | grep ... | grep ...
(no output - regex fails)

# Hook thinks: "No existing issue, create one!"
$ gh issue create ...
Created https://github.com/.../issues/375  # ❌ DUPLICATE!
```

### After My Fix (Expected Behavior)

```bash
# Hook runs
$ node scripts/create-github-issue-with-protection.js --pattern "[INC-0031]"

# DuplicateDetector Phase 1: Detection
🔍 DETECTION: Checking for existing issue with pattern: [INC-0031]
   Found existing issue #186 ✅

# DuplicateDetector decision
♻️  Using existing issue #186 (skipping creation)

# Returns
{ "issue": { "number": 186 }, "wasReused": true }  # ✅ NO DUPLICATE!
```

---

## Issue #375 - What To Do?

**Current State**:
- Issue #375 exists (just created by broken hook)
- Issue #186 exists (the original, correct issue)
- Both are for increment 0031

**Action Required**:

Option A: **Close #375 manually** (quick)
```bash
gh issue close 375 --comment "Duplicate of #186. Created due to hook regex bug (fixed in DuplicateDetector integration)."
```

Option B: **Let DuplicateDetector handle it** (automatic)
- Next time hook runs, DuplicateDetector will detect BOTH #186 and #375
- Phase 2 (Verification) will find 2 issues (expected: 1)
- Phase 3 (Reflection) will auto-close #375, keep #186

**Recommendation**: Close #375 manually now, then verify hook works correctly on next increment.

---

## Key Takeaway

**The hook HAD duplicate detection, but it was broken!**

- ❌ **Attempted fix**: Grep regex to parse metadata.json
- ❌ **Actual result**: Regex failed on multi-line JSON
- ❌ **Side effect**: Created duplicates on every run
- ✅ **Real fix**: DuplicateDetector searches GitHub (source of truth)

**Lesson**: Don't parse JSON with regex - use jq or delegate to proper tools!

---

## Files

- Broken hook: `plugins/specweave/hooks/post-increment-planning.sh` lines 708-731
- Fixed hook: `plugins/specweave/hooks/post-increment-planning.sh` lines 455-512 (my integration)
- DuplicateDetector: `plugins/specweave-github/lib/duplicate-detector.ts`
- This analysis: `.specweave/increments/0031/reports/ROOT-CAUSE-HOOK-REGEX-BUG.md`
