---
name: sw:cancel-auto
description: Cancel running auto session. Generates summary report and releases lock. Activates for: cancel auto, stop auto, cancel auto.
---

# Cancel Auto Command

**Cancel the running auto session and generate summary.**

## Usage

```bash
/sw:cancel-auto [OPTIONS]
```

## Options

| Option | Description |
|--------|-------------|
| `--force` | Cancel without confirmation |
| `--reason <text>` | Reason for cancellation |

## Examples

```bash
# Interactive cancel (asks for confirmation)
/sw:cancel-auto

# Force cancel without confirmation
/sw:cancel-auto --force

# With reason
/sw:cancel-auto --reason "Need to switch to urgent bug fix"
```

## What It Does

1. Checks if auto session is active
2. Shows current session status
3. Asks for confirmation (unless --force)
4. Updates session status to "cancelled"
5. Releases session lock
6. Generates summary report

## Output Example

```
📊 Current Session

Session ID: auto-2025-12-29-abc123
Status: running
Iteration: 47
Current Increment: 0001-user-auth
Increments Completed: 2
Duration: 2h 15m

Cancel this session? [y/N] y

✅ Session cancelled

Summary: .specweave/logs/auto-2025-12-29-abc123-summary.md

💡 To resume work later, just run /sw:do
```

## Execution

When this command is invoked:

```bash
bash plugins/specweave/scripts/cancel-auto.sh [args]
```

## Notes

- Cancelling doesn't undo completed work
- tasks.md progress is preserved
- You can resume anytime with `/sw:do`
- Use Claude Code's `/resume` to restore full conversation context
