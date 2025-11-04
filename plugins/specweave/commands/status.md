---
name: status
description: Show increment status overview (shortcut for /specweave:status)
usage: /status [--active|--paused|--completed|--abandoned|--stale]
aliases: [specweave:status]
---

# Increment Status Command (Shortcut)

**This is a shortcut for `/specweave:status`**

**Usage**: `/status [filter]`

**Full command**: `/specweave:status [filter]`

---

## Quick Reference

Show comprehensive increment status with progress, warnings, and suggestions.

### Examples
```bash
/status                    # All increments
/status --active           # Active only
/status --paused           # Paused only
/status --stale            # Stale only (>7 days paused)
```

### Sample Output
```
📊 Increment Status Overview

🔥 Active (1):
  🔧 0006-i18n [feature] (50% done, 2 days)

⏸️  Paused (1):
  🔄 0007-stripe [feature] (paused 3 days)
     Reason: Waiting for API keys

✅ Completed (4):
  0001, 0002, 0003, 0004
```

---

## Full Documentation

See: `/specweave:status` for complete documentation including:
- Progress calculation
- Warnings and suggestions
- All filters (--active, --paused, --stale, etc.)
- Statistics and analytics
- Best practices

---

**Command**: `/status` (shortcut for `/specweave:status`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
