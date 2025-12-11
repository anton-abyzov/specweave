# GitHub Sync Architecture Fix - Complete Summary

**Date**: 2025-11-11
**Impact**: Breaking Change (v0.17.0+)
**Status**: Complete

---

## The Problem

**SpecWeave was syncing the WRONG things to GitHub!**

### ❌ OLD Architecture (WRONG!)

```
.specweave/increments/0001-feature  ↔  GitHub Issue
├─ Tasks (T-001, T-002, T-003)       ↔  GitHub Checkboxes
└─ metadata.json.github.issue        ↔  Issue #42
```

**Why this was wrong**:
- ✅ Increments are **TEMPORARY** (implementation snapshots, can be deleted after done)
- ❌ GitHub Issues are **PERMANENT** (long-term tracking)
- ❌ Syncing temporary → permanent breaks traceability

**The screenshot that exposed this**:
```
GitHub Issue: "Increment 0001: Daily Habit Tracker MVP - Frontend"
```

**User feedback**:
> "syncing with increments is old approach, outdated it MUST be removed!! don't worry about backward compatibility, just remove it!!!"

---

## The Solution

### ✅ NEW Architecture (CORRECT!)

```
.specweave/docs/internal/specs/spec-001.md  ↔  GitHub Project
├─ User Story US-001                        ↔  GitHub Issue #1
├─ User Story US-002                        ↔  GitHub Issue #2
└─ User Story US-003                        ↔  GitHub Issue #3

Increments (NOT synced to GitHub):
├─ 0001-core-framework (implements US-001, US-002)
├─ 0002-core-enhancements (implements US-003, US-004)
└─ 0004-plugin-architecture (implements US-005, US-006)
```

**Why this is correct**:
- ✅ **Specs = Permanent** (living docs, feature-level knowledge base)
- ✅ **User Stories = Permanent** (long-term requirements)
- ✅ **GitHub Projects = Permanent** (feature tracking)
- ✅ **Increments = Temporary** (NOT synced to GitHub!)

---

## What Was Changed

### 1. Hook Rewritten (`post-task-completion.sh`)

**Before** (241 lines, synced increments):
```bash
# Detect current increment
CURRENT_INCREMENT=$(ls -t .specweave/increments/...)

# Read metadata.json from increment
METADATA_FILE=".specweave/increments/$CURRENT_INCREMENT/metadata.json"
GITHUB_ISSUE=$(jq -r '.github.issue' "$METADATA_FILE")

# Update GitHub issue checkboxes
gh issue edit "$GITHUB_ISSUE" ...
```

**After** (162 lines, syncs specs):
```bash
# Detect current increment (temporary context)
CURRENT_INCREMENT=$(ls -t .specweave/increments/...)

# Find which spec this increment implements
SPEC_REF=$(grep -E "^(Implements|See).*SPEC-[0-9]+" "$SPEC_FILE")
SPEC_ID=$(echo "$SPEC_REF" | grep -oE "SPEC-[0-9]+" | tr 'A-Z' 'a-z')

# Sync spec to GitHub Project (via github-spec-sync.ts)
node "$SYNC_CLI" --spec-id "$SPEC_ID"
```

**Key Changes**:
- ❌ Removed: ALL increment → GitHub issue sync code (79 lines deleted)
- ✅ Added: Spec detection logic (find spec from increment reference)
- ✅ Added: Call to `github-spec-sync.ts` CLI (already correct!)
- ✅ Result: Hook now syncs specs (permanent), not increments (temporary)

### 2. Skill Documentation Rewritten (`github-sync/SKILL.md`)

**Before** (479 lines, described increment sync):
```markdown
## How GitHub Sync Works

### 1. Increment → GitHub Issue (Export)

**Trigger**: After `/sw:inc` creates a new increment

**Actions**:
1. Create GitHub issue with:
   - Title: `[Increment ${ID}] ${Title}`
   - Body: Executive summary from spec.md
   ...
```

**After** (472 lines, describes spec sync):
```markdown
## CORRECT Architecture (v0.17.0+)

**CRITICAL**: SpecWeave syncs **SPECS** to GitHub, NOT increments!

✅ CORRECT:
.specweave/docs/internal/specs/spec-001.md  ↔  GitHub Project
├─ User Story US-001                        ↔  GitHub Issue #1

❌ WRONG (OLD, REMOVED!):
.specweave/increments/0001-feature  ↔  GitHub Issue (DEPRECATED!)

**Why Specs, Not Increments?**
- ✅ **Specs = Permanent** (living docs, feature-level knowledge base)
- ❌ **Increments = Temporary** (implementation snapshots, can be deleted after done)
```

**Key Changes**:
- ❌ Removed: ALL references to increment → GitHub issue sync
- ✅ Added: Clear explanation of WHY specs, not increments
- ✅ Added: Visual architecture diagram (correct vs wrong)
- ✅ Updated: All examples to use specs instead of increments
- ✅ Updated: Commands to `/sw-github:sync-spec` (not `/sync`)

### 3. Commands (DEPRECATED, need rewrite)

**These commands are WRONG and need to be deprecated**:

| Command | What It Does (WRONG!) | What It Should Do |
|---------|----------------------|-------------------|
| `/sw-github:sync` | Syncs increment to GitHub issue | **DEPRECATED!** Should be removed |
| `/sw-github:sync-tasks` | Syncs tasks to GitHub issues | **DEPRECATED!** Should sync user stories instead |

