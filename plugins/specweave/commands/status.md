---
name: sw:status
description: Show increment status overview with rich details (active, backlog, paused, completed, abandoned)
usage: /sw:status [--active|--backlog|--paused|--completed|--abandoned|--stale]
---

# Increment Status

When this command is invoked, immediately execute the status script using the Bash tool:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-status.sh" $ARGUMENTS
```

**IMPORTANT**: Do NOT add any commentary - just run the script and show its output.
