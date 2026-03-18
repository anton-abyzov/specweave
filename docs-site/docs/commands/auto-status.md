---
sidebar_position: 11
---

import CommandTabs from '@site/src/components/CommandTabs';

# Auto Session Status

**Show the current auto session status and progress.**

## Usage

<CommandTabs
  natural='Check auto status'
  claude='/sw:auto-status'
  other='auto-status'
/>

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format (for programmatic use) |
| `--simple` | Minimal output (one-liner) |

## Examples

Additional options:
```bash
# Get JSON output
/sw:auto-status --json

# Quick status check
/sw:auto-status --simple
```

---

## What It Shows

### Session Information
- **Session ID**: Unique identifier for this auto run
- **Status**: Running, completed, cancelled, or paused
- **Duration**: How long the session has been running
- **Iteration**: Current iteration out of maximum

### Progress
- Visual progress bar
- Increment queue status (total/completed/failed)
- Current increment task progress

### Warnings
- **Human Gate Pending**: Session is waiting for human approval
- **Circuit Breakers Open**: External services unavailable

---

## Output Example

```
Auto Session Status

Status: RUNNING

Session ID: auto-2025-12-29-abc123
Duration: 2h 15m
Iteration: 47 / 100

Progress: [================............] 47%

Increment Queue
   Total: 3 | Completed: 2 | Failed: 0

Current Increment: 0003-payment-integration
   Tasks: 12 / 18 (67%)

Actions:
   Cancel: /sw:cancel-auto (or say "stop auto")
   Let it run: Close this tab, work will continue
```

---

## JSON Output Format

```json
{
  "active": true,
  "sessionId": "auto-2025-12-29-abc123",
  "status": "running",
  "iteration": 47,
  "maxIterations": 100,
  "duration": "2h 15m",
  "currentIncrement": "0003-payment-integration",
  "incrementQueue": {
    "total": 3,
    "completed": 2,
    "failed": 0
  },
  "currentProgress": {
    "tasksCompleted": 12,
    "tasksTotal": 18
  },
  "humanGatePending": false,
  "openCircuitBreakers": 0,
  "simpleMode": false
}
```

---

## Status Values

| Status | Description |
|--------|-------------|
| **running** | Session actively executing tasks |
| **completed** | All tasks finished successfully |
| **paused** | Waiting for human review (low score, test failures) |
| **cancelled** | User cancelled the session (or typed `/sw:cancel-auto` in Claude Code) |

---

## Notes

- Status is read from `.specweave/state/auto-session.json`
- Progress is calculated from tasks.md files
- Use `--json` for integration with other tools
- The session continues even if you close the terminal

---

## Related Commands

| Natural Language | Claude Code | Other AI Tools | Purpose |
|-----------------|-------------|----------------|---------|
| "Run autonomously" | `/sw:auto` | `auto` | Start auto session |
| "Stop auto" | `/sw:cancel-auto` | `cancel-auto` | Cancel running session |
| "What's the status?" | `/sw:progress` | `progress` | Show increment progress |

---

## See Also

- [Autonomous Execution Documentation](./auto) - Start autonomous execution
- [Cancel Auto Documentation](./cancel-auto) - Cancel session
- [Commands Overview](./overview) - All SpecWeave commands
