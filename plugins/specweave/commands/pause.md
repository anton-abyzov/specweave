---
name: pause
description: Pause an active increment (shortcut for /specweave:pause)
usage: /pause <increment-id> --reason="<reason>"
aliases: [specweave:pause]
---

# Pause Increment Command (Shortcut)

**This is a shortcut for `/specweave:pause`**

**Usage**: `/pause <increment-id> --reason="<reason>"`

**Full command**: `/specweave:pause <increment-id> --reason="<reason>"`

---

## Quick Reference

Pause an active increment when blocked, waiting, or deprioritized.

### Examples
```bash
/pause 0006 --reason="Waiting for API keys"
/pause 0007 --reason="Blocked on code review"
/pause 0008 --reason="Deprioritized"
```

### Resume
```bash
/resume 0006
```

---

## Full Documentation

See: `/specweave:pause` for complete documentation including:
- Detailed behavior
- Edge cases
- Best practices
- Status flow diagram
- Related commands

---

**Command**: `/pause` (shortcut for `/specweave:pause`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
