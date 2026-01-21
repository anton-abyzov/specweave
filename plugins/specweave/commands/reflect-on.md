---
name: sw:reflect-on
description: Enable automatic reflection on session end. Stop hook will analyze session and extract learnings automatically. Activates for reflect on, enable reflect, auto reflect, automatic learning.
---

# Reflect On Command

**Enable automatic reflection when sessions end.**

## Usage

```bash
/sw:reflect-on
```

## What It Does

Enables automatic session analysis via the stop hook:

```
1. Session starts
      ↓
2. You work with Claude (corrections, approvals, patterns)
      ↓
3. Session ends (all tasks done / user closes)
      ↓
4. Stop hook triggers
      ↓
5. Reflect automatically analyzes transcript
      ↓
6. Learnings extracted and saved to MEMORY.md files
      ↓
7. Git commit (if configured)
      ↓
8. "🧠 Learned from session" notification shown
```

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 REFLECT: Automatic Mode Enabled
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Auto-reflection is now ENABLED

When enabled:
  • Stop hook analyzes session on exit
  • Corrections and approvals are extracted
  • Learnings saved to skill MEMORY.md files
  • Git commit created (if configured)

Configuration:
  • Confidence threshold: medium
  • Max learnings per session: 10
  • Git commit: enabled
  • Git push: disabled

To disable: /sw:reflect-off
To check status: /sw:reflect-status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Configuration

When enabled, creates/updates `.specweave/state/reflect-config.json`:

```json
{
  "enabled": true,
  "autoReflect": true,
  "enabledAt": "2026-01-05T10:30:00Z",
  "confidenceThreshold": "medium",
  "maxLearningsPerSession": 10,
  "gitCommit": true,
  "gitPush": false
}
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:reflect-off` | Disable automatic reflection |
| `/sw:reflect-status` | Show current configuration |
| `/sw:reflect` | Manual reflection (works anytime) |

## Execution

When this command is invoked:

1. **Create state file** `.specweave/state/reflect-config.json` with `autoReflect: true`
2. **Confirm enabled** with configuration summary
3. **Stop hook** will now analyze sessions on exit
