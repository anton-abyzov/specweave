---
name: sw:progress
description: Show progress for all active increments with task completion status
usage: /sw:progress [incrementId]
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-progress.sh)"]
---

# Increment Progress

```!
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-progress.sh" $ARGUMENTS
```
