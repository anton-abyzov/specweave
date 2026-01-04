---
name: sw:progress
description: Show progress for all active increments with task completion status
usage: /sw:progress [incrementId]
---

# Increment Progress

**NOTE**: This command is intercepted by the UserPromptSubmit hook for instant execution (<100ms).

When this command is invoked in environments WITHOUT hook support, immediately execute:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-progress.sh" $ARGUMENTS
```

**CRITICAL**: Execute the script directly with NO commentary before or after.
