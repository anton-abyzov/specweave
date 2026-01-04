---
name: sw:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>]
---

# Background Jobs Monitor

**NOTE**: This command is intercepted by the UserPromptSubmit hook for instant execution (<100ms).

When this command is invoked in environments WITHOUT hook support, immediately execute:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-jobs.sh" $ARGUMENTS
```

**CRITICAL**: Execute the script directly with NO commentary before or after.
