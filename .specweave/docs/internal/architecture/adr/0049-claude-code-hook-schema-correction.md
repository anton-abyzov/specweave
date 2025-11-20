# ADR-0049: Claude Code Hook Schema Correction

**Status**: Accepted
**Date**: 2025-11-20
**Deciders**: Anton Abyzov
**Tags**: `plugins`, `hooks`, `claude-code`, `bugfix`, `validation`

---

## Context and Problem Statement

In commit `4526048` (2025-11-19), we attempted to register the TodoWrite hook in `plugin.json` to enable automatic status line updates. However, we used an **invalid hook schema** that caused Claude Code to fail plugin validation with the error:

```
✗ specweave@specweave
  Plugin specweave has an invalid manifest file at
  /Users/antonabyzov/.claude/plugins/marketplace/specweave/plugins/specweave/.claude-plugin/plugin.json.

  Validation errors: hooks: Invalid input

  Please fix the manifest or remove it. The plugin cannot load with an invalid manifest.
```

This **critical bug prevented the entire SpecWeave plugin from loading**, affecting all users on v0.22.13.

### Root Cause

The plugin.json used an **invalid hook event name**:

```json
{
  "hooks": {
    "TodoWrite": {
      "post": "./hooks/post-task-completion.sh"
    }
  }
}
```

**Problem**: `"TodoWrite"` is **not a valid Claude Code hook event**. It's a tool name, not a hook type.

Claude Code only supports these 10 hook events:
- PostToolUse
- PreToolUse
- PermissionRequest
- Notification
- UserPromptSubmit
- Stop
- SubagentStop
- PreCompact
- SessionStart
- SessionEnd

### Impact

- ✗ Plugin failed to load entirely
- ✗ All SpecWeave functionality unavailable
- ✗ Users saw validation error every time Claude Code started
- ✗ Hooks never executed (status line updates broken)

---

## Decision Drivers

1. **Plugin must load** - Critical: users can't work if plugin doesn't load
2. **Hook must work** - TodoWrite hook is essential for status line synchronization
3. **Follow Claude Code spec** - Must use official hook schema
4. **Prevent future bugs** - Document correct pattern for all developers
5. **Fast release** - Critical bug requires immediate patch release

---

## Considered Options

### Option 1: Remove Hooks Entirely (Rejected)

**Pros**:
- Simple fix (delete hooks section)
- Plugin would load immediately

**Cons**:
- ✗ Loses automatic status line updates (critical feature)
- ✗ Regresses functionality from v0.22.12
- ✗ Doesn't solve the underlying problem

**Verdict**: ❌ **Rejected** - Too much functionality loss

---

### Option 2: Use Custom Hook Handler Script (Rejected)

**Pros**:
- Could intercept TodoWrite calls manually
- More control over hook execution

**Cons**:
- ✗ Still requires valid hook schema in plugin.json
- ✗ Adds complexity without solving validation error
- ✗ Doesn't address root cause (invalid schema)

**Verdict**: ❌ **Rejected** - Doesn't fix validation error

---

### Option 3: Use PostToolUse Event with Matcher (ACCEPTED ✅)

**Pros**:
- ✅ Uses valid Claude Code hook event (PostToolUse)
- ✅ Filters to TodoWrite calls via matcher
- ✅ Follows official Claude Code hook schema
- ✅ Plugin loads without validation errors
- ✅ Hook executes correctly
- ✅ Maintains all functionality

**Cons**:
- Requires updating plugin.json schema
- Requires documentation update

**Verdict**: ✅ **ACCEPTED** - Correct solution that fixes root cause

---

## Decision Outcome

**Chosen Option**: Option 3 - Use PostToolUse Event with Matcher

### Implementation

**File**: `plugins/specweave/.claude-plugin/plugin.json`

**Before** (v0.22.13 - BROKEN):
```json
{
  "name": "specweave",
  "version": "0.8.0",
  "hooks": {
    "TodoWrite": {
      "post": "./hooks/post-task-completion.sh"
    }
  }
}
```

