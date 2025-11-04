---
name: abandon
description: Abandon an incomplete increment (shortcut for /specweave:abandon)
usage: /abandon <increment-id> --reason="<reason>"
aliases: [specweave:abandon]
---

# Abandon Increment Command (Shortcut)

**This is a shortcut for `/specweave:abandon`**

**Usage**: `/abandon <increment-id> --reason="<reason>"`

**Full command**: `/specweave:abandon <increment-id> --reason="<reason>"`

⚠️  **THIS ACTION MOVES THE INCREMENT TO `_abandoned/` FOLDER**

---

## Quick Reference

Abandon an increment when requirements changed, approach wrong, or superseded.

### Examples
```bash
/abandon 0008 --reason="Requirements changed"
/abandon 0009 --reason="Experiment failed"
/abandon 0010 --reason="Superseded by 0011"
```

### View Abandoned
```bash
/status --abandoned
```

---

## Important Notes

- ✅ Moves increment to `_abandoned/` folder (preserves all work)
- ✅ Requires confirmation before executing
- ✅ Cannot abandon completed increments
- ⚠️  Permanent action (un-abandon requires manual move)

---

## Full Documentation

See: `/specweave:abandon` for complete documentation including:
- Detailed behavior
- Auto-abandonment (experiments)
- Un-abandoning process
- Best practices
- Learning from abandoned work

---

**Command**: `/abandon` (shortcut for `/specweave:abandon`)
**Plugin**: specweave (core)
**Version**: v0.7.0+
