---
name: sw:status
description: Show increment status overview with rich details (active, backlog, paused, completed, abandoned)
usage: /sw:status [--active|--backlog|--paused|--completed|--abandoned|--stale]
---

# Increment Status

**NOTE**: This command is intercepted by the UserPromptSubmit hook for instant execution (<100ms).

When this command is invoked in environments WITHOUT hook support, immediately execute:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-status.sh" $ARGUMENTS
```

**CRITICAL**: Execute the script directly with NO commentary before or after.
