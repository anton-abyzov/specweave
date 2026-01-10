---
name: block-force-push-main
enabled: true
event: bash
action: block
conditions:
  - field: command
    operator: regex_match
    pattern: git\s+push.*--force.*main|git\s+push.*-f.*main|git\s+push.*--force.*master|git\s+push.*-f.*master
---

**Force push to main/master branch blocked!**

This is a destructive operation that can cause data loss.

If you really need to force push:
1. Create a backup branch first: `git branch backup-$(date +%Y%m%d)`
2. Get explicit user confirmation
3. Consider using `--force-with-lease` instead (safer)
