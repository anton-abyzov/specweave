---
name: sw:status
description: Show increment status overview with rich details (active, backlog, paused, completed, abandoned)
usage: /sw:status [--active|--backlog|--paused|--completed|--abandoned|--stale]
---

# Increment Status

**NOTE**: This command is normally intercepted by the UserPromptSubmit hook for instant execution (<100ms). If the hook output isn't displayed, execute the CLI fallback below.

When this command is invoked, immediately execute via CLI:

```bash
specweave status $ARGUMENTS
```

**CRITICAL**: Execute the command directly with NO commentary before or after. Show the output to the user.
