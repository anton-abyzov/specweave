---
name: sw:cancel-go
description: Cancel active go session (Ralph loop). Immediately stops iteration and cleans up session state.
argument-hint: "[--force]"
allowed-tools: ["Bash(specweave cancel-go *)"]
---

# Cancel Go Command

**Stop the active go session immediately.**

Execute the cancel command:

```!
specweave cancel-go $ARGUMENTS
```

## Usage

```bash
/sw:cancel-go [OPTIONS]
```

## Options

| Option | Description |
|--------|-------------|
| `--force` | Skip confirmation prompt |

## What Happens

1. **Session stopped** - Loop terminates immediately
2. **State cleaned up** - Session file deleted
3. **Logs preserved** - Iteration log kept for review
4. **Exit approved** - Claude Code session can exit normally

## Examples

### Basic Cancel (with confirmation)

```bash
/sw:cancel-go
```

**Prompt**:
```
Cancel go session: go-2026-01-08-abc123?
This will stop the loop after 15 iterations.

Continue? (y/n)
```

### Force Cancel (no confirmation)

```bash
/sw:cancel-go --force
```

**Output**:
```
✅ Go session cancelled: go-2026-01-08-abc123
   Iterations completed: 15 / 100
   Runtime: 12m 34s

   Logs saved to: .specweave/logs/go-iterations.log
```

## No Active Session

If no go session is active:

```
No active go session found.
Nothing to cancel.
```

## When to Cancel

**Good reasons to cancel**:
- Task is taking longer than expected
- Approach is wrong, need to rethink
- Want to manually finish the task
- Need to change the prompt
- Debugging the loop behavior

**Alternative to canceling**:
- Let it hit max iterations (safer)
- Add completion promise if missing
- Check logs: `cat .specweave/logs/go-iterations.log`

## After Canceling

To resume work:
```bash
# Option 1: Start fresh go session with new prompt
/sw:go "NEW PROMPT" --max-iterations 50

# Option 2: Use standard increment workflow instead
/sw:increment "feature name"
/sw:do
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:go` | Start go session |
| `/sw:go-status` | Check session status |
