---
name: sw:progress
description: Show progress for all active increments with task completion status
usage: /sw:progress [incrementId]
---

# Increment Progress

When this command is invoked, immediately execute the progress script using the Bash tool:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-progress.sh" $ARGUMENTS
```

**IMPORTANT**: Do NOT add any commentary - just run the script and show its output.
