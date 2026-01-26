---
sidebar_position: 5
title: Autonomous Execution Guide
---

# Autonomous Execution Guide

Learn how to use SpecWeave's autonomous execution mode (`/sw:auto`) to work hands-free until all tasks are complete.

## Overview

Auto mode enables continuous autonomous execution using Claude Code's Stop Hook integration. It implements a feedback loop that prevents Claude from exiting until work is complete.

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS EXECUTION                       │
├──────────────────────────────────────────────────────────────┤
│  /sw:auto 0001                                                │
│      │                                                        │
│      ▼                                                        │
│  ┌────────────┐     ┌─────────────┐     ┌──────────────┐    │
│  │ Setup      │ ──▶ │ Execute     │ ──▶ │ Stop Hook    │    │
│  │ Session    │     │ /sw:do      │     │ Intercepts   │    │
│  └────────────┘     └─────────────┘     └──────┬───────┘    │
│                                                  │            │
│                     ┌────────────────────────────┘            │
│                     ▼                                         │
│              ┌──────────────┐                                 │
│              │ All Tasks    │                                 │
│              │ Complete?    │                                 │
│              └──────┬───────┘                                 │
│                     │                                         │
│         NO ─────────┼─────────── YES                          │
│         │           │             │                           │
│         ▼           │             ▼                           │
│  ┌──────────────┐   │    ┌──────────────┐                    │
│  │ Block Exit   │   │    │ Session      │                    │
│  │ Re-feed      │───┘    │ Complete!    │                    │
│  │ Prompt       │        └──────────────┘                    │
│  └──────────────┘                                            │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```bash
# Start auto on current active increment
/sw:auto

# Start on specific increment
/sw:auto 0001-user-authentication

# Start on multiple increments (queue)
/sw:auto 0001 0002 0003
```

### With Safety Limits

```bash
# Limit iterations
/sw:auto --max-iterations 50

# Limit time
/sw:auto --max-hours 8

# Both
/sw:auto --max-iterations 100 --max-hours 24
```

### Preview Mode

```bash
# See what would happen without starting
/sw:auto --dry-run
```

---

## When to Use Auto Mode

### Good Use Cases

| Scenario | Why Auto Mode Works |
|----------|---------------------|
| **Well-defined tasks** | Clear spec, clear ACs, minimal ambiguity |
| **10+ tasks** | Saves time vs manual `/sw:do` iterations |
| **Overnight work** | "Ship while sleeping" |
| **Test-driven work** | Self-healing test loops catch issues |
| **Brownfield cleanup** | Systematic refactoring across files |

### When to Avoid

| Scenario | Why Not Auto Mode |
|----------|-------------------|
| **Unclear requirements** | Will make wrong decisions autonomously |
| **Needs user input** | Human gates will pause session anyway |
| **Exploratory work** | Better to iterate manually |
| **Production deploys** | Human approval required (gated) |

---

## Session Management

### Check Status

```bash
/sw:auto-status
```

Output:
```
🤖 Auto Session Status

Status: 🟢 RUNNING

Session ID: auto-2025-12-29-abc123
Duration: 2h 15m
Iteration: 47 / 100

Progress: [████████████████░░░░░░░░░░░░░░] 47%

📋 Increment Queue
   Total: 3 | Completed: 2 | Failed: 0

📌 Current Increment: 0003-payment-integration
   Tasks: 12 / 18 (67%)
```

### Cancel Session

```bash
# Interactive (asks confirmation)
/sw:cancel-auto

# Force cancel
/sw:cancel-auto --force

# With reason
/sw:cancel-auto --reason "Need to pivot to urgent bug fix"
```

### Resume After Crash

If Claude Code crashes or you close the terminal:

```bash
# Just run /sw:do - it detects incomplete tasks
/sw:do

# Or use Claude Code's built-in resume
/resume
claude --continue
```

---

## Safety Features

### 1. Max Iterations

Prevents runaway loops:

```bash
/sw:auto --max-iterations 50
```

When reached, session completes gracefully with summary.

### 2. Max Hours

Time boxing for long sessions:

```bash
/sw:auto --max-hours 8
```

### 3. Human Gates

Sensitive operations require approval:

- `npm publish`
- `git push --force`
- `rm -rf /`
- Production deployments
- Database migrations (drop, delete)

Auto mode pauses and asks for confirmation:

```
⚠️ Human Gate Required

Operation: npm publish
Increment: 0007-release-v2

This operation requires human approval.

[Approve] [Reject] [Skip]
```

### 4. Self-Assessment Scoring

Claude scores its own confidence after each task:

| Score | Action |
|-------|--------|
| ≥ 0.90 | Continue confidently |
| 0.70-0.89 | Continue with caution |
| 0.50-0.69 | Self-review before continuing |
| < 0.50 | **STOP** and request human review |

### 5. Test Failure Detection

Multiple test failures (>3) pause the session:

```
🔴 Multiple test failures detected (5)

Auto session paused for human review.

Failing tests:
- auth.spec.ts:45 - Login redirect
- checkout.spec.ts:112 - Payment timeout
- ...

Run /sw:auto-status for details.
```

### 6. Circuit Breakers

External service failures are handled gracefully:

| Service | Failure Threshold | Recovery |
|---------|-------------------|----------|
| GitHub | 3 failures | Queue operations |
| JIRA | 3 failures | Queue operations |
| ADO | 3 failures | Queue operations |

---

## Configuration

Configure in `.specweave/config.json`:

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

