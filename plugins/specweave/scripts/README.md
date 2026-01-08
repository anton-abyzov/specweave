# SpecWeave Instant Scripts

**Blazingly fast status commands that bypass LLM processing.**

These scripts provide instant (<100ms) output for status queries that don't require AI reasoning.

## Why These Exist

Status commands (`/sw:status`, `/sw:progress`, `/sw:jobs`) were taking 3+ minutes because they expanded as prompts requiring LLM processing. These commands need NO reasoning - they just read JSON and format output.

**Performance comparison:**

| Command | Before | After |
|---------|--------|-------|
| `/sw:status` | 3+ min | <100ms |
| `/sw:progress` | 2+ min | <100ms |
| `/sw:jobs` | 3+ min | <100ms |

## Scripts

### Bash Scripts (v0.32.0+ - Recommended)

These read from the pre-computed dashboard cache for <10ms response time.

#### read-status.sh - Increment Status Overview

```bash
bash plugins/specweave/scripts/read-status.sh
bash plugins/specweave/scripts/read-status.sh 0045  # Specific increment
```

#### read-progress.sh - Task Completion Progress

```bash
bash plugins/specweave/scripts/read-progress.sh
bash plugins/specweave/scripts/read-progress.sh 0045  # Specific increment
```

#### read-jobs.sh - Background Job Status

```bash
bash plugins/specweave/scripts/read-jobs.sh
bash plugins/specweave/scripts/read-jobs.sh --all     # Include completed
```

### Node.js Scripts (Legacy - Fallback)

These are used when jq is not available or cache doesn't exist.

```bash
node plugins/specweave/scripts/status.js
node plugins/specweave/scripts/progress.js
node plugins/specweave/scripts/jobs.js
```

## Three Execution Paths

These scripts work across all contexts through a layered architecture:

| Layer | Context | Speed | How It Works |
|-------|---------|-------|--------------|
| **Command `!` Block** | Claude Code | <100ms | Command file auto-executes script via `` ```! `` block |
| **Hook** | Claude Code | <100ms | `UserPromptSubmit` intercepts `/sw:*`, runs script, blocks prompt |
| **CLI** | Terminal | ~500ms | `specweave status` / direct `bash scripts/*.sh` |

### 1. Claude Code (Command Auto-Execution - Primary)

In Claude Code, commands with `` ```! `` blocks auto-execute scripts:

```markdown
# commands/jobs.md
---
name: sw:jobs
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-jobs.sh)"]
---

```!
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-jobs.sh" "$ARGUMENTS"
```
```

When user types `/sw:status`, the `` ```! `` block executes automatically.

### 2. Claude Code (Hook - Fallback)

The `UserPromptSubmit` hook provides a fallback intercept layer:

```
User types: /sw:status
Hook runs: bash plugins/specweave/scripts/read-status.sh
Output appears instantly (<10ms)
LLM never processes the prompt
```

### 3. Terminal (CLI - Direct)

Users can run scripts directly without any LLM:

```bash
# Full CLI command
specweave status
specweave jobs

# Direct script execution (bash preferred)
bash plugins/specweave/scripts/read-status.sh
bash plugins/specweave/scripts/read-progress.sh 0045
```

## When to Use Which

| Situation | Recommended Path |
|-----------|------------------|
| Quick status check in Claude Code | Just type `/sw:status` (auto-executes) |
| Using other AI tools (Cursor, etc.) | Not supported - use CLI instead |
| Terminal/scripting | `specweave status` or `bash scripts/*.sh` |
| CI/CD pipelines | Direct `bash scripts/*.sh` |

## Adding New Instant Commands

To add a new instant command:

1. Create script in `plugins/specweave/scripts/newcmd.sh`
2. Add `--help` handling (required)
3. Create command in `commands/newcmd.md` with `` ```! `` block:
   ```markdown
   ---
   name: sw:newcmd
   allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/newcmd.sh)"]
   ---

   ```!
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/newcmd.sh" "$ARGUMENTS"
   ```
   ```
4. (Optional) Add to hook dispatcher in `plugins/specweave/hooks/user-prompt-submit.sh`
5. Test both paths (command auto-exec, CLI)

### Script Template

```javascript
#!/usr/bin/env node
/**
 * Description of what this script does
 * Usage: node newcmd.js [options] [--help]
 */

import fs from 'fs';
import path from 'path';

// Handle --help (REQUIRED)
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
SpecWeave Instant NewCmd

USAGE
  node plugins/specweave/scripts/newcmd.js [options]

OPTIONS
  --help, -h     Show this help message

DESCRIPTION
  What this command does...

EXECUTION PATHS
  1. Claude Code:  /sw:newcmd  (hook intercepts)
  2. Any LLM:      Skill instructs to run this script
  3. Terminal:     specweave newcmd
`);
  process.exit(0);
}

// Your implementation here
const cwd = process.cwd();
// ...
```

## Design Principles

1. **Zero LLM tokens**: Pure filesystem reads, no AI reasoning needed
2. **Single source of truth**: Hook, skill, and CLI all use these same scripts
3. **Universal compatibility**: Works in Claude Code, Cursor, Copilot, terminal
4. **Fast feedback**: <100ms response time for status queries
5. **Self-documenting**: All scripts support `--help`
