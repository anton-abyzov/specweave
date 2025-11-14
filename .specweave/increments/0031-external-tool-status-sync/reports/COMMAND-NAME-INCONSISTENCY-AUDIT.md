# Command Name Inconsistency Audit

**Date**: 2025-11-14
**Severity**: P1 - Naming Inconsistency Across Plugins
**Status**: 🔍 IDENTIFIED

---

## Summary

**Discovered systematic inconsistency** in command naming across plugins. Some commands use correct `plugin:command` notation with colons, while others use incorrect `plugin-command` notation with hyphens only.

**Impact:**
- Confusing command invocation (which syntax to use?)
- Inconsistent user experience
- Potential duplicate registrations if both exist

---

## Audit Results

### ✅ Core Plugin (specweave)

**Status:** MOSTLY CORRECT (1 exception)

```bash
name: specweave:do               ✅ Correct
name: specweave:done             ✅ Correct
name: specweave:increment        ✅ Correct
name: specweave:next             ✅ Correct
name: specweave:progress         ✅ Correct
name: specweave:validate         ✅ Correct
name: specweave                  ⚠️  Exception (reference command, not a real command)
```

**Action:** Reference command already fixed (in this increment).

---

### ❌ GitHub Plugin (specweave-github)

**Status:** INCONSISTENT (3 wrong out of 9)

#### ✅ Correct (6 commands):
```bash
name: specweave-github:close-issue      ✅
name: specweave-github:create-issue     ✅
name: specweave-github:status           ✅
name: specweave-github:sync             ✅
name: specweave-github:sync-from        ✅
name: specweave-github:sync-tasks       ✅
```

#### ❌ WRONG (3 commands):
```bash
name: specweave-github-cleanup-duplicates   ❌ Missing colon!
name: specweave-github-sync-epic            ❌ Missing colon!
name: specweave-github-sync-spec            ❌ Missing colon!
```

**Should be:**
```bash
name: specweave-github:cleanup-duplicates   ✅
name: specweave-github:sync-epic            ✅
name: specweave-github:sync-spec            ✅
```

**Files to fix:**
- `plugins/specweave-github/commands/specweave-github-cleanup-duplicates.md`
- `plugins/specweave-github/commands/specweave-github-sync-epic.md`
- `plugins/specweave-github/commands/specweave-github-sync-spec.md`

---

### ❌ JIRA Plugin (specweave-jira)

**Status:** INCONSISTENT (2 wrong out of 3)

#### ✅ Correct (1 command):
```bash
name: specweave-jira:sync               ✅
```

#### ❌ WRONG (2 commands):
```bash
name: specweave-jira-sync-epic          ❌ Missing colon!
name: specweave-jira-sync-spec          ❌ Missing colon!
```

**Should be:**
```bash
name: specweave-jira:sync-epic          ✅
name: specweave-jira:sync-spec          ✅
```

**Files to fix:**
- `plugins/specweave-jira/commands/specweave-jira-sync-epic.md`
- `plugins/specweave-jira/commands/specweave-jira-sync-spec.md`

---

### ❌ Azure DevOps Plugin (specweave-ado)

**Status:** INCONSISTENT (1 wrong out of 5)

#### ✅ Correct (4 commands):
```bash
name: specweave-ado:close-workitem      ✅
name: specweave-ado:create-workitem     ✅
name: specweave-ado:status              ✅
name: specweave-ado:sync                ✅
```

#### ❌ WRONG (1 command):
```bash
name: specweave-ado-sync-spec           ❌ Missing colon!
```

**Should be:**
```bash
name: specweave-ado:sync-spec           ✅
```

**Files to fix:**
- `plugins/specweave-ado/commands/specweave-ado-sync-spec.md`

---

### ✅ Release Plugin (specweave-release)

**Status:** INCONSISTENT (1 wrong out of 4)

#### ✅ Correct (3 commands):
```bash
name: specweave-release:init            ✅
name: specweave-release:align           ✅
name: specweave-release:rc              ✅
```

#### ❌ WRONG (1 command):
```bash
name: specweave-release-platform        ❌ Missing colon!
```

**Should be:**
```bash
name: specweave-release:platform        ✅
```

**Files to fix:**
- `plugins/specweave-release/commands/specweave-release-platform.md`

---

## Root Cause

**Inconsistent naming conventions** during plugin development:
- Older commands (sync-spec, sync-epic, cleanup-duplicates) used hyphen-only notation
- Newer commands (sync, create-issue, status) use correct colon notation
- No validation or linting to enforce consistent naming

