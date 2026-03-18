---
sidebar_position: 12
---

import CommandTabs from '@site/src/components/CommandTabs';

# Cancel Auto Session

**Cancel the running auto session and generate summary.**

## Usage

<CommandTabs
  natural='Stop auto'
  claude='/sw:cancel-auto'
  other='cancel-auto'
/>

## Options

| Option | Description |
|--------|-------------|
| `--force` | Cancel without confirmation |
| `--reason <text>` | Reason for cancellation |

## Examples

Additional options:
```bash
# Force cancel without confirmation
/sw:cancel-auto --force

# With reason
/sw:cancel-auto --reason "Need to switch to urgent bug fix"
```

---

## What It Does

1. Checks if auto session is active
2. Shows current session status
3. Asks for confirmation (unless `--force`)
4. Updates session status to "cancelled"
5. Releases session lock
6. Generates summary report

---

## Output Example

```
Current Session

Session ID: auto-2025-12-29-abc123
Status: running
Iteration: 47
Current Increment: 0001-user-auth
Increments Completed: 2
Duration: 2h 15m

Cancel this session? [y/N] y

Session cancelled

Summary: .specweave/logs/auto-2025-12-29-abc123-summary.md

To resume work later, say "continue working" or type /sw:do
```

---

## Summary Report

A summary report is generated at `.specweave/logs/auto-{session-id}-summary.md`:

```markdown
# Auto Session Summary

Session ID: auto-2025-12-29-abc123
Status: cancelled
Duration: 2h 15m
Iterations: 47

## Progress
- Tasks Completed: 28/42 (67%)
- Tests Passed: 112/115
- Coverage: 82%

## Increments
- 0001-user-auth: in-progress (15/20 tasks)
- 0002-payment: pending
- 0003-notifications: pending

## Cancellation
- Reason: Need to switch to urgent bug fix
- Time: 2025-12-29T12:15:00Z
```

---

## Notes

- Cancelling doesn't undo completed work
- `tasks.md` progress is preserved
- You can resume anytime by saying "continue working" or typing `/sw:do`
- Use Claude Code's `/resume` to restore full conversation context

---

## Related Commands

| Natural Language | Claude Code | Other AI Tools | Purpose |
|-----------------|-------------|----------------|---------|
| "Run autonomously" | `/sw:auto` | `auto` | Start auto session |
| "Check auto status" | `/sw:auto-status` | `auto-status` | Check session status |
| "Start implementing" | `/sw:do` | `do` | Resume work on tasks |

---

## See Also

- [Autonomous Execution Documentation](./auto) - Start autonomous execution
- [Auto Status Documentation](./auto-status) - Session status
- [Commands Overview](./overview) - All SpecWeave commands
