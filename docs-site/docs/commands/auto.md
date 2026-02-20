---
sidebar_position: 10
---

# /sw:auto - Autonomous Execution

**Start autonomous execution session using Claude Code's Stop Hook.**

Auto mode enables continuous autonomous execution until all tasks are complete. It uses a stop hook feedback loop to keep Claude working until completion.

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
| `--simple` | Simple mode (minimal context) | false |
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

# Simple mode (minimal context)
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

---

## Session Management

### Check Status

```bash
/sw:auto-status
```

**See**: [/sw:auto-status Documentation](./auto-status)

### Cancel Session

```bash
/sw:cancel-auto
```

**See**: [/sw:cancel-auto Documentation](./cancel-auto)

### Resume After Crash

Just run `/sw:do` - it will detect incomplete tasks and continue.

Or use Claude Code's built-in:
```bash
/resume           # Pick session to resume
claude --continue # Continue last session
```

---

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

---

## Completion Signals

The session ends when ANY of these occur:

| Signal | Description |
|--------|-------------|
| **All tasks complete** | tasks.md has all `[x]` checkboxes |
| **Completion promise** | Output contains `<!-- auto-complete:DONE -->` (hidden HTML comment) |
| **Max iterations** | Reached configured limit (default: 100) |
| **Max hours** | Time limit exceeded |
| **User cancellation** | User runs `/sw:cancel-auto` |
| **Human gate timeout** | Gate pending too long |
| **Low confidence score** | Self-assessment score < 0.50 |

---

## Simple Mode (--simple)

Pure stop hook loop behavior:
- Minimal context in re-feed prompt
- No session state UI
- No queue management
- Just: loop + tasks.md completion + max iterations

```bash
/sw:auto --simple
```

---

## Safety Features

| Feature | Description |
|---------|-------------|
| **Human Gates** | Sensitive operations (deploy, publish, force-push) require approval |
| **Circuit Breakers** | External service failures (GitHub/JIRA/ADO) handled gracefully |
| **Max Iterations** | Prevents runaway loops (default: 100) |
| **Max Hours** | Optional time boxing |
| **stop_hook_active** | Prevents infinite continuation loops |
| **Self-Assessment** | Scores below 0.50 pause for human review |
| **Test Failures** | Multiple failures (>3) pause for review |
| **Credential Errors** | Repeated deployment errors pause for credential check |

---

## Self-Assessment Scoring

Auto mode uses self-assessment scoring to guide continuation decisions.

### Confidence Scoring

After each task, Claude self-assesses execution quality:

```json
{
  "iteration": 5,
  "task": "T-003",
  "confidence": {
    "execution_quality": 0.92,
    "test_coverage": 0.85,
    "spec_alignment": 0.95,
    "credential_success": 1.0,
    "overall": 0.93
  }
}
```

### Score Thresholds

| Overall Score | Action |
|---------------|--------|
| ≥ 0.90 | ✅ Continue confidently |
| 0.70-0.89 | ⚠️ Continue with caution, log concerns |
| 0.50-0.69 | 🟡 Pause for self-review before continuing |
| < 0.50 | 🔴 Stop and request human review |

---

## Test Execution Integration

Auto mode runs tests after completing testable tasks in a self-healing loop:

```
┌─────────────────────────────────────────────────────────────┐
│ IMPLEMENT → TEST → FAIL? → FIX → TEST → PASS → NEXT TASK   │
│                     ↑________________↓                       │
│                    (max 3 iterations)                        │
└─────────────────────────────────────────────────────────────┘
```

**Mandatory Test Reporting** after every task:

```markdown
## 🧪 Test Status Report (after T-003)

| Type | Status | Pass/Total | Coverage |
|------|--------|------------|----------|
| Unit | ✅ | 42/42 | 87% |
| Integration | ✅ | 12/12 | - |
| E2E | ⚠️ | 8/10 | - |
```

---

## Auto-Execute Rules

In auto mode, all agents MUST follow auto-execute rules:

```
❌ FORBIDDEN: "Next Steps: Run wrangler deploy"
❌ FORBIDDEN: "Execute the schema in Supabase SQL Editor"

✅ REQUIRED: Execute commands DIRECTLY using available credentials
```

### Credential Lookup Order

1. `.env` file - Primary credential storage
2. Environment variables - Already loaded in session
3. CLI tool auth - `wrangler whoami`, `gh auth status`, etc.
4. Config files - `wrangler.toml`, `.specweave/config.json`

If credentials found → **AUTO-EXECUTE**
If credentials missing → **ASK** (don't show manual steps)

---

## Human-Gated Operations

These operations require manual approval even in auto mode:

- `npm publish`, `git push --force`, `rm -rf /`
- Any `production` deployment
- API key or credential changes
- Database migrations (`drop`, `delete from`, `migrate`)

---

## Session State

Session state is stored in `.specweave/state/auto-session.json`:

```json
{
  "sessionId": "auto-2025-12-29-abc123",
  "status": "running",
  "startTime": "2025-12-29T10:00:00Z",
  "iteration": 47,
  "maxIterations": 100,
  "incrementQueue": ["0001-user-auth", "0002-payment"],
  "currentIncrement": "0001-user-auth",
  "completedIncrements": [],
  "simple": false
}
```

---

## For Non-Claude AI Systems

If using SpecWeave with other AI systems (GPT, Gemini, etc.), implement this loop pattern:

```bash
# Bash loop for autonomous execution
while true; do
    # Check if all tasks complete
    TOTAL=$(grep -c "^### T-" .specweave/increments/*/tasks.md 2>/dev/null || echo "0")
    DONE=$(grep -c '\[x\].*completed' .specweave/increments/*/tasks.md 2>/dev/null || echo "0")

    if [ "$TOTAL" -gt 0 ] && [ "$DONE" -ge "$TOTAL" ]; then
        echo "All tasks complete!"
        break
    fi

    # Feed prompt to your AI
    cat PROMPT.md | your-ai-cli

    # Safety: max iterations
    ITER=$((ITER + 1))
    if [ "$ITER" -ge 100 ]; then
        echo "Max iterations reached"
        break
    fi
done
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:auto-status` | Check session status |
| `/sw:cancel-auto` | Cancel running session |
| `/sw:do` | Execute tasks (also works standalone) |
| `/sw:progress` | Show increment progress |

---

## See Also

- [Commands Overview](./overview) - All SpecWeave commands
- [/sw:do Documentation](./do) - Task execution
- [/sw:auto-status Documentation](./auto-status) - Session status
- [/sw:cancel-auto Documentation](./cancel-auto) - Cancel session
