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

:::tip 🚀 Claude Code's Game-Changing Features for Auto Mode
**Compact Command (VSCode)** — Use `compact` mode to keep Claude Code inside your VSCode window. Work continuously for **hours** in the same session without context switching between terminal and editor. Perfect for long auto mode sessions!

**STOP Hooks with Subagents** — Stop hooks now work with spawned subagents! This means `/sw:auto` can validate quality gates at EVERY level of execution. When auto mode spawns specialized agents (QA, Security, Performance), the stop hook validates their results before allowing the session to continue.

**Real-world proof**: Boris Cherny (Claude Code creator) shipped 259 PRs, 497 commits, 40,000 lines in one month without opening an IDE — using autonomous execution with stop hooks. [See demo](https://x.com/bcherny/status/2004916410687050167)
:::

## Arguments

- `INCREMENT_IDS`: One or more increment IDs to process (e.g., `0001`, `0001-feature`)
  - **NEW BEHAVIOR**: If omitted, auto mode will:
    1. Check for active/in-progress increments
    2. If none found, **intelligently create increments** based on user context/prompt
    3. Match existing planned increments to user intent OR extend them

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-iterations N` | Maximum iterations before stopping | 500 |
| `--max-hours N` | Maximum hours to run | 120 (5 days) |
| `--simple` | Pure Ralph mode (minimal context) | false |
| `--dry-run` | Preview without starting | false |
| `--all-backlog` | Process all backlog items | false |
| `--skip-gates G1,G2` | Pre-approve specific gates | None |
| `--no-increment`, `--no-inc` | Skip auto-creation (require existing increments) | false |

## Intelligent Increment Creation (NEW!)

**Auto mode now creates increments automatically when none exist!**

### Decision Flow

```
/sw:auto invoked
     │
     ▼
Are INCREMENT_IDS specified? ──YES──> Use specified increments
     │
     NO
     ▼
Active increment exists? ──YES──> Use active increment
     │
     NO
     ▼
--no-increment/--no-inc flag? ──YES──> ERROR: No increments found
     │
     NO (DEFAULT)
     ▼
🧠 INTELLIGENT INCREMENT CREATION
     │
     ├─> Analyze user context/prompt
     ├─> Check for matching planned/backlog increments
     ├─> Match existing OR create new increment(s)
     │
     ▼
Auto mode starts with new/matched increment(s)
```

### Intelligence Patterns

The LLM will analyze the context and decide:

1. **Match Existing**: If user says "continue the auth feature" → finds `0002-user-authentication`
2. **Extend Existing**: If user says "add password reset" → extends auth increment with new tasks
3. **Create New**: If user says "build a payment system" → creates `0003-payment-integration`
4. **Multiple Increments**: If user says "finish all pending features" → creates queue from backlog
5. **Ask User**: If ambiguous, LLM will ask clarifying questions before creating

### Examples

```bash
# User says: "Let's ship the dashboard feature"
/sw:auto
# → LLM finds 0004-dashboard in backlog, activates it

# User says: "Build a user profile page with avatar upload"
/sw:auto
# → LLM creates 0005-user-profile-page with spec + tasks

# User says: "I want to work on auth and notifications"
/sw:auto
# → LLM creates queue: [0001-authentication, 0002-notifications]

# User says: "Just work on what's already planned"
/sw:auto --no-increment  # or --no-inc
# → ERROR if no active increment (strict mode)
```

## How It Works

```
1. User runs /sw:auto (with or without IDs)
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
    "maxIterations": 500,
    "maxHours": 120,
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

**Note**: The stop hook will NOT allow completion until tests are actually executed. If test files exist (`.test.ts`, `.spec.ts`, `playwright.config.ts`, etc.), auto mode will block exit and require test runs.

## Completion Signals

The session ends when ANY of these occur:

1. **All tasks complete + tests passed** - tasks.md has all `[x]` AND tests were executed
2. **Completion promise** - Output contains `<auto-complete>DONE</auto-complete>`
3. **Max iterations** - Reached configured limit (default: 500)
4. **Max hours** - Time limit exceeded (default: 120 hours / 5 days)
5. **User cancellation** - `/sw:cancel-auto`
6. **Human gate timeout** - Gate pending too long

**⚠️ IMPORTANT**: Auto mode will NOT complete just because tasks are marked done. If test files exist in the project, the stop hook ENFORCES test execution. You'll see messages like:
- "🧪 MANDATORY: All tasks marked complete but NO TEST EXECUTION detected"
- "🎭 MANDATORY: E2E tests exist but were NOT executed"

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

## 🔐 Auto-Execute with Credentials (MANDATORY)

**In auto mode, ALL agents MUST follow the auto-execute skill rules:**

### The Golden Rule

```
❌ FORBIDDEN: "Next Steps: Run wrangler deploy"
❌ FORBIDDEN: "Execute the schema in Supabase SQL Editor"
❌ FORBIDDEN: "Set secret via: wrangler secret put..."

✅ REQUIRED: Execute commands DIRECTLY using available credentials
```

### Credential Lookup Order

Before ANY deployment task, check for credentials:

1. **`.env` file** - Primary credential storage
2. **Environment variables** - Already loaded in session
3. **CLI tool auth** - `wrangler whoami`, `gh auth status`, etc.
4. **Config files** - `wrangler.toml`, `.specweave/config.json`

### If Credentials Found → AUTO-EXECUTE

```bash
# Example: Supabase migration
if grep -q "DATABASE_URL" .env; then
  source .env
  psql "$DATABASE_URL" -f schema.sql
fi

# Example: Wrangler deployment
if wrangler whoami 2>/dev/null; then
  wrangler deploy
fi
```

### If Credentials Missing → ASK, Don't Show Manual Steps

```markdown
🔐 **Credential Required for Auto-Execution**

I need your Supabase database URL to execute the migration.

**Please paste your DATABASE_URL:**
[I will save to .env and continue automatically]
```

**After user provides credential:**
1. Save to `.env`
2. EXECUTE immediately
3. Continue auto mode

See: `plugins/specweave/skills/auto-execute/SKILL.md` for full details.

---

## 🎯 Self-Assessment Scoring (Ralph-Loop Pattern)

**Auto mode uses self-assessment scoring to guide continuation decisions:**

### Confidence Scoring

After each task/iteration, Claude self-assesses execution quality:

```json
{
  "iteration": 5,
  "task": "T-003",
  "confidence": {
    "execution_quality": 0.92,     // How well was the task executed?
    "test_coverage": 0.85,         // Are tests adequate?
    "spec_alignment": 0.95,        // Does implementation match spec?
    "credential_success": 1.0,     // Were all deployments successful?
    "overall": 0.93                // Weighted average
  },
  "concerns": [],
  "blockers": []
}
```

### Score Thresholds

| Overall Score | Action |
|---------------|--------|
| ≥ 0.90 | ✅ Continue confidently |
| 0.70-0.89 | ⚠️ Continue with caution, log concerns |
| 0.50-0.69 | 🟡 Pause for self-review before continuing |
| < 0.50 | 🔴 Stop and request human review |

### Self-Assessment Prompt (Internal)

After completing each task, evaluate:

```markdown
<self-assessment>
Task: T-003 - Implement user authentication
Status: completed

Execution Quality (0.0-1.0): 0.92
- ✅ All acceptance criteria met
- ✅ Tests pass
- ⚠️ Minor edge case not covered (low impact)

Test Coverage (0.0-1.0): 0.85
- ✅ Unit tests: 12/12 pass
- ✅ Integration tests: 5/5 pass
- ⚠️ E2E test coverage: 75% (target: 80%)

Spec Alignment (0.0-1.0): 0.95
- ✅ All ACs addressed
- ✅ Architecture matches plan.md

Credential Success (0.0-1.0): 1.0
- ✅ Database migration executed successfully
- ✅ Secrets deployed to Cloudflare

Overall: 0.93 → CONTINUE
</self-assessment>
```

### Integration with Stop Hook

The stop hook (`plugins/specweave/hooks/stop-auto.sh`) reads this scoring:

```bash
# Check self-assessment in transcript
SCORE=$(grep -oP 'Overall:\s*\K[0-9.]+' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1)

if [ -n "$SCORE" ] && [ "$(echo "$SCORE < 0.50" | bc)" -eq 1 ]; then
    # Score too low, stop for human review
    approve "Low confidence score ($SCORE), requesting human review"
fi
```

### Test Execution Integration (MANDATORY)

**Auto mode MUST run tests after completing testable tasks in a self-healing loop:**

```bash
# Test execution loop (Ralph Loop pattern)
MAX_ATTEMPTS=3
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))

    # 1. Run unit/integration tests
    npm test 2>&1 | tee test-output.log
    UNIT_RESULT=$?

    # 2. Run E2E tests if UI exists
    if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
        npx playwright test --reporter=list 2>&1 | tee e2e-output.log
        E2E_RESULT=$?
    else
        E2E_RESULT=0
    fi

    # 3. Check results
    if [ $UNIT_RESULT -eq 0 ] && [ $E2E_RESULT -eq 0 ]; then
        echo "✅ All tests passed!"
        break
    fi

    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "🔴 Tests failed (attempt $ATTEMPT/$MAX_ATTEMPTS), analyzing and fixing..."
        # AI analyzes failure, fixes code, continues loop
    else
        echo "❌ Tests failed after $MAX_ATTEMPTS attempts, stopping for review"
        exit 1
    fi
done
```

### E2E Testing with Playwright (when UI exists)

**ALWAYS execute E2E tests for user-facing features:**

```bash
# Install browsers if needed (first run)
npx playwright install --with-deps chromium

# Run E2E tests
npx playwright test

# On failure, run with trace for debugging
npx playwright test --trace on

# Run specific test file
npx playwright test tests/auth.spec.ts

# Run in headed mode for debugging
npx playwright test --headed
```

**MVP Critical Path Tests (MUST implement):**
1. **Auth flows**: Login, logout, registration, password reset
2. **Core CRUD**: Create, read, update, delete main entities
3. **Business transactions**: Checkout, payment, order flow
4. **Data validation**: Form submissions, error states

### Continuous Refactoring (Part of Auto Loop)

**Every 3-5 tasks, proactively refactor:**

```
┌─────────────────────────────────────────────────────────────┐
│ REFACTORING TRIGGERS (check after every 3-5 tasks):         │
├─────────────────────────────────────────────────────────────┤
│ • Test file > 200 lines    → Split by feature               │
│ • Source file > 300 lines  → Extract module                 │
│ • Duplicate code 3+ times  → Extract utility/helper         │
│ • Same test setup repeated → Extract to fixtures            │
│ • Imports > 15 lines       → Consolidate, barrel exports    │
└─────────────────────────────────────────────────────────────┘
```

**Refactoring actions in auto mode:**
```bash
# After completing task batch, review and refactor:
1. Check test organization → Group by feature
2. Extract shared fixtures → tests/fixtures/
3. Extract utilities → src/utils/ or src/lib/
4. Update imports → Use barrel exports (index.ts)
5. Run tests again → Ensure refactoring didn't break anything
```

### Quality Gate Before Continue

Before moving to next task, verify:

1. ✅ Current task marked complete in tasks.md
2. ✅ Corresponding ACs checked in spec.md
3. ✅ Unit tests pass
4. ✅ E2E tests pass (if UI task)
5. ✅ No deployment errors (if applicable)
6. ✅ Self-assessment score ≥ 0.70
7. ✅ Refactoring done if triggers met

### 📊 Test Status Reporting (MANDATORY)

**After EVERY task in auto mode, output test status report:**

```markdown
## 🧪 Test Status Report (after T-003)

| Type | Status | Pass/Total | Coverage |
|------|--------|------------|----------|
| Unit | ✅ | 42/42 | 87% |
| Integration | ✅ | 12/12 | - |
| E2E | ⚠️ | 8/10 | - |

**Failing tests:**
- `auth.spec.ts:45` - Login redirect not working (fixing now)

**Overall:** 62/64 tests passing (97%)
```

**This report MUST be shown to user after every task completion in auto mode!**

### 🏠 Local-First Development

**If no deployment instructions provided:**

1. **Build locally first** - implement all features
2. **Run ALL tests** - unit, integration, E2E
3. **Verify everything works** - manual smoke test if needed
4. **THEN ask user** - "Where do you want to deploy?"

**Don't assume deployment target!** Present options:
```markdown
🚀 **Ready for Deployment**

All tests pass locally. Where should I deploy?
- Vercel Cron (serverless)
- Railway (always-on)
- GitHub Actions (CI-based)
- Local cron
```

### 🔧 Infrastructure Decision-Making

**For scrapers, cron jobs, integrations - ULTRATHINK first:**

| Component | Options (by frequency/scale) |
|-----------|------------------------------|
| **Cron < 1/hr** | Vercel Cron, GitHub Actions, Cloudflare Workers |
| **Cron ≥ 1/hr** | Railway, Render, dedicated server |
| **Heavy compute** | Dedicated VM, Docker, Kubernetes |
| **Real-time** | Always-on server, WebSocket |
| **Simple KV** | Upstash Redis, Vercel KV |
| **Relational DB** | Supabase, PlanetScale, Neon |
| **File storage** | Cloudflare R2, S3, Backblaze B2 |

**When implementing scrapers/cron jobs:**
1. **Ultrathink** on best hosting given requirements
2. **Research** rate limits, costs, reliability
3. **Propose** 2-3 options with trade-offs
4. **Build locally first** with comprehensive tests
5. **Deploy** only after user confirms target

---

## Execution

**CRITICAL: You MUST execute the setup script FIRST before any other action!**

When this command is invoked:

### Step 1: MANDATORY - Run setup-auto.sh (DO THIS FIRST!)

**Execute this IMMEDIATELY when /sw:auto is invoked:**

```bash
bash plugins/specweave/scripts/setup-auto.sh [args]
```

Pass any arguments from the user (increment IDs, --max-iterations, --simple, etc.)

**Handle exit codes:**
- `0`: Success, session created → proceed to Step 3
- `1`: Error (no increments found with --no-increment/--no-inc) → STOP
- `2`: **Increment creation needed** → proceed to Step 2

### Step 2: INTELLIGENT INCREMENT CREATION (if setup-auto.sh exits with code 2)

**When setup script signals increment creation needed:**

1. **Check marker file:**
   ```bash
   cat .specweave/state/auto-needs-increment.json
   ```

2. **Analyze context** (ULTRATHINK):
   - Read recent conversation history
   - Check user prompt for feature descriptions
   - Scan `.specweave/increments/` for planned/backlog items
   - Look for patterns: "build X", "implement Y", "add Z feature"

3. **Make intelligent decision:**

   **A. Match existing increment:**
   ```bash
   # User said: "work on the login feature"
   # Found: .specweave/increments/0002-user-login-system (status: planned)
   # Action: Activate it and run setup-auto.sh again with 0002
   /sw:resume 0002
   bash plugins/specweave/scripts/setup-auto.sh 0002 [other-args]
   ```

   **B. Extend existing increment:**
   ```bash
   # User said: "add password reset to auth"
   # Found: .specweave/increments/0001-authentication (status: active, incomplete)
   # Action: Add tasks to existing increment, use it for auto mode
   # Edit tasks.md to add new tasks
   bash plugins/specweave/scripts/setup-auto.sh 0001 [other-args]
   ```

   **C. Create new increment(s):**
   ```bash
   # User said: "build a payment integration with Stripe"
   # No matching increments found
   # Action: Create new increment via /sw:increment
   /sw:increment "Payment integration with Stripe - support card payments, webhooks, and subscription management"
   # Then run setup-auto.sh with the new increment ID
   bash plugins/specweave/scripts/setup-auto.sh 0003-payment-integration [other-args]
   ```

   **D. Multiple increments:**
   ```bash
   # User said: "finish all pending features"
   # Found: multiple backlog/planned increments
   # Action: Create queue
   bash plugins/specweave/scripts/setup-auto.sh 0002-dashboard 0003-reports 0004-export [other-args]
   ```

   **E. Ask user (if ambiguous):**
   ```markdown
   🤔 I found several potential matches for your request:

   1. **0002-user-authentication** (planned) - Add auth system
   2. **0005-oauth-integration** (backlog) - Third-party auth

   Which would you like to work on?
   - Both (in sequence)
   - Just authentication
   - Just OAuth
   - Something else (please describe)
   ```

4. **Clean up marker:**
   ```bash
   rm -f .specweave/state/auto-needs-increment.json
   ```

5. **Proceed to Step 3** with increment(s) resolved

### Step 3: Verify session and start execution

**Verify session was created:**

```bash
cat .specweave/state/auto-session.json | jq -r '.sessionId'
```

**If file doesn't exist, the setup failed - investigate and fix before continuing.**

**Start execution:
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