| Option | Description | Default |
|--------|-------------|---------|
| `enabled` | Enable auto mode | `true` |
| `maxIterations` | Max loop iterations | `100` |
| `maxHours` | Max session duration | `24` |
| `testCommand` | Test command to run | `npm test` |
| `coverageThreshold` | Minimum coverage % | `80` |
| `enforceTestFirst` | Require tests before impl | `false` |
| `humanGated.patterns` | Operations requiring approval | `["deploy", "migrate", "publish"]` |
| `humanGated.timeout` | Gate timeout in seconds | `1800` |

---

## Test Execution Integration

Auto mode runs tests after completing testable tasks in a self-healing loop:

```
IMPLEMENT → TEST → FAIL? → FIX → TEST → PASS → NEXT TASK
                    ↑________________↓
                   (max 3 iterations)
```

### Test Status Reporting

After every task, you'll see:

```markdown
## 🧪 Test Status Report (after T-003)

| Type | Status | Pass/Total | Coverage |
|------|--------|------------|----------|
| Unit | ✅ | 42/42 | 87% |
| Integration | ✅ | 12/12 | - |
| E2E | ⚠️ | 8/10 | - |

**Failing tests:**
- `auth.spec.ts:45` - Login redirect not working

**Next:** Fixing E2E failure before continuing...
```

---

## Auto-Execute Rules

In auto mode, Claude MUST execute commands directly - never show manual steps.

### The Golden Rule

```
❌ FORBIDDEN: "Next Steps: Run wrangler deploy"
❌ FORBIDDEN: "Execute the schema in Supabase SQL Editor"
❌ FORBIDDEN: "Set secret via: wrangler secret put..."

✅ REQUIRED: Execute commands DIRECTLY using available credentials
```

### Credential Lookup Order

1. `.env` file - Primary credential storage
2. Environment variables - Already loaded in session
3. CLI tool auth - `wrangler whoami`, `gh auth status`
4. Config files - `wrangler.toml`, `.specweave/config.json`

### If Credentials Missing

Claude asks for them instead of showing manual steps:

```
🔐 Credential Required for Auto-Execution

I need your DATABASE_URL to execute the migration.

**Please paste your connection string:**
[I will save to .env and continue automatically]
```

---

## Best Practices

### 1. Validate Before Auto

```bash
# Run quality check first
/sw:validate 0001 --quality

# Then start auto
/sw:auto 0001
```

### 2. Use Dry Run for Large Sessions

```bash
# Preview what will happen
/sw:auto 0001 0002 0003 --dry-run

# If looks good, start for real
/sw:auto 0001 0002 0003
```

### 3. Set Reasonable Limits

```bash
# For overnight work
/sw:auto --max-hours 8 --max-iterations 100

# For quick focused work
/sw:auto --max-iterations 25
```

### 4. Monitor Initially

For your first few auto sessions:

1. Keep the terminal visible
2. Check `/sw:auto-status` periodically
3. Be ready to `/sw:cancel-auto` if needed

### 5. Review Summaries

After completion, review the summary:

```
.specweave/logs/auto-{session-id}-summary.md
```

---

## Troubleshooting

### Session Won't Start

```bash
❌ Auto session already active: auto-2025-12-29-xyz789

Options:
  1. Cancel it: /sw:cancel-auto
  2. Check status: /sw:auto-status
  3. Let it continue (close this tab)
```

**Solution**: Cancel the existing session or let it finish.

### Session Stuck

If a session seems stuck:

```bash
# Check status
/sw:auto-status

# If paused, check why
cat .specweave/state/auto-session.json
```

Common causes:
- Human gate pending approval
- Low confidence score
- Multiple test failures

### Tests Keep Failing

If tests repeatedly fail:

1. Session will pause after 3+ failures
2. Review failing tests manually
3. Fix issues
4. Resume with `/sw:do`

---

## Simple Mode

For minimal context, use simple mode:

```bash
/sw:auto --simple
```

Simple mode:
- Minimal re-feed prompt
- No session state UI
- No queue management
- Just: loop + completion check + max iterations

Good for:
- Very straightforward tasks
- Reducing token usage
- Maximum speed

---

## For Non-Claude AI Systems

If using SpecWeave with other AI systems (GPT, Gemini, etc.), implement this pattern:

```bash
#!/bin/bash
# autonomous-loop.sh

MAX_ITER=100
ITER=0

while true; do
    # Check completion
    TOTAL=$(grep -c "^### T-" .specweave/increments/*/tasks.md 2>/dev/null || echo "0")
    DONE=$(grep -c '\[x\].*completed' .specweave/increments/*/tasks.md 2>/dev/null || echo "0")

    if [ "$TOTAL" -gt 0 ] && [ "$DONE" -ge "$TOTAL" ]; then
        echo "All tasks complete!"
        break
    fi

    # Feed to AI
    cat PROMPT.md | your-ai-cli

    # Safety: max iterations
    ITER=$((ITER + 1))
    if [ "$ITER" -ge "$MAX_ITER" ]; then
        echo "Max iterations reached"
        break
    fi
done
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:auto` | Start autonomous execution |
| `/sw:auto-status` | Check session status |
| `/sw:cancel-auto` | Cancel running session |
| `/sw:do` | Manual task execution |
| `/sw:progress` | Show increment progress |
| `/sw:validate` | Quality check before auto |

---

## Summary

| Aspect | Details |
|--------|---------|
| **Start** | `/sw:auto [increment-ids] [options]` |
| **Check** | `/sw:auto-status` |
| **Cancel** | `/sw:cancel-auto` |
| **Resume** | `/sw:do` (auto-detects incomplete) |
| **Max iterations** | `--max-iterations N` (default: 100) |
| **Max hours** | `--max-hours N` (optional) |
| **Simple mode** | `--simple` (minimal context) |
| **Preview** | `--dry-run` |

**Philosophy**:
> Auto mode isn't about removing humans from the loop - it's about letting you focus on decisions while Claude handles execution.