---

## Impact Analysis

### User Experience Impact

**Confusion:**
- Users don't know which syntax to use
- Documentation might show both formats
- Examples inconsistent across docs

**Potential Issues:**
- Commands might not be discoverable
- Slash command completion might fail
- Integration scripts might break if name changes

### Technical Impact

**Current State:**
- Commands ARE registered (they work!)
- But with inconsistent names

**If We Fix:**
- Need to ensure backward compatibility
- Update ALL documentation references
- Update ALL example code
- Potentially create aliases for old names

---

## Recommended Fix Strategy

### Option 1: Fix All At Once (BREAKING CHANGE)

**Pros:**
- Clean, consistent naming immediately
- No legacy baggage

**Cons:**
- Breaks existing user scripts/workflows
- Requires communication/migration guide

### Option 2: Gradual Migration (RECOMMENDED)

**Pros:**
- Non-breaking (both old and new work)
- Users have time to migrate
- Clear deprecation path

**Cons:**
- Temporary duplication
- Need to maintain both versions

### Recommended Approach: Option 2

1. **Create new commands** with correct names (with colons)
2. **Keep old commands** but mark as deprecated in description
3. **Add warning** when old command used: "This command is deprecated, use `/specweave-github:sync-spec` instead"
4. **Remove old commands** in next major version (v1.0.0)

---

## Files to Fix

### Total: 7 commands across 4 plugins

#### GitHub Plugin (3 files):
- [ ] `plugins/specweave-github/commands/specweave-github-cleanup-duplicates.md`
  - Change: `name: specweave-github-cleanup-duplicates` → `name: specweave-github:cleanup-duplicates`
- [ ] `plugins/specweave-github/commands/specweave-github-sync-epic.md`
  - Change: `name: specweave-github-sync-epic` → `name: specweave-github:sync-epic`
- [ ] `plugins/specweave-github/commands/specweave-github-sync-spec.md`
  - Change: `name: specweave-github-sync-spec` → `name: specweave-github:sync-spec`

#### JIRA Plugin (2 files):
- [ ] `plugins/specweave-jira/commands/specweave-jira-sync-epic.md`
  - Change: `name: specweave-jira-sync-epic` → `name: specweave-jira:sync-epic`
- [ ] `plugins/specweave-jira/commands/specweave-jira-sync-spec.md`
  - Change: `name: specweave-jira-sync-spec` → `name: specweave-jira:sync-spec`

#### ADO Plugin (1 file):
- [ ] `plugins/specweave-ado/commands/specweave-ado-sync-spec.md`
  - Change: `name: specweave-ado-sync-spec` → `name: specweave-ado:sync-spec`

#### Release Plugin (1 file):
- [ ] `plugins/specweave-release/commands/specweave-release-platform.md`
  - Change: `name: specweave-release-platform` → `name: specweave-release:platform`

---

## Implementation Plan

### Phase 1: Immediate (This Increment)

- [ ] Fix all 7 command name fields (YAML frontmatter)
- [ ] Update command descriptions to reflect correct invocation
- [ ] Test that commands still work with new names

### Phase 2: Documentation (Next Increment)

- [ ] Update CLAUDE.md references
- [ ] Update README.md examples
- [ ] Update internal docs
- [ ] Update website docs

### Phase 3: Validation (Future)

- [ ] Add lint rule: Command names MUST have colon between plugin and command
- [ ] Add CI check to enforce naming convention
- [ ] Update plugin template with correct naming pattern

---

## Related Issues

- **Duplicate SlashCommand Invocation** ([0031/ROOT-CAUSE-DUPLICATE-SLASH-COMMAND-INVOCATION.md](./ROOT-CAUSE-DUPLICATE-SLASH-COMMAND-INVOCATION.md)): Router confusion causing duplicate invocations
- **GitHub Issue Duplicates** ([0031/ROOT-CAUSE-DUPLICATE-ISSUE-STORM.md](./ROOT-CAUSE-DUPLICATE-ISSUE-STORM.md)): Multiple duplicate issues created

**Common Thread:** Inconsistency and lack of validation leads to confusion and bugs.

---

## Status

🔍 **IDENTIFIED** - Audit complete, fix plan ready

**Next Steps:**
1. Fix all 7 command YAML name fields
2. Test commands work with new names
3. Update documentation in next increment

---

**Date Completed:** 2025-11-14
**Reviewed By:** Claude AI (Root Cause Analysis)
