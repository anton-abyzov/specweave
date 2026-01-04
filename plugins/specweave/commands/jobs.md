---
name: sw:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>]
---

# Background Jobs Monitor

When this command is invoked, immediately execute the status script using the Bash tool:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-jobs.sh" $ARGUMENTS
```

**IMPORTANT**: Do NOT add any commentary - just run the script and show its output.
