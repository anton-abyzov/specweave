---
name: sw:jobs
description: Show current work status (active increments, progress) and background jobs (imports, cloning). Even with no jobs, shows increment summary and helpful context.
usage: /sw:jobs [--all] [--id <job-id>]
allowed-tools: Bash(bash:*)
---

# Background Jobs Monitor

!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/read-jobs.sh" $ARGUMENTS`
