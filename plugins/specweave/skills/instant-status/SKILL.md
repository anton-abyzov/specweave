---
name: instant-status
description: Instant status commands that bypass LLM processing. Execute scripts directly for /sw:status, /sw:progress, /sw:jobs. Activates for specweave status, specweave progress, specweave jobs, increment status, show status, show progress, background jobs, job status.
---

# Instant Status Commands

These commands need **NO LLM reasoning** - execute scripts directly for instant results.

## Commands and Scripts

| Command | Script | Purpose |
|---------|--------|---------|
| `/sw:status` | `bash plugins/specweave/scripts/read-status.sh` | Increment status overview |
| `/sw:progress` | `bash plugins/specweave/scripts/read-progress.sh` | Task completion progress |
| `/sw:jobs` | `bash plugins/specweave/scripts/read-jobs.sh` | Background job status |

## CRITICAL: Direct Execution Required

When user requests these commands:

1. **DO NOT** process as natural language
2. **DO NOT** expand slash command markdown
3. **RUN** the bash script via Bash tool (NOT node!)
4. **SHOW** output directly to user

### Example Execution

```bash
# User types: /sw:status
# You execute:
bash plugins/specweave/scripts/read-status.sh

# User types: /sw:progress
# You execute:
bash plugins/specweave/scripts/read-progress.sh

# User types: /sw:jobs
# You execute:
bash plugins/specweave/scripts/read-jobs.sh
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
bash plugins/specweave/scripts/read-status.sh 0045    # Specific increment
bash plugins/specweave/scripts/read-jobs.sh --all     # All jobs
```

## Why This Matters

- **3+ minutes** to **<100ms**: Status commands were expanding as prompts
- **Zero LLM tokens**: Pure filesystem reads, no AI needed
- **Universal**: Works in Claude Code, Cursor, Copilot, CLI
