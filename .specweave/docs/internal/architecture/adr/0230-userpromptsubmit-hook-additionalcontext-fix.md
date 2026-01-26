# ADR-0230: UserPromptSubmit Hook `additionalContext` Fix

**Status**: Accepted
**Date**: 2026-01-25
**Deciders**: Anton Abyzov
**Tags**: `hooks`, `claude-code`, `bugfix`, `user-prompt-submit`

---

## Context and Problem Statement

The `user-prompt-submit.sh` hook was outputting context injection using the wrong JSON field:

```json
{
  "decision": "approve",
  "systemMessage": "Use /sw:increment for this feature..."
}
```

**Problem**: `systemMessage` is **NOT a valid field** for Claude Code's `UserPromptSubmit` hooks!

The hook was successfully detecting plugins, installing them, and generating context - but Claude never saw the context because it was in an invalid field.

### Root Cause Discovery

During debugging, we observed:
- Hook output: `{"decision":"approve","systemMessage":"..."}`
- Claude received: `UserPromptSubmit hook success: Success`
- **Claude never saw the systemMessage content!**

After reviewing Claude Code documentation at [docs.claude.com/en/docs/claude-code/hooks](https://docs.claude.com/en/docs/claude-code/hooks), the correct format was discovered:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Your context injection here..."
  }
}
```

### Impact

- ~20 occurrences of `systemMessage` in `user-prompt-submit.sh`
- All context injection was silently ignored
- Plugin suggestions not shown to user
- Increment routing recommendations not shown
- TDD mode injection not working
- External folder detection not working

---

## Decision Drivers

1. **Context must reach Claude** - Critical for SpecWeave workflow
2. **Follow Claude Code spec** - Must use official hook schema
3. **Backward compatible** - Fix must not break existing functionality
4. **Document for future** - Prevent same mistake

---

## Decision Outcome

**Chosen Solution**: Replace all `systemMessage` with `additionalContext` using proper JSON structure.

### Implementation

Added helper function at line ~105 in `user-prompt-submit.sh`:

```bash
# Helper: Output approve response with context (Claude Code hook format v1.0.166)
# CRITICAL: systemMessage is NOT a valid field for UserPromptSubmit hooks!
# See: https://docs.claude.com/en/docs/claude-code/hooks#userpromptsubmit
output_approve_with_context() {
  local context="$1"
  local escaped
  escaped=$(escape_json_early "$context")
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$escaped"
}
```

Replaced all ~20 occurrences of:

```bash
# BEFORE (BROKEN)
printf '{"decision":"approve","systemMessage":"%s"}\n' "$message"
```

With:

```bash
# AFTER (WORKING)
output_approve_with_context "$message"
```

### Key Changes

| Aspect | Before (Broken) | After (Fixed) |
|--------|-----------------|---------------|
| Field name | `systemMessage` | `additionalContext` |
| Wrapper | None | `hookSpecificOutput.hookEventName` |
| Visibility | Silently ignored | Shown to Claude |

---

## Claude Code Hook Schema Reference

### UserPromptSubmit Hook Output

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "Context to inject into Claude's context"
  }
}
```

### Valid Hook Events

| Event | Purpose | Output Type |
|-------|---------|-------------|
| `UserPromptSubmit` | Before prompt processed | `additionalContext` |
| `PreToolUse` | Before tool execution | `decision` (allow/block) |
| `PostToolUse` | After tool execution | `continue` |
| `SessionStart` | Session begins | `additionalContext` |
| `Stop` | Session ends | None |

### Official Documentation

- **Claude Code Hooks Guide**: [docs.claude.com/en/docs/claude-code/hooks](https://docs.claude.com/en/docs/claude-code/hooks)
- **Hook Configuration**: [docs.claude.com/en/docs/claude-code/hooks#hook-configuration](https://docs.claude.com/en/docs/claude-code/hooks#hook-configuration)

---

## Consequences

### Positive

- Context injection now works correctly
- Plugin suggestions visible to Claude
- Increment routing recommendations shown
- TDD mode properly injected
- External folder detection working

### Negative

- None (pure bugfix)

---

## Related

- **ADR-0049**: Claude Code Hook Schema Correction (PostToolUse hooks)
- **File**: `plugins/specweave/hooks/user-prompt-submit.sh`
- **E2E Tests**: `tests/integration/hooks/user-prompt-submit-additionalcontext-e2e.test.ts`

---

## Test Coverage

E2E tests added in v1.0.167 verify:
- JSON output format compliance with Claude Code schema
- `hookSpecificOutput.additionalContext` used (NOT `systemMessage`)
- Dynamic context generation (TDD mode, WIP limits, external folders)
- Edge cases (special chars, long prompts, JSON-like content)

Run tests: `npx vitest run tests/integration/hooks/user-prompt-submit-additionalcontext-e2e.test.ts`

---

## Lessons Learned

1. **Always verify hook output format** against official Claude Code documentation
2. **Test hook output end-to-end** - not just that it runs, but that Claude sees the content
3. **Different hook events have different output schemas** - don't assume they're the same
4. **Add E2E tests for dynamic hook output** - static tests (checking file contains strings) don't catch runtime issues
