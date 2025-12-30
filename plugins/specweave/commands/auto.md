---
name: sw:auto
description: Start autonomous execution session with stop hook integration. Works until all tasks complete or max iterations reached. Uses Ralph Wiggum pattern with SpecWeave workflow integration. Activates for: auto, autonomous, auto mode, ship while sleeping.
---

# Auto Command

**Start autonomous execution session using Claude Code's Stop Hook.**

## Usage

```bash
/sw:auto [INCREMENT_IDS...] [OPTIONS]
```

## Arguments

- `INCREMENT_IDS`: One or more increment IDs to process (e.g., `0001`, `0001-feature`)
  - If omitted, uses current in-progress increment

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-iterations N` | Maximum iterations before stopping | 100 |
| `--max-hours N` | Maximum hours to run | None |
| `--simple` | Pure Ralph mode (minimal context) | false |
| `--dry-run` | Preview without starting | false |
| `--all-backlog` | Process all backlog items | false |
| `--skip-gates G1,G2` | Pre-approve specific gates | None |

## How It Works

```
1. User runs /sw:auto 0001
           │
           ▼
2. setup-auto.sh creates session state
   └─ .specweave/state/auto-session.json
           │
           ▼
3. Claude starts working on tasks
   └─ /sw:do executes tasks
           │
           ▼
4. Claude tries to exit (naturally)
           │
           ▼
5. Stop Hook intercepts (stop-auto.sh)
   ├─ Checks: All tasks complete?
   ├─ Checks: Max iterations reached?
   ├─ Checks: Completion promise?
   └─ Checks: Human gate pending?
           │
   ┌──────┴──────┐
   ▼             ▼
INCOMPLETE    COMPLETE
   │             │
   ▼             ▼
Block exit    Approve exit
Re-feed       Session ends
prompt
```

## Examples

### Basic Usage

```bash
# Start auto on current increment
/sw:auto

# Start on specific increment
/sw:auto 0001-user-auth

# Multiple increments
/sw:auto 0001 0002 0003
```

### With Options

```bash
# Limit iterations
/sw:auto --max-iterations 50

# Time limit
/sw:auto --max-hours 8

# Simple/Ralph mode
/sw:auto --simple

# Preview only
/sw:auto --dry-run

# All backlog items
/sw:auto --all-backlog
```

### Pre-approve Gates

```bash
# Skip deploy gate (pre-approved)
/sw:auto --skip-gates deploy

# Multiple gates
/sw:auto --skip-gates "deploy,migrate"
```

## Session Management

### Check Status

```bash
/sw:auto-status
```

### Cancel Session

```bash
/sw:cancel-auto
```

### Resume After Crash

Just run `/sw:do` - it will detect incomplete tasks and continue.

Or use Claude Code's built-in:
```bash
/resume           # Pick session to resume
claude --continue # Continue last session
```

## Configuration

In `.specweave/config.json`:

```json
{
  "auto": {
    "enabled": true,
    "maxIterations": 100,
    "maxHours": 24,
    "testCommand": "npm test",
    "coverageThreshold": 80,
    "enforceTestFirst": false,
    "humanGated": {
      "patterns": ["deploy", "migrate", "publish"],
      "timeout": 1800
    }
  }
}
```

## Completion Signals

The session ends when ANY of these occur:

1. **All tasks complete** - tasks.md has all `[x]` checkboxes
2. **Completion promise** - Output contains `<auto-complete>DONE</auto-complete>`
3. **Max iterations** - Reached configured limit
4. **Max hours** - Time limit exceeded
5. **User cancellation** - `/sw:cancel-auto`
6. **Human gate timeout** - Gate pending too long

## Simple Mode (--simple)

Pure Ralph Wiggum behavior:
- Minimal context in re-feed prompt
- No session state UI
- No queue management
- Just: loop + tasks.md completion + max iterations

```bash
/sw:auto --simple
```

## Safety Features

- **Human Gates**: Sensitive operations require approval
- **Circuit Breakers**: External service failures handled gracefully
- **Max Iterations**: Prevents runaway loops
- **Max Hours**: Time boxing
- **stop_hook_active**: Prevents infinite continuation loops

## Execution

When this command is invoked:

1. **Check for existing session**:
   ```bash
   if [ -f ".specweave/state/auto-session.json" ]; then
       # Check status, warn if already running
   fi
   ```

2. **Run setup script**:
   ```bash
   bash plugins/specweave/scripts/setup-auto.sh [args]
   ```

3. **Start execution**:
   ```
   Now starting autonomous execution...

   Session: auto-2025-12-29-abc123
   Increment: 0001-user-auth
   Tasks: 12 pending

   The stop hook will keep me working until all tasks are complete
   or you run /sw:cancel-auto.

   Beginning with T-001...
   ```

4. **Execute /sw:do in a loop** (stop hook handles continuation):
   - Work on tasks
   - Mark complete in tasks.md
   - Update spec.md ACs
   - Sync to external tools

5. **On completion**:
   ```
   <auto-complete>DONE</auto-complete>

   ✅ Auto Session Complete!

   Session: auto-2025-12-29-abc123
   Duration: 2h 34m
   Iterations: 47
   Tasks Completed: 42/42
   Tests Passed: 156/156
   Coverage: 87%

   Summary saved to: .specweave/logs/auto-2025-12-29-abc123-summary.md
   ```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:auto-status` | Check session status |
| `/sw:cancel-auto` | Cancel session |
| `/sw:do` | Execute tasks (also works standalone) |
| `/sw:progress` | Show increment progress |
