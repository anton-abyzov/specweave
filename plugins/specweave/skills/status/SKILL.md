---
name: status
description: Show increment status overview with rich details (active, backlog, paused, completed, abandoned)
---

# Increment Status

**NOTE**: This command is normally intercepted by the UserPromptSubmit hook for instant execution (<100ms). If the hook output isn't displayed, execute the CLI fallback below.

When this command is invoked, extract any arguments from the user's prompt and execute:

```bash
specweave status
```

If the user provided flags (e.g., `/sw:status --active`), pass them to the command.

**CRITICAL**: Execute the command directly with NO commentary before or after. Show the output to the user.
