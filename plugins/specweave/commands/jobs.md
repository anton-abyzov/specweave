---
name: sw:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>]
allowed-tools: Bash(bash:*)
---

# Background Jobs Monitor

**Show current work status and background jobs.**

You are helping the user check the status of their SpecWeave increments and background jobs.

## Execution

When this command is invoked, you MUST find and execute the script from the plugin cache.

**Step 1: Locate the script**

```bash
# Find the installed plugin path
PLUGIN_PATH=$(find ~/.claude/plugins/cache -name "read-jobs.sh" -path "*/specweave/sw/*/scripts/*" 2>/dev/null | head -1)
```

**Step 2: Execute the script**

```bash
bash "$PLUGIN_PATH" $ARGUMENTS
```

**IMPORTANT**:
- The script MUST be found in ~/.claude/plugins/cache/specweave/sw/
- Pass through any arguments the user provided (--all, --id, etc.)
- The script will handle all formatting and display
- Do NOT add any explanation before or after - just run the script and show its output
- If script not found, tell user to run: specweave refresh-marketplace
