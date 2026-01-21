---
name: sw:reflect-off
description: Disable automatic reflection on session end. Manual reflection still works. Activates for reflect off, disable reflect, stop auto reflect.
---

# Reflect Off Command

**Disable automatic reflection when sessions end.**

## Usage

```bash
/sw:reflect-off
```

## What It Does

Disables automatic session analysis:

- Stop hook no longer triggers reflection
- Manual `/sw:reflect` still works
- Existing learnings preserved

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REFLECT: Automatic Mode Disabled
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Auto-reflection is now DISABLED

Changes:
  • Stop hook will NOT analyze sessions
  • Manual /sw:reflect still available
  • Existing learnings preserved

To re-enable: /sw:reflect-on
To check status: /sw:reflect-status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:reflect-on` | Enable automatic reflection |
| `/sw:reflect-status` | Show current configuration |
| `/sw:reflect` | Manual reflection (always works) |

## Execution

When this command is invoked:

1. **Update state file** `.specweave/state/reflect-config.json` with `autoReflect: false`
2. **Confirm disabled** with status message
