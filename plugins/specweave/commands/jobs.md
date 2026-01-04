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

When this command is invoked, immediately run:

```bash
bash plugins/specweave/scripts/read-jobs.sh $ARGUMENTS
```

**IMPORTANT**:
- Use the Bash tool to execute the script directly
- Pass through any arguments the user provided (--all, --id, etc.)
- The script will handle all formatting and display
- Do NOT add any explanation before or after - just run the script and show its output
