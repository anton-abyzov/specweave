---
name: progress
description: Show progress for all active increments with task completion status
argument-hint: "[incrementId]"
---

# Increment Progress

**NOTE**: This command is normally intercepted by the UserPromptSubmit hook for instant execution (<100ms). If the hook output isn't displayed, execute the CLI fallback below.

When this command is invoked, extract any arguments from the user's prompt and execute:

```bash
specweave progress
```

If the user provided an increment ID (e.g., `/sw:progress 0042`), pass it to the command.

**CRITICAL**: Execute the command directly with NO commentary before or after. Show the output to the user.
