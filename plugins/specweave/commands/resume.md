---
name: resume
description: Resume a paused increment (shortcut for /specweave:resume)
usage: /resume <increment-id>
aliases: [specweave:resume]
---

# Resume Increment Command (Shortcut)

**This is a shortcut for `/specweave:resume`**

**Usage**: `/resume <increment-id>`

**Full command**: `/specweave:resume <increment-id>`

---

## Quick Reference

Resume a paused increment when blocker resolved or ready to continue.

### Examples
```bash
/resume 0006  # Resume after API keys arrived
/resume 0007  # Resume after deprioritization
```

### Check Paused Increments
```bash
/status --paused
```

---

## Full Documentation

See: `/specweave:resume` for complete documentation including:
- Detailed behavior
- Pause duration calculation
- Context recovery features
- Edge cases
- Best practices

---

**Command**: `/resume` (shortcut for `/specweave:resume`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
