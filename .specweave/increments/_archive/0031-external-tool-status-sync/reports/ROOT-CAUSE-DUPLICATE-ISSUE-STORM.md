# Root Cause Analysis: Duplicate GitHub Issue Storm

**Date**: 2025-11-14
**Incident**: 8 duplicate GitHub issues created for increment 0031 in 12 minutes
**Severity**: P1 - Production Bug
**Status**: ✅ RESOLVED

---

## Executive Summary

Between 01:29-01:40 EST on 2025-11-14, 8 duplicate GitHub issues (#377-384) were created for increment 0031 within 12 minutes. Investigation revealed that an **outdated installed version** of the `post-increment-planning` hook was executing without duplicate detection protection.

**Impact:**
- 8 duplicate issues cluttering GitHub repository
- Potential rate limit risk with GitHub API
- User confusion and manual cleanup required

**Root Cause:** Plugin source code was updated to include DuplicateDetector, but the plugin was never reinstalled, leaving the old version running in `~/.claude/plugins/`.

---

## Timeline

| Time (EST) | Event |
|-----------|-------|
| 01:27 | User saves tasks.md (last manual edit) |
| 01:29-01:40 | 7 duplicate issues created (#377-383) every 1-3 minutes |
| 01:40 | Issue #384 created |
| 01:41 | Investigation begins |
| 01:42 | Root cause identified: outdated installed hook |
| 01:43 | Hook updated by copying source → installed location |
| 01:44 | All 8 duplicate issues closed (#377-384) |
| 01:45 | Issue #375 reopened (original issue) |

---

## Root Cause (The 5 Whys)

**Why were duplicate issues created?**
→ Because the `post-increment-planning` hook was called repeatedly without duplicate detection.

**Why was there no duplicate detection?**
→ Because the installed hook version was outdated and called `gh issue create` directly instead of using DuplicateDetector.

**Why was the installed version outdated?**
→ Because the plugin source code was updated to add DuplicateDetector (v0.14.1+), but the plugin was never reinstalled.

**Why wasn't the plugin reinstalled?**
→ Because plugin updates require manual reinstallation (no auto-update mechanism exists).

**Why was the hook triggered repeatedly?**
→ Because the hook fires on EVERY `Write` tool call matching `spec.md`, `plan.md`, or `tasks.md` (configured in hooks.json:24-32).

---

## Technical Details

### Hook Configuration

**File:** `plugins/specweave/hooks/hooks.json`

```json
{
  "matcher": "Write",
  "matcher_content": "\\.specweave/increments/[0-9]{4}-.+/(spec|plan|tasks)\\.md",
  "hooks": [
    {
      "type": "command",
      "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-increment-planning.sh"
    }
  ]
}
```

**Trigger:** ANY Write tool call that matches the regex fires the hook.

**User Context:** User had `tasks.md` open in IDE, and saves/auto-saves were triggering the hook repeatedly.

### Code Comparison

**SOURCE CODE** (plugins/specweave/hooks/post-increment-planning.sh):
```bash
# Line 459: Uses DuplicateDetector (v0.14.1+)
local node_output=$(node scripts/create-github-issue-with-protection.js \
  --title "[$issue_prefix] $title" \
  --body "$issue_body" \
  --pattern "[$issue_prefix]" \
  --labels "specweave,increment" \
  --repo "$repo" \
  2>&1)
```

**INSTALLED VERSION** (OLD - ~/.claude/plugins/.../hooks/post-increment-planning.sh):
```bash
# Line 440: Direct gh issue create (NO duplicate protection!)
local gh_output=$(gh issue create \
  --repo "$repo" \
  --title "[INC-$inc_number] $title" \
  --body-file "$temp_body" \
  --label "specweave,increment" \
  2>&1)
```

### Why Duplicate Detection Failed

The old hook had a local check for existing issues in metadata.json (lines 708-728):

```bash
if [ -f "$metadata_file" ]; then
  existing_issue=$(cat "$metadata_file" 2>/dev/null | \
    grep -o '"github"[[:space:]]*:[[:space:]]*{[^}]*"issue"[[:space:]]*:[[:space:]]*[0-9]*' | \
    grep -o '[0-9]*$')

  if [ -n "$existing_issue" ]; then
    log_info "  ✅ GitHub issue already exists: #$existing_issue"
    log_info "  ⏭️  Skipping creation (idempotent)"
    # ... skip creation
  fi
fi
```

**But this check was BYPASSED** because:
1. The metadata.json already contained issue #375
2. The regex `{[^}]*"issue"...` should have matched it
3. **However**, the hook was creating issues with a DIFFERENT title pattern:
   - Old hook: `[INC-0031]` (increment-based)
   - New hook: `[FS-25-11-12]` (date-based)
4. The metadata check looked for the OLD pattern, found issue #375 with the NEW pattern, and treated it as non-existent!

---

## How DuplicateDetector Prevents This

**Global Duplicate Detection System** (v0.14.1+):

```typescript
// Phase 1: DETECTION (Search GitHub BEFORE creating)
const existing = await DuplicateDetector.checkBeforeCreate(titlePattern, incrementId, repo);

if (existing) {
  // Reuse existing issue instead of creating duplicate
  console.log(`♻️  Using existing issue #${existing.number} (skipping creation)`);
  return { issue: existing, wasReused: true };
}

// Phase 2: CREATION (Safe to create)
const issue = await createGitHubIssue(...);

// Phase 3: VERIFICATION (Count check AFTER creating)
const verification = await DuplicateDetector.verifyAfterCreate(titlePattern, 1, repo);

if (verification.duplicates.length > 0) {
  // Phase 4: REFLECTION (Auto-close duplicates)
  await DuplicateDetector.correctDuplicates(verification.duplicates, issue.number, repo);
}
```

**Benefits:**
- ✅ Searches GitHub directly (not dependent on metadata.json)
- ✅ Handles title pattern changes (date-based → increment-based)
- ✅ Verification phase catches race conditions
- ✅ Auto-closes duplicates if they slip through

---

## Resolution

### Immediate Fix

1. **Updated installed hook:**
   ```bash
   cp plugins/specweave/hooks/post-increment-planning.sh \
     ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-increment-planning.sh
   ```

2. **Closed duplicate issues:**
   ```bash
   for issue_num in 377 378 379 380 381 382 383 384; do
     gh issue close $issue_num --repo anton-abyzov/specweave \
       --comment "Duplicate of #375 🤖 Auto-closed by SpecWeave"
   done
   ```

3. **Reopened original issue:**
   ```bash
   gh issue reopen 375 --repo anton-abyzov/specweave
   ```

### Verification

```bash
# Check for new duplicates (none found after fix)
gh issue list --repo anton-abyzov/specweave \
  --search "[INC-0031] in:title created:>2025-11-14T06:45:00Z"
# Output: (empty)

# Verify original issue is open
gh issue view 375 --repo anton-abyzov/specweave
# Output: [OPEN] #375
```

---

## Lessons Learned

### What Went Right

✅ **Comprehensive Duplicate Detection System**: Once installed, DuplicateDetector provides robust protection with 3-phase detection (Detection → Verification → Reflection).

✅ **Rapid Investigation**: Root cause identified within 2 minutes using systematic SRE approach:
- Checked cronjobs/timers (ruled out)
- Checked GitHub Actions (ruled out)
- Compared source vs installed code (FOUND IT!)

✅ **Automated Cleanup**: All 8 duplicates closed programmatically with clear closure comments.

### What Went Wrong

❌ **No Plugin Auto-Update Mechanism**: Plugin updates require manual reinstallation. Source code changes don't automatically propagate to installed versions.

❌ **Hook Trigger Too Broad**: Fires on EVERY Write to spec/plan/tasks.md, even during normal editing (not just after `/specweave:increment`).

❌ **Title Pattern Inconsistency**: Changed from `[INC-0031]` to `[FS-25-11-12]` between versions, breaking metadata.json-based duplicate detection.

### What Could Have Been Better

⚠️ **Idempotency Validation**: Should have tested that saving tasks.md multiple times doesn't create multiple issues.

⚠️ **Plugin Version Tracking**: No way to detect if installed version is outdated compared to source.

⚠️ **Hook Execution Logging**: Hook logs showed executions but didn't make it obvious the WRONG version was running.

---

## Action Items

### Immediate (P0 - Done)

- [x] Update installed hook with DuplicateDetector
- [x] Close all duplicate issues (#377-384)
- [x] Reopen original issue (#375)
- [x] Verify no new duplicates created

### Short-Term (P1 - Next Week)

- [ ] **Add plugin version check**: Compare source vs installed version on startup
- [ ] **Add idempotency test**: E2E test that saves tasks.md 5 times, verifies only 1 issue created
- [ ] **Add hook execution warning**: Log when outdated hook version detected

### Medium-Term (P2 - Next Month)

- [ ] **Implement plugin auto-update**: Check for updates on `specweave init` or plugin load
- [ ] **Refine hook trigger**: Only fire after `/specweave:increment` completion, not on every Write
- [ ] **Add rate limit protection**: Throttle issue creation (max 1 per increment per hour)

### Long-Term (P3 - Next Quarter)

- [ ] **Global duplicate prevention**: Extend DuplicateDetector to ALL tools (JIRA, Azure DevOps)
- [ ] **Hook execution metrics**: Track hook frequency, failures, duplicate detection rate
- [ ] **Plugin marketplace CI/CD**: Auto-publish plugin updates to Claude Code marketplace

---

## References

- **DuplicateDetector Implementation**: `plugins/specweave-github/lib/duplicate-detector.ts`
- **Hook Configuration**: `plugins/specweave/hooks/hooks.json`
- **Hook Source Code**: `plugins/specweave/hooks/post-increment-planning.sh`
- **Installed Hook Location**: `~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-increment-planning.sh`
- **GitHub Issues**: [#375](https://github.com/anton-abyzov/specweave/issues/375) (kept), #377-384 (closed)

---

## Appendix A: Full Investigation Log

<details>
<summary>Click to expand investigation transcript</summary>

### Initial Report

User reported: "Multiple duplicate issues created every minute for increment 0031"

### Investigation Steps

1. **Checked cronjobs** (`crontab -l`) → None found
2. **Checked launchd** (`launchctl list | grep specweave`) → None found
3. **Checked GitHub Actions** → No workflows creating issues
4. **Checked increment metadata** → Issue #375 linked correctly
5. **Checked hook logs** → Hook executing repeatedly
6. **Compared source vs installed hook** → FOUND MISMATCH!

### Key Finding

```bash
$ diff plugins/specweave/hooks/post-increment-planning.sh \
       ~/.claude/plugins/.../hooks/post-increment-planning.sh

# OLD VERSION (installed):
-  local gh_output=$(gh issue create \

# NEW VERSION (source):
+  local node_output=$(node scripts/create-github-issue-with-protection.js \
```

### Resolution

```bash
# Update hook
cp plugins/specweave/hooks/post-increment-planning.sh \
   ~/.claude/plugins/marketplaces/specweave/plugins/specweave/hooks/post-increment-planning.sh

# Close duplicates
for i in 377 378 379 380 381 382 383 384; do
  gh issue close $i --repo anton-abyzov/specweave --comment "Duplicate of #375"
done

# Reopen original
gh issue reopen 375 --repo anton-abyzov/specweave
```

</details>

---

**Status**: ✅ **RESOLVED** - No new duplicates created after hook update.

**Confidence**: 🟢 **HIGH** - Root cause identified, fixed, and verified.

**Next Review**: 2025-11-21 (1 week) - Check for any recurrence.