**After** (v0.22.14 - FIXED):
```json
{
  "name": "specweave",
  "version": "0.22.14",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "TodoWrite",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/post-task-completion.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Key Changes

1. **Hook Event**: Changed from `"TodoWrite"` (invalid) → `"PostToolUse"` (valid)
2. **Matcher**: Added `"matcher": "TodoWrite"` to filter for TodoWrite tool calls
3. **Schema Format**: Changed from legacy `{"post": "path"}` → modern hooks array format
4. **Timeout**: Added explicit 10-second timeout for safety
5. **Command Path**: Used `${CLAUDE_PLUGIN_ROOT}` variable for portability

### Schema Breakdown

| Field | Type | Value | Purpose |
|-------|------|-------|---------|
| `PostToolUse` | array | Hook array | Valid Claude Code hook event (fires after tool execution) |
| `matcher` | string | `"TodoWrite"` | Regex pattern to match tool names (only triggers on TodoWrite calls) |
| `type` | string | `"command"` | Specifies this hook runs a shell command |
| `command` | string | `${CLAUDE_PLUGIN_ROOT}/hooks/...` | Path to hook script (uses plugin root variable) |
| `timeout` | number | `10` | Seconds before hook times out (prevents hanging) |

---

## Consequences

### Positive

- ✅ **Plugin loads successfully** - No more validation errors
- ✅ **Hook executes correctly** - TodoWrite calls trigger post-task-completion.sh
- ✅ **Status line updates work** - Automatic synchronization restored
- ✅ **Follows Claude Code spec** - Uses official hook schema
- ✅ **Documented pattern** - CLAUDE.md now has comprehensive hook registration guide
- ✅ **Fast resolution** - Fixed and released within 24 hours (critical patch)

### Negative

- ⚠️ **Version bump required** - All users must upgrade to v0.22.14
- ⚠️ **Breaking for old configs** - Any forks with old hook schema will break
- ⚠️ **Documentation debt** - Needed to document correct pattern (now resolved)

---

## Validation and Testing

### Validation Steps

1. ✅ **Schema Validation**: Updated plugin.json with correct PostToolUse schema
2. ✅ **Local Testing**: Forced marketplace refresh, verified plugin loads
3. ✅ **Hook Execution**: Verified TodoWrite triggers post-task-completion.sh
4. ✅ **Status Line Sync**: Confirmed status line updates correctly
5. ✅ **All Plugins Checked**: Verified no other plugins have invalid hooks

### Release Process

1. ✅ **Version Bump**: package.json → 0.22.14
2. ✅ **Plugin Versions**: All 25 plugin.json files → 0.22.14
3. ✅ **CHANGELOG Update**: Documented fix in CHANGELOG.md
4. ✅ **GitHub Release**: Created v0.22.14 release with detailed notes
5. ✅ **NPM Publish**: Published specweave@0.22.14 to npm registry
6. ✅ **Documentation**: Added comprehensive hook registration guide to CLAUDE.md

---

## Lessons Learned

### What Went Wrong

1. **Insufficient validation** - Didn't validate plugin.json schema before committing
2. **Assumed compatibility** - Thought "TodoWrite" was a valid hook event name
3. **No testing** - Didn't restart Claude Code to test plugin loading before pushing
4. **Unclear docs** - Claude Code hook documentation not prominent in CLAUDE.md

### Preventive Measures

1. **Pre-commit validation** - Consider adding plugin.json schema validation to pre-commit hooks
2. **Hook testing checklist** - Added to CLAUDE.md (restart Claude Code, verify loading)
3. **Schema documentation** - Comprehensive hook registration guide in CLAUDE.md
4. **ADR process** - Document all plugin manifest changes in ADRs going forward

---

## References

### Documentation
- **CLAUDE.md**: Section "Plugin Hook Registration (CRITICAL!)"
- **CHANGELOG.md**: v0.22.14 entry
- **GitHub Release**: https://github.com/anton-abyzov/specweave/releases/tag/v0.22.14

### Claude Code Documentation
- **Plugin Hooks Guide**: https://code.claude.com/docs/en/hooks-guide.md
- **Hooks Reference**: https://code.claude.com/docs/en/hooks.md
- **Plugin Manifest Schema**: https://code.claude.com/docs/en/plugins-reference.md

### Related Commits
- **b3e2f39** - fix(plugin): correct hooks schema in plugin.json - use PostToolUse with matcher
- **e13a61f** - chore(release): bump version to 0.22.14
- **4526048** - fix(hooks): register TodoWrite hook in plugin.json (BROKEN - led to this fix)

### Related Work
- **Status Line Synchronization** - ADR-0044 (automated status line updates)
- **TodoWrite Hook Integration** - Increment 0044 implementation
- **Three-Permission Architecture** - v0.24.0 sync settings (unrelated to this fix)

---

## Notes

- **Priority**: Critical - All users affected, immediate patch release required
- **Breaking**: No - Fix is backward compatible (just enables broken functionality)
- **Migration**: None - Users just upgrade to v0.22.14
- **Timeline**: Bug introduced 2025-11-19, fixed 2025-11-20 (24-hour turnaround)
