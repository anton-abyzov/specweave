---
name: sw:status
description: Show increment status overview with rich details (active, backlog, paused, completed, abandoned)
usage: /sw:status [--active|--backlog|--paused|--completed|--abandoned|--stale]
allowed-tools: Bash(bash:*)
---

# Increment Status

**Show increment status overview.**

You are helping the user check the status of their SpecWeave increments.

## Execution

When this command is invoked, you MUST find and execute the script from the plugin cache.

**Step 1: Locate the script**

```bash
# Find the installed plugin path
PLUGIN_PATH=$(find ~/.claude/plugins/cache -name "read-status.sh" -path "*/specweave/sw/*/scripts/*" 2>/dev/null | head -1)
```

**Step 2: Execute the script**

```bash
bash "$PLUGIN_PATH" $ARGUMENTS
```

**IMPORTANT**:
- The script MUST be found in ~/.claude/plugins/cache/specweave/sw/
- Pass through any arguments the user provided (--active, --backlog, etc.)
- The script will handle all formatting and display
- Do NOT add any explanation before or after - just run the script and show its output
- If script not found, tell user to run: specweave refresh-marketplace
