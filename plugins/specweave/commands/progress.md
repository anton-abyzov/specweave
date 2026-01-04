---
name: sw:progress
description: Show progress for all active increments with task completion status
usage: /sw:progress [incrementId]
allowed-tools: Bash(bash:*)
---

# Increment Progress

**Show progress for all active increments.**

You are helping the user check task completion progress for their SpecWeave increments.

## Execution

When this command is invoked, immediately run:

```bash
bash plugins/specweave/scripts/read-progress.sh $ARGUMENTS
```

**IMPORTANT**:
- Use the Bash tool to execute the script directly
- Pass through any arguments the user provided (increment ID, etc.)
- The script will handle all formatting and display
- Do NOT add any explanation before or after - just run the script and show its output
