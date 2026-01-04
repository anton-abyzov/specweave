---
name: sw:status
description: Show increment status overview with rich details (active, backlog, paused, completed, abandoned)
usage: /sw:status [--active|--backlog|--paused|--completed|--abandoned|--stale]
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/read-status.sh)"]
---

# Increment Status

```!
bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-status.sh" $ARGUMENTS
```
