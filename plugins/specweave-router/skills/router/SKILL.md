---
name: specweave-router
description: |
  DEPRECATED: This skill is obsolete as of v1.0.140+.
  Plugin detection is now handled by `detect-intent` command via the user-prompt-submit hook.
  This skill remains for backward compatibility only.
visibility: public
user-invocable: false
allowed-tools:
  - Bash
  - Skill
---

# SpecWeave Router (DEPRECATED)

> **OBSOLETE AS OF v1.0.140+**
>
> Plugin detection and routing is now handled by the **`detect-intent` command**, which is called
> automatically from the `user-prompt-submit.sh` hook BEFORE every prompt.
>
> **DO NOT USE THIS SKILL** - it no longer controls plugin installation or routing.

## Current Architecture (v1.0.140+)

```
User Prompt
    ↓
user-prompt-submit.sh hook (AUTOMATIC)
    ↓
specweave detect-intent --file "$PROMPT_TMP_FILE" --install --silent
    ↓
LLM (Claude Haiku) analyzes prompt
    ↓
Returns: { plugins: [...], increment: {...}, routing: {...} }
    ↓
Auto-installs missing plugins
    ↓
Injects TDD context if testing.defaultTestMode: "TDD"
    ↓
Original prompt continues
```

## What detect-intent Does

The `detect-intent` command (in `src/cli/commands/detect-intent.ts`) uses LLM to:

1. **Detect plugins needed** - Based on prompt keywords/context
2. **Suggest increment actions** - new, reopen, small_fix, hotfix, none
3. **Route to skills** - Which specialized skills should handle the task

## TDD Context Injection

The hook (`user-prompt-submit.sh` lines 599-714) also:

1. Checks `testing.defaultTestMode` in config
2. If "TDD", injects TDD context banner into every prompt
3. Checks per-increment overrides via `testing:` frontmatter

**TDD Configuration Priority:**
```
Per-increment (tasks.md frontmatter) > Project config (.specweave/config.json) > Off
```

## LSP Plugins Reference

For reference, these official LSP plugins are still valid and may be auto-detected:

| Language/Framework | Plugin |
|--------------------|--------|
| C#, .NET, ASP.NET | `csharp-lsp@claude-plugins-official` |
| Go, Golang | `gopls-lsp@claude-plugins-official` |
| Java, Spring | `jdtls-lsp@claude-plugins-official` |
| Kotlin | `kotlin-lsp@claude-plugins-official` |
| PHP, Laravel | `php-lsp@claude-plugins-official` |
| Lua, Neovim | `lua-lsp@claude-plugins-official` |
| C, C++ | `clangd-lsp@claude-plugins-official` |

## SpecWeave Plugin Priority

SpecWeave plugins take priority over official plugins for:

| Service | Use This | NOT This |
|---------|----------|----------|
| GitHub | `sw-github@specweave` | `github@claude-plugins-official` |
| JIRA | `sw-jira@specweave` | Any official JIRA plugin |
| Azure DevOps | `sw-ado@specweave` | Any official ADO plugin |

## Migration Notes

If you were invoking this skill directly:

```typescript
// OLD (deprecated):
Skill({ skill: "sw-router:router" })

// NEW (automatic):
// The user-prompt-submit hook handles this automatically.
// No explicit invocation needed.

// For explicit plugin installation:
// Use CLI: specweave detect-intent "prompt" --install
```

## See Also

- `src/cli/commands/detect-intent.ts` - Plugin detection implementation
- `plugins/specweave/hooks/user-prompt-submit.sh` - Hook that calls detect-intent
- `src/core/lazy-loading/llm-plugin-detector.ts` - LLM-based plugin detection
- `.specweave/docs/internal/guides/tdd-config-behavior-mapping.md` - TDD configuration guide
