---
name: sw:go-status
description: Check status of active go session (Ralph loop). Shows iteration count, completion criteria, and runtime.
argument-hint: "[OPTIONS]"
allowed-tools: ["Bash(specweave go-status *)"]
---

# Go Status Command

**Check the status of your active go session.**

Execute the status command:

```!
specweave go-status $ARGUMENTS
```

## Usage

```bash
/sw:go-status [OPTIONS]
```

## Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed information |
| `--json` | Output as JSON |

## Output

Shows:
- Session ID
- Current iteration / max iterations
- Completion promise (if set)
- Quality gates (if any)
- Runtime duration
- Status (running/completed/max_iterations_reached)

## Examples

### Basic Status

```bash
/sw:go-status
```

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Go Session Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session ID: go-2026-01-08-abc123
Status: running

Iteration: 15 / 100
Runtime: 12m 34s

Completion Promise: "DONE"
Quality Gates: Tests, Build

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verbose Output

```bash
/sw:go-status --verbose
```

Shows additional details:
- Full prompt
- Created timestamp
- Last iteration timestamp
- Log file location

### JSON Output

```bash
/sw:go-status --json
```

**Output**:
```json
{
  "sessionId": "go-2026-01-08-abc123",
  "status": "running",
  "iteration": 15,
  "maxIterations": 100,
  "completionPromise": "DONE",
  "conditions": {
    "build": true,
    "tests": true,
    "e2e": false,
    "lint": false,
    "types": false
  },
  "createdAt": "2026-01-08T10:30:00Z",
  "runtime": "12m 34s"
}
```

## No Active Session

If no go session is active:

```
No active go session found.
Run /sw:go "PROMPT" to start a session.
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:go` | Start go session |
| `/sw:cancel-go` | Cancel go session |
