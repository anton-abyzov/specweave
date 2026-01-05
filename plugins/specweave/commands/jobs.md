---
name: sw:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>]
---

# Background Jobs Monitor

**NOTE**: This command is normally intercepted by the UserPromptSubmit hook for instant execution (<100ms). If the hook output isn't displayed, execute the CLI fallback below.

When this command is invoked, immediately execute via CLI:

```bash
specweave jobs $ARGUMENTS
```

**CRITICAL**: Execute the command directly with NO commentary before or after. Show the output to the user.
