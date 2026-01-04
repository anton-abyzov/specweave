---
name: sw:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>]
---

# Background Jobs Monitor

When this command is invoked, immediately execute:

```bash
bash "$HOME/.claude/plugins/cache/specweave/sw/1.0.0/scripts/read-jobs.sh" $ARGUMENTS
```

**CRITICAL**: Execute the script directly with NO commentary before or after.
