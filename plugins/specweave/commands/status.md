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

When this command is invoked, immediately run:

```bash
bash plugins/specweave/scripts/read-status.sh $ARGUMENTS
```

**IMPORTANT**:
- Use the Bash tool to execute the script directly
- Pass through any arguments the user provided (--active, --backlog, etc.)
- The script will handle all formatting and display
- Do NOT add any explanation before or after - just run the script and show its output
