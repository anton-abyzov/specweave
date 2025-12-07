# SpecWeave Instant Scripts

**Blazingly fast status commands that bypass LLM processing.**

These scripts provide instant (<100ms) output for status queries that don't require AI reasoning.

## Why These Exist

Status commands (`/specweave:status`, `/specweave:progress`, `/specweave:jobs`) were taking 3+ minutes because they expanded as prompts requiring LLM processing. These commands need NO reasoning - they just read JSON and format output.

**Performance comparison:**

| Command | Before | After |
|---------|--------|-------|
| `/specweave:status` | 3+ min | <100ms |
| `/specweave:progress` | 2+ min | <100ms |
| `/specweave:jobs` | 3+ min | <100ms |

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
| **Hook** | Claude Code | <100ms | `UserPromptSubmit` intercepts `/specweave:*`, runs script, blocks prompt |
| **Skill** | Any LLM | ~2s | Skill instructs LLM to run script via Bash |
| **CLI** | Terminal | ~500ms | `specweave status` / direct `node scripts/*.js` |

### 1. Claude Code (Hook - Fastest)

In Claude Code, the `UserPromptSubmit` hook automatically intercepts status commands:

```
User types: /specweave:status
Hook runs: bash plugins/specweave/scripts/read-status.sh
Output appears instantly (<10ms)
LLM never processes the prompt
```

### 2. Other LLMs (Skill - Fast)

In Cursor, Windsurf, Copilot, or API usage, the `instant-status` skill provides instructions:

```
User types: /specweave:status
Skill activates and instructs LLM to run the script
LLM executes: bash plugins/specweave/scripts/read-status.sh
Output appears (~2s)
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
| Quick status check in Claude Code | Just type `/specweave:status` |
| Using Cursor/Windsurf/Copilot | Let skill guide execution |
| Terminal/scripting | `specweave status` or `node scripts/*.js` |
| CI/CD pipelines | Direct `node scripts/*.js` |

## Adding New Instant Commands

To add a new instant command:

1. Create script in `plugins/specweave/scripts/newcmd.js`
2. Add `--help` handling (required)
3. Add to hook dispatcher in `plugins/specweave/hooks/user-prompt-submit.sh`
4. Update `skills/instant-status/SKILL.md` with new command
5. Test all three paths (hook, skill, CLI)

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
  1. Claude Code:  /specweave:newcmd  (hook intercepts)
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
