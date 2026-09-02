---
description: |
  Unified increment state management. Change increment status: pause, resume, backlog, or reopen.
  Use when changing increment lifecycle state (blocked, deprioritized, ready to start, bug found).
argument-hint: <increment-id> <pause|resume|backlog|reopen> [--reason="reason"] [--task T-XXX]
disable-model-invocation: true
---

# State Management Command

**Unified command for all increment state transitions.**

## Usage

```bash
sw:state <id> pause   [--reason="reason"]      # Pause active increment
sw:state <id> resume                            # Resume paused/backlog increment
sw:state <id> backlog [--reason="reason"]      # Move to backlog (planned, not started)
sw:state <id> reopen  [--reason="reason"]      # Reopen completed work
sw:state <id> reopen  --task T-003 [--reason]  # Reopen specific task
sw:state <id> reopen  --user-story US-001      # Reopen user story + related tasks
```

## Actions

### `pause` - Pause Active Increment

When blocked by external dependency, waiting for review, or deprioritized.

**Valid transitions**: active → paused

**Behavior:**
1. Normalize increment ID (supports `0153` or `0153-feature-name`)
2. Validate increment exists and is "active"
3. Prompt for reason if not provided via --reason
4. Update metadata.json: status → "paused", pausedReason, pausedAt
5. Display confirmation, suggest `sw:state <id> resume` to continue

**Examples:**
```bash
sw:state 0006 pause --reason="Waiting for Stripe API keys"

# Interactive (prompts for reason)
sw:state 0006 pause
```

**Edge cases:**
- Already paused → offer to update reason
- Completed/abandoned → error with guidance

### `resume` - Resume Paused/Backlog Increment

When blocker resolved, ready to start backlog work, or reviving abandoned work.

**Valid transitions**: paused → active, backlog → active, abandoned → active (with confirmation)

**Behavior:**
1. Normalize increment ID
2. Validate increment is "paused", "backlog", or "abandoned"
3. Calculate pause/backlog duration
4. Update metadata.json: status → "active", clear pause/backlog fields
5. Show context recovery (progress %, last activity, duration)
6. Suggest `sw:do` to continue work

**Examples:**
```bash
sw:state 0006 resume
# → Increment 0006 resumed. Was paused for: 3 days, 4 hours
# → Continue with: sw:do

sw:state 0032 resume
# → Increment 0032 activated from backlog. Was in backlog for: 5 days
# → Start work with: sw:do
```

**Edge cases:**
- Already active → no action needed
- Completed → error
- Abandoned → requires confirmation

### `backlog` - Move to Backlog

For planned work not ready to start. Does NOT count as active.

**Valid transitions**: active → backlog

**Key difference**: Backlog = never started (future work). Paused = started but blocked.

**Behavior:**
1. Validate increment is "active"
2. Prompt for reason if not provided
3. Update metadata.json: status → "backlog", backlogReason, backlogAt
4. Display confirmation

**Examples:**
```bash
sw:state 0032 backlog --reason="Low priority, focus on 0031 first"
```

**Edge cases:**
- Already in backlog → offer to update reason
- Paused → error (resume or abandon instead)
- Completed → error

### `reopen` - Reopen Completed Work

When issues discovered after completion. Supports reopening entire increment, specific task, or user story.

**Valid transitions**: completed → active

**Behavior:**
1. Validate increment is "completed"
2. Print the advisory WIP note when active increments exceed `limits.activeIncrements`
3. Update metadata.json: status → "active", add to reopened history
4. Reopen tasks: [x] → [ ]
5. Sync to external tools (GitHub/JIRA/ADO)
6. Create audit trail

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| `--reason` | Why reopening (for audit trail). Natural language also works. |
| `--task T-XXX` | Reopen specific task only |
| `--user-story US-XXX` | Reopen user story + all related tasks |

**Examples:**
```bash
# Reopen entire increment
sw:state 0031 reopen --reason="GitHub sync failing in production"

# Natural language (everything after action is the reason)
sw:state 0043 reopen Bug found in AC sync implementation

# Reopen specific task
sw:state 0031 reopen --task T-003 --reason="API rate limiting not handled"

# Reopen user story
sw:state 0025 reopen --user-story US-002 --reason="Security requirements not satisfied"
```

**Advisory WIP note** (never blocks):
```
ℹ️  3 active increments (recommended: 2). Prefer finishing before starting.
```

To bring the count down, pause (`sw:state 0030 pause --reason="..."`) or
complete (`sw:done 0029`) another increment. Set `limits.activeIncrements`
in `.specweave/config.json` to change the number, or `0` to silence the note.

**Audit Trail** (metadata.json):
```json
{
  "reopened": {
    "count": 1,
    "history": [{
      "date": "2025-11-14T15:30:00Z",
      "reason": "GitHub sync failing",
      "previousStatus": "completed"
    }]
  }
}
```

**External Tool Sync:**
- GitHub: Reopens closed issue, adds `reopened` label
- JIRA: Transitions Done → In Progress
- ADO: Updates state Closed → Active

## Status Flow

```
active ──pause──→ paused ──resume──→ active
  │                                     ↑
  ├──backlog──→ backlog ──resume────────┘
  │                                     ↑
  └──────────→ completed ──reopen───────┘
                    │
               abandoned ──resume──→ active (with confirmation)
```

## Stale Increment Warnings

Increments paused/backlog for 7+ days trigger warnings in `sw:status`:

```
Paused (1):
  0007-stripe-integration [feature]
     Paused: 10 days ago
     Reason: Waiting for Stripe API keys
     STALE! Review or abandon?
```

## Best Practices

- Always provide a reason (audit trail)
- Review paused/backlog items weekly
- Use `reopen --task` for surgical fixes (don't reopen entire increment)
- Prefer finishing active increments before reopening more
- After `resume`, review spec.md first (context may have changed)