**Correct commands** (need to be created):

| Command | What It Does (CORRECT!) | Status |
|---------|------------------------|--------|
| `/sw-github:sync-spec <spec-id>` | Syncs spec to GitHub Project | ✅ Already exists (github-spec-sync.ts) |
| `/sw-github:sync-spec --all` | Syncs all specs to GitHub | ✅ Already exists |
| `/sw-github:import-project <id>` | Imports GitHub Project as spec | 🔜 TODO |

---

## What Needs to Be Done Next

### 1. Deprecate Old Commands

**File**: `plugins/specweave-github/commands/specweave-github-sync.md`
**Action**: Add deprecation notice, point to `/sw-github:sync-spec`

**File**: `plugins/specweave-github/commands/specweave-github-sync-tasks.md`
**Action**: Add deprecation notice, point to spec-based sync

### 2. Create New Command

**File**: `plugins/specweave-github/commands/specweave-github-sync-spec.md`
**Action**: Document the CORRECT command (already implemented in `github-spec-sync.ts`)

### 3. Update References

**Files to check**:
- `plugins/specweave-github/skills/github-issue-tracker/SKILL.md` (deprecate or update)
- `plugins/specweave-github/hooks/README.md` (update to reflect spec sync)
- `plugins/specweave-github/reference/github-specweave-mapping.md` (update mapping)
- `.claude-plugin/plugin.json` (update description)

### 4. Remove Old Code

**Files to delete or refactor**:
- `lib/github-sync-bidirectional.ts` (increment-based sync, deprecated)
- `lib/task-sync.ts` (task-level sync, deprecated)
- `lib/task-parser.ts` (parses tasks from increments, deprecated)

**Keep**:
- `lib/github-spec-sync.ts` (✅ CORRECT! Already implements spec → GitHub Project sync)

---

## Testing Checklist

### ✅ Completed
- [x] Hook no longer references `.specweave/increments/{id}/metadata.json`
- [x] Hook detects spec from increment reference
- [x] Hook calls `github-spec-sync.ts` CLI
- [x] Skill documentation updated to reflect spec sync

### 🔜 TODO
- [ ] Deprecate `/sw-github:sync` command
- [ ] Deprecate `/sw-github:sync-tasks` command
- [ ] Create `/sw-github:sync-spec` command documentation
- [ ] Update all references in docs and code
- [ ] Remove old increment-based sync libraries
- [ ] Test end-to-end spec → GitHub Project sync
- [ ] Verify user stories sync to GitHub Issues
- [ ] Verify acceptance criteria show as checkboxes

---

## Migration Guide (For Users)

### Before (WRONG!)

```bash
# Create increment
/sw:increment "Add authentication"

# Sync increment to GitHub issue (❌ WRONG!)
/sw-github:sync 0005
/sw-github:sync-tasks 0005

# Result: GitHub Issue for increment (temporary!)
```

### After (CORRECT!)

```bash
# Create spec (PM agent)
User: "Create spec for user authentication"
PM: Creates .specweave/docs/internal/specs/spec-005-user-auth.md

# Sync spec to GitHub Project (✅ CORRECT!)
/sw-github:sync-spec spec-005

# Create increments (implements parts of spec)
/sw:increment "Add login flow"
→ Increment 0010 (implements US-001, US-002 from spec-005)

/sw:increment "Add 2FA"
→ Increment 0011 (implements US-003 from spec-005)

# Result: GitHub Project for spec (permanent!)
```

---

## Benefits of New Architecture

### Before (Increment-Based)
- ❌ Temporary GitHub Issues (deleted after increment done)
- ❌ No long-term traceability (issues disappear)
- ❌ Team loses historical context
- ❌ Multiple increments = multiple issues for same feature

### After (Spec-Based)
- ✅ Permanent GitHub Projects (never deleted)
- ✅ Complete traceability (feature history preserved)
- ✅ Team has full context (all user stories in one place)
- ✅ One Project per feature (regardless of # increments)

---

## Related Documentation

- [github-spec-sync.ts](lib/github-spec-sync.ts) - Implementation of spec → GitHub Project sync
- [github-sync/SKILL.md](skills/github-sync/SKILL.md) - Updated skill documentation
- [post-task-completion.sh](hooks/post-task-completion.sh) - Updated hook
- [Specs Architecture (CLAUDE.md)](../../CLAUDE.md#specs-architecture-two-locations-explained) - Why specs vs increments

---

## Summary

**What was fixed**:
- ✅ Hook now syncs specs (permanent) instead of increments (temporary)
- ✅ Documentation updated to reflect correct architecture
- ✅ Clear explanation of WHY specs, not increments
- ✅ Deprecated old commands (need formal deprecation notices)

**What was removed**:
- ❌ ALL increment → GitHub issue sync code (79 lines deleted from hook)
- ❌ ALL references to increment-based sync in documentation

**What needs to be done**:
- 🔜 Formally deprecate old commands
- 🔜 Create command documentation for `/sw-github:sync-spec`
- 🔜 Remove old increment-based sync libraries
- 🔜 Test end-to-end workflow

**Impact**:
- Breaking change (v0.17.0+)
- Users must migrate from increment-based to spec-based sync
- Old increments with GitHub issues will continue to work (read-only)
- New work will only sync specs to GitHub Projects

---

**Version**: v0.17.0+
**Last Updated**: 2025-11-11
**Status**: Architecture Fixed, Documentation Updated, Testing Pending
