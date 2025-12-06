---
name: instant-status
description: Instant status commands that bypass LLM processing. Execute scripts directly for /specweave:status, /specweave:progress, /specweave:jobs. Activates for specweave status, specweave progress, specweave jobs, increment status, show status, show progress, background jobs, job status.
---

# Instant Status Commands

These commands need **NO LLM reasoning** - execute scripts directly for instant results.

## Commands and Scripts

| Command | Script | Purpose |
|---------|--------|---------|
| `/specweave:status` | `node plugins/specweave/scripts/status.js` | Increment status overview |
| `/specweave:progress` | `node plugins/specweave/scripts/progress.js` | Task completion progress |
| `/specweave:jobs` | `node plugins/specweave/scripts/jobs.js` | Background job status |

## CRITICAL: Direct Execution Required

When user requests these commands:

1. **DO NOT** process as natural language
2. **DO NOT** expand slash command markdown
3. **RUN** the script via Bash tool
4. **SHOW** output directly to user

### Example Execution

```bash
# User types: /specweave:status
# You execute:
node plugins/specweave/scripts/status.js

# User types: /specweave:progress
# You execute:
node plugins/specweave/scripts/progress.js

# User types: /specweave:jobs
# You execute:
node plugins/specweave/scripts/jobs.js
```

## Three Execution Paths

| Layer | Context | Speed | When Used |
|-------|---------|-------|-----------|
| **Hook** | Claude Code | <100ms | Automatic (UserPromptSubmit intercepts) |
| **Skill** | Any LLM | ~2s | When hook not available (you are here) |
| **CLI** | Terminal | ~500ms | Direct `specweave status` command |

## CLI Alternative

Users can also run directly in terminal:
```bash
specweave status    # Full CLI command
specweave jobs      # Background jobs
```

## Script Arguments

```bash
node plugins/specweave/scripts/status.js 0045      # Specific increment
node plugins/specweave/scripts/jobs.js --all       # All jobs
```

## Why This Matters

- **3+ minutes** to **<100ms**: Status commands were expanding as prompts
- **Zero LLM tokens**: Pure filesystem reads, no AI needed
- **Universal**: Works in Claude Code, Cursor, Copilot, CLI
