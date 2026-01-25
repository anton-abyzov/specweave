# Routing and Plugin Detection Architecture

**Last Updated**: 2026-01-25
**Status**: Current (v1.0.140+)

## Overview

This document describes how SpecWeave detects user intent, loads plugins, and routes to appropriate skills.

---

## CRITICAL: sw-router is OBSOLETE

**As of v1.0.140+, the `sw-router` skill is DEPRECATED and NEVER called automatically.**

The following architecture replaced sw-router:

```
User Prompt
    ↓
user-prompt-submit.sh hook (AUTOMATIC - fires BEFORE every prompt)
    ↓
specweave detect-intent --file "$PROMPT_TMP_FILE" --install --silent
    ↓
LLM (Claude Haiku) analyzes prompt
    ↓
Returns JSON:
{
  "plugins": ["sw-frontend", "sw-payments"],
  "increment": {
    "action": "new",
    "suggestedName": "dashboard-stripe",
    "confidence": 0.9
  },
  "routing": {
    "skills": ["frontend-architect", "payment-integration"]
  }
}
    ↓
Hook processes result:
  1. Installs missing plugins (shows emphatic restart warning)
  2. Injects TDD context if testing.defaultTestMode: "TDD"
  3. Injects increment suggestion if action: "new"
  4. Injects skill routing hints
    ↓
Original prompt continues with enriched context
```

## Components

### 1. user-prompt-submit.sh Hook

**Location**: `plugins/specweave/hooks/user-prompt-submit.sh`

**Triggers**: BEFORE every user prompt is processed

**Responsibilities**:
- Calls `specweave detect-intent` for LLM-based analysis
- Installs detected plugins automatically
- Shows emphatic restart warning if plugins installed
- Injects TDD context based on `testing.defaultTestMode`
- Injects increment suggestions

### 2. detect-intent Command

**Location**: `src/cli/commands/detect-intent.ts`

**What it does**:
- Uses `detectPluginsViaLLM()` to call Claude Haiku
- Returns structured JSON with:
  - `plugins`: Array of plugin marketplace names to install
  - `increment`: Recommendation (new, reopen, small_fix, hotfix, none)
  - `routing`: Skills that should handle the task

### 3. llm-plugin-detector.ts

**Location**: `src/core/lazy-loading/llm-plugin-detector.ts`

**What it does**:
- Constructs prompt for Claude Haiku
- Sends via `claude -p` CLI command
- Parses JSON response
- Returns structured detection result

## Increment Evaluation

The LLM evaluates whether user needs an increment:

| Action | When Used | Example |
|--------|-----------|---------|
| `new` | Multi-file feature, significant work | "Create React dashboard" |
| `reopen` | Continuation of previous work | "The auth feature is broken again" |
| `small_fix` | Typo, config tweak, single-line | "Fix typo in README" |
| `hotfix` | Urgent production issue | "Urgent: checkout is failing" |
| `none` | Question, general chat | "How do I use React hooks?" |

## Skill Naming Convention

**CRITICAL: All skill invocations MUST use the correct prefix format:**

### Pattern

```
<plugin-marketplace-name>:<skill-name>
```

### Examples

| Plugin | Marketplace Name | Skill Invocation |
|--------|------------------|------------------|
| Core SpecWeave | `sw` | `Skill({ skill: "sw:increment-planner" })` |
| Frontend | `sw-frontend` | `Skill({ skill: "sw-frontend:frontend-architect" })` |
| Payments | `sw-payments` | `Skill({ skill: "sw-payments:payment-integration" })` |
| GitHub | `sw-github` | `Skill({ skill: "sw-github:create" })` |
| JIRA | `sw-jira` | `Skill({ skill: "sw-jira:create" })` |
| ADO | `sw-ado` | `Skill({ skill: "sw-ado:create" })` |

### Common Mistakes

```typescript
// ❌ WRONG - Missing plugin prefix
Skill({ skill: "increment-planner" });
// Error: "Unknown skill"

// ✅ CORRECT - Include sw: prefix for core plugin
Skill({ skill: "sw:increment-planner" });
```

## TDD Context Injection

The hook also injects TDD context (lines 599-714 in user-prompt-submit.sh):

1. Checks `testing.defaultTestMode` from `.specweave/config.json`
2. If "TDD", injects emphatic TDD banner into every prompt
3. Claude ALWAYS knows TDD status - cannot "forget" mid-session

**Priority order**:
1. Command flag (`--tdd`, `--strict`)
2. Increment metadata (`testMode` in metadata.json)
3. Global config (`testing.defaultTestMode`)

## Plugin Restart Warning

When plugins are installed during detection, the hook injects an emphatic restart warning:

```
════════════════════════════════════════════════════════════
⚠️  PLUGINS INSTALLED - RESTART REQUIRED
════════════════════════════════════════════════════════════

✅ Installed: sw-frontend, sw-payments

**CRITICAL**: Skills/agents from these plugins are NOT available in this session!

📋 To use these plugins:
   1. Start a NEW Claude Code session (Cmd+Shift+P → 'Claude: New Session')
   2. Copy-paste your original prompt into the new session

════════════════════════════════════════════════════════════
```

## Configuration

### Enable/Disable Plugin Auto-Load

```json
// .specweave/config.json
{
  "pluginAutoLoad": {
    "enabled": true,      // Master switch (default: true)
    "suggestOnly": false  // If true, only suggest, don't install
  }
}
```

### Enable/Disable Increment Suggestions

```json
// .specweave/config.json
{
  "incrementAssist": {
    "enabled": true,            // Master switch (default: true)
    "confidenceThreshold": 0.7  // Min confidence to show suggestion
  }
}
```

## Migration from sw-router

If you were using sw-router directly:

```typescript
// OLD (deprecated - NEVER called automatically):
Skill({ skill: "sw-router:router" })

// NEW (automatic via hook):
// No explicit call needed - user-prompt-submit hook handles everything
// The detect-intent command does the routing via LLM
```

## Debugging

### Check detect-intent output

```bash
specweave detect-intent "Create React dashboard" --json
```

### Check hook logs

```bash
cat ~/.specweave/logs/lazy-load.log
cat ~/.specweave/logs/tdd-enforcement.log
```

### Disable auto-load for testing

```bash
export SPECWEAVE_DISABLE_AUTO_LOAD=1
```

## References

- [detect-intent.ts](../../../../src/cli/commands/detect-intent.ts)
- [llm-plugin-detector.ts](../../../../src/core/lazy-loading/llm-plugin-detector.ts)
- [user-prompt-submit.sh](../../../../plugins/specweave/hooks/user-prompt-submit.sh)
- [sw-router SKILL.md (DEPRECATED)](../../../../plugins/specweave-router/skills/router/SKILL.md)
