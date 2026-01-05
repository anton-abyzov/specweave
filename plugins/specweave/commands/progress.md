---
name: sw:progress
description: Show progress for all active increments with task completion status
usage: /sw:progress [incrementId]
---

# Increment Progress

**NOTE**: This command is normally intercepted by the UserPromptSubmit hook for instant execution (<100ms). If the hook output isn't displayed, execute the CLI fallback below.

When this command is invoked, immediately execute via CLI:

```bash
specweave progress $ARGUMENTS
```

**CRITICAL**: Execute the command directly with NO commentary before or after. Show the output to the user.
