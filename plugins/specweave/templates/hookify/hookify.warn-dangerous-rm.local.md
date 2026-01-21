---
name: warn-dangerous-rm
enabled: true
event: bash
action: warn
conditions:
  - field: command
    operator: regex_match
    pattern: rm\s+-rf\s+(/|~|\$HOME|\*|\.\./)
---

**Dangerous rm command detected!**

This command could delete important files or entire directories.

Please verify:
- The path is correct
- You have backups if needed
- This is intentional

Consider using safer alternatives:
- `trash` command (moves to trash instead of permanent delete)
- `rm -i` (interactive mode, confirms each file)
