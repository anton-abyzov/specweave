---
name: auto
description: Start autonomous execution with stop hook feedback loop. Works until all tasks complete or max iterations reached. Use when you want continuous unattended execution.
argument-hint: "[INCREMENT_IDS...] [OPTIONS]"
allowed-tools: ["Bash(specweave auto *)"]
---

# Auto Command

**Start autonomous execution session using Claude Code's Stop Hook.**

## How to Use

When user says "auto" or "autonomous" or "keep working" or provides a task description, you should:

1. **Understand the user's intent**: What do they want to work on?
2. **Find or create the increment**: Check for active increments, or create new ones if needed
3. **Execute the command**:
   ```bash
   specweave auto [INCREMENT_IDS] [OPTIONS]
   ```
4. **⚠️ MANDATORY: Display stop conditions banner** - Users MUST see when auto mode will stop BEFORE work begins! See "Step 1.5" in Execution section.
5. **Start working**: Execute /sw:do on tasks, mark them complete, let framework hooks handle sync

Now work on the increment tasks. When you try to exit, the stop hook will check completion conditions and feed the next task back to you. Continue until all tasks are complete and quality gates pass.

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
| `--max-iterations N` | Maximum iterations (safety net, not primary stop) | **2500** |
| `--max-hours N` | Maximum hours to run | **600 hours** (25 days) |
| `--simple` | Simple mode (minimal context) | false |
| `--dry-run` | Preview without starting | false |
| `--all-backlog` | Process all backlog items | false |
| `--skip-gates G1,G2` | Pre-approve specific gates | None |
| `--no-increment`, `--no-inc` | Skip auto-creation (require existing increments) | false |
| `--prompt "text"` | Analyze prompt and create increments (intelligent chunking) | None |
| `--yes`, `-y` | Auto-approve increment plan (skip user approval) | false |
| `--tdd`, `--strict` | Enable TDD strict mode - ALL tests must pass | false |
| **`--build`** | Build must pass before completion (auto-heal: 3 retries) | false |
| **`--tests`** | Tests must pass before completion (unit + integration) | false |
| **`--e2e`** | E2E tests must pass before completion | false |
| **`--lint`** | Linting must pass before completion (auto-heal: 3 retries) | false |
| **`--types`** | Type-checking must pass before completion (auto-heal: 3 retries) | false |
| **`--cov <n>`** | Code coverage must meet threshold (%) | 80 |
| **`--e2e-cov <n>`** | E2E coverage must meet threshold (%) | 70 |
| **`--cmd "<command>"`** | Custom command must pass before completion | None |

:::warning Iteration limits are SAFETY NETS
The primary completion criteria is **tests passing + tasks complete**. Iteration limits (2500 iterations, 600 hours) are backup safety nets. Completion should be detected through **external verification** (test results), not self-assessment.

**IMPORTANT: Stop hook runs PER AGENT** - Each spawned subagent gets its own hook invocation. Iteration count is shared via session file, reflecting main agent loops.
:::

## Completion Conditions

**Auto mode will NOT stop until ALL specified conditions pass.**

### What Are Completion Conditions?

Completion conditions are **quality gates** that prevent auto mode from completing until specific checks pass:

- **`--build`**: Build must succeed (auto-heal enabled, max 3 retries)
- **`--tests`**: All tests must pass (unit + integration tests)
- **`--e2e`**: E2E tests must pass (Playwright, Cypress, etc.)
- **`--lint`**: Linting must pass (ESLint, Black, Clippy, etc.)
- **`--types`**: Type-checking must pass (TypeScript, mypy, etc.)
- **`--cov N`**: Code coverage must meet threshold (e.g., `--cov 80` = 80% minimum)
- **`--e2e-cov N`**: E2E coverage must meet threshold
- **`--cmd "..."`**: Custom command must pass (e.g., `--cmd "make verify"`)

### Auto-Heal vs Manual Fix

| Condition | Auto-Heal? | Behavior |
|-----------|-----------|----------|
| `--build` | ✅ Yes (3 retries) | Build failures auto-fixed by LLM |
| `--lint` | ✅ Yes (3 retries) | Lint errors auto-fixed by LLM |
| `--types` | ✅ Yes (3 retries) | Type errors auto-fixed by LLM |
| `--tests` | ❌ No | Tests must be fixed manually by LLM |
| `--e2e` | ❌ No | E2E tests must be fixed manually |
| `--cov` | ❌ No | Must write more tests to meet threshold |
| `--cmd` | ❌ No | Custom commands run as-is |

**Auto-heal** means the hook will:
1. Run the command
2. If it fails, ask LLM to fix the issue
3. Retry up to 3 times
4. Block completion if still failing after 3 attempts

**Manual fix** means:
1. Run the command
2. If it fails, BLOCK immediately
3. LLM must fix the issue manually
4. Re-run to validate

### Framework Auto-Detection

Commands are auto-detected based on your project structure:

**TypeScript/Node:**
```bash
# Detected from package.json, jest.config.js, vitest.config.ts
build: npm run build
tests: npm test OR npx vitest run
e2e: npx playwright test OR npx cypress run
lint: npm run lint OR npx eslint .
types: npx tsc --noEmit
```

**Python:**
```bash
# Detected from requirements.txt, pyproject.toml, pytest.ini
build: python -m build
tests: pytest
e2e: (none)
lint: black --check . OR flake8
types: mypy .
```

**Go:**
```bash
# Detected from go.mod
build: go build ./...
tests: go test ./...
lint: golangci-lint run
```

**Rust:**
```bash
# Detected from Cargo.toml
build: cargo build
tests: cargo test
lint: cargo clippy
```

### Example Usage

**Basic - Build + Tests:**
```bash
/sw:auto --build --tests
# → Auto mode will NOT stop until build passes AND all tests pass
```

**Strict Quality:**
```bash
/sw:auto --build --tests --e2e --lint --types --cov 80
# → ALL conditions must pass:
#   ✅ Build succeeds
#   ✅ Tests pass
#   ✅ E2E tests pass
#   ✅ Lint passes
#   ✅ Type-check passes
#   ✅ Coverage ≥80%
```

**Custom Command:**
```bash
/sw:auto --cmd "make verify"
# → Auto mode will run `make verify` before completion
```

**Combined with Other Flags:**
```bash
/sw:auto --prompt "Build auth system" --yes --build --tests --cov 85
# → Intelligent chunking + auto-approve + quality gates
```

### Session Output

When you start auto mode with completion conditions, you'll see:

```
🚀 Auto Session Started

Session ID: auto-2026-01-04-abc123
Max Iterations: 2500
Max Hours: 600
Simple Mode: false

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  COMPLETION CONDITIONS
   Auto mode will NOT stop until ALL conditions pass:

   • 🔨 Build must pass (auto-heal enabled, max 3 retries)
   • ✅ Tests must pass (unit + integration)
   • 🎭 E2E tests must pass
   • 📊 Code coverage must be ≥80%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Increment Queue (1):
  • 0001-auth-system

Current: 0001-auth-system

The session will continue until:
  • All tasks complete AND tests pass
  • ALL 4 completion conditions pass
  • Max iterations (2500) reached
  • Max hours (600) exceeded
  • You run specweave cancel-auto
  • A human gate requires approval
```

### Stop Hook Validation

The stop hook (`stop-auto.sh`) validates completion conditions:

1. **Before allowing completion**, the hook runs:
   ```bash
   plugins/specweave/hooks/validate-completion-conditions.sh
   ```

2. **For each condition**:
   - Auto-detects the framework-specific command
   - Runs the command
   - Parses the output
   - If auto-heal enabled, retries on failure (max 3x)
   - BLOCKS completion if ANY condition fails

3. **Only when ALL conditions pass**:
   - Hook approves completion
   - Auto mode stops successfully
   - Celebration sound plays 🎉

### Per-Increment Override

You can override completion conditions per increment in `metadata.json`:

```json
{
  "increment": "0001-auth-system",
  "autoCompletion": {
    "conditions": [
      { "type": "build" },
      { "type": "tests" },
      { "type": "coverage", "threshold": 90 }
    ],
    "override": true
  }
}
```

When `override: true`, the increment-specific conditions replace the session-level conditions.

### Troubleshooting

**Issue**: "Build command not detected"
- **Fix**: Add `scripts.build` to `package.json` OR use `--cmd "your-build-cmd"`

**Issue**: "Tests pass but coverage below threshold"
- **Fix**: Write more tests to cover untested code paths

**Issue**: "Auto-heal keeps retrying but failing"
- **Fix**: After 3 retries, the hook will BLOCK. Fix the issue manually, then resume.

**Issue**: "E2E tests not detected"
- **Fix**: Ensure `playwright.config.ts` or `cypress.config.js` exists

### Best Practices

1. **Start Simple**: Use `--build --tests` for basic quality gates
2. **Add Coverage Gradually**: Start with `--cov 70`, increase to 80-90 over time
3. **Use Auto-Heal**: Let build/lint/types auto-fix (saves manual work)
4. **Don't Skip E2E**: Use `--e2e` for user-facing features
5. **Custom Commands**: Use `--cmd` for project-specific checks (e.g., security scans)

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

## Prompt-Based Chunking (--prompt)

**Use `--prompt` to provide a feature description for intelligent chunking:**

```bash
# Analyze prompt and show increment plan for approval
/sw:auto --prompt "Build e-commerce with auth, products, cart, checkout"

# Auto-approve plan and start execution
/sw:auto --prompt "Build e-commerce with auth, products, cart, checkout" --yes
```

### What Happens

1. **Prompt Analysis**: The chunker extracts discrete features from your description
2. **Plan Generation**: Features are grouped into right-sized increments (5-15 tasks each)
3. **Dependency Detection**: Auth before checkout, database before API, etc.
4. **User Approval**: Plan shown for review (unless `--yes` flag used)
5. **Increment Creation**: Increments created via `/sw:increment`
6. **Session Start**: Auto mode begins with the increment queue

### Example Output

```
📋 Increment Plan
══════════════════════════════════════════════════

Total Features: 4
Total Tasks: ~34
Estimated Duration: 1-2 days
Increments: 3

Increments:
--------------------------------------------------
  1. User Authentication
     ID: 0001-user-authentication
     Tasks: ~12
     Features: auth
     Depends on: (none)

  2. Product Catalog
     ID: 0002-product-catalog
     Tasks: ~10
     Features: products

  3. Shopping Cart & Checkout
     ID: 0003-shopping-cart-checkout
     Tasks: ~12
     Features: cart, checkout
     Depends on: 0001-user-authentication, 0002-product-catalog

💡 Review the plan above.

Options:
  1. Approve - Start execution with this plan
  2. Modify  - Adjust increment structure
  3. Cancel  - Abort and return to prompt

To skip this prompt in future: use --yes flag
```

### Plan Approval Flow

```
/sw:auto --prompt "..."
     │
     ▼
Analyze & Show Plan
     │
     ├─ --yes flag? ──YES──> Auto-approve
     │       │
     │       ▼
     │    Create Increments → Start Session
     │
     └─ No --yes flag
            │
            ▼
       Wait for User
            │
            ├─ Approve → Create Increments → Start Session
            ├─ Modify  → LLM adjusts plan → Re-show
            └─ Cancel  → Exit
```

## How It Works

```
1. User runs /sw:auto (with or without IDs)
           │
           ▼
2. specweave auto command creates session state
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
2. **Completion promise** - Output contains `<!-- auto-complete:DONE -->`
3. **Max iterations** - Reached configured limit (default: 500)
4. **Max hours** - Time limit exceeded (default: 120 hours / 5 days)
5. **User cancellation** - `/sw:cancel-auto`
6. **Human gate timeout** - Gate pending too long

**⚠️ IMPORTANT**: Auto mode will NOT complete just because tasks are marked done. If test files exist in the project, the stop hook ENFORCES test execution. You'll see messages like:
- "🧪 MANDATORY: All tasks marked complete but NO TEST EXECUTION detected"
- "🎭 MANDATORY: E2E tests exist but were NOT executed"

## Simple Mode (--simple)

Pure stop hook loop behavior:
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
- **Max Iterations**: Prevents runaway loops (2500 default)
- **Max Hours**: Time boxing (600 hours / 25 days default)
- **stop_hook_active**: Prevents infinite continuation loops
- **Sound Notifications**: Audible alerts when Claude stops working

## Sound Notifications

**Auto mode plays a satisfying sound when work completes successfully!**

### When Sound Plays

| Event | Sound | Platforms | Meaning |
|-------|-------|-----------|---------|
| **Session Complete (Success)** ✅ | Glass.aiff (macOS)<br>complete.oga (Linux)<br>Windows Notify (Windows) | All | All tasks done, tests passing - work finished! |

**Sound plays ONLY on complete success** - when all tasks are done AND all tests pass. This way you know when to check back without being interrupted during ongoing work.

### Cross-Platform Support

The sound notification works automatically on:
- **macOS**: Glass.aiff (satisfying chime)
- **Linux**: PulseAudio/ALSA/speaker-test fallbacks
- **Windows**: PowerShell beeps

Sounds fail gracefully on systems without audio support.

## 🔧 v2.3 Per-Agent Stop Hook Behavior (NEW!)

**CRITICAL: The stop hook runs PER AGENT, not globally!**

### How It Works

```
Main Agent (Claude Code)
    │
    ├── Stop hook invoked when main agent tries to exit
    │
    ├── Spawns Subagent A (Task tool)
    │   └── Subagent A completes → returns to main agent
    │       (NO stop hook for subagent exit by default)
    │
    ├── Spawns Subagent B (Task tool with stop_hooks enabled)
    │   └── Stop hook CAN be invoked if configured
    │
    └── Main agent tries to exit → Stop hook invoked
```

### Key Implications

1. **Iteration count = main agent loops**: When you see "Iteration 42/2500", that's 42 times the MAIN agent tried to exit, not subagent work.

2. **Subagent work is "free"**: Spawning specialized agents (QA, Security, etc.) doesn't consume iterations from the main loop.

3. **Shared session state**: All agents (main + sub) share the same `auto-session.json`, so task completion is tracked globally.

4. **Test validation at main level**: The stop hook validates test results when the MAIN agent tries to complete, ensuring all subagent work is verified.

### Configuration

To enable stop hooks for subagents (advanced):
```typescript
// In Task tool call
{
  "stop_hooks": true,  // Enable stop hook for this subagent
  "inherit_session": true  // Share session state with parent
}
```

### Best Practices

- Let subagents do specialized work without worrying about iterations
- Main agent orchestrates and validates via stop hook
- Use `--max-iterations` as a safety net, not a target
- Primary completion = tests pass + tasks complete

## 🔧 v2.1 Reliability Improvements

Auto mode includes reliability features for long-running sessions:

| Feature | Description |
|---------|-------------|
| **Context Management** | Triggers compaction at ~150k tokens, saves checkpoints |
| **Heartbeat/Watchdog** | Detects stale sessions (>5 min no activity) |
| **Failure Classification** | Transient (retry), Fixable (AI fix), External (pause) |
| **Checkpoints** | Task-level recovery from crashes |
| **Command Timeouts** | 10 min test, 5 min build (configurable) |

**Configuration** (`config.json`):
```json
{
  "auto": {
    "contextThreshold": 150000,
    "timeouts": { "test": 600, "build": 300 }
  }
}
```

**Logs**: `.specweave/logs/auto-iterations.log`

## 🔧 v2.2 TDD Strict Mode & Stop Reason Tracking

### TDD Strict Mode

**Enable TDD strict mode for RED→GREEN→REFACTOR discipline:**

```bash
/sw:auto --tdd 0001-feature   # or --strict
```

**TDD configuration priority** (highest to lowest):
1. Command flag (`--tdd`, `--strict`)
2. Increment `metadata.json` (`"tddMode": true`)
3. spec.md frontmatter (`tdd: true`)
4. Global `config.json` (`testing.defaultTestMode: "TDD"`)

**For full TDD workflow details, see:** `sw:tdd-orchestrator` skill

### Test Framework Auto-Detection

Auto mode discovers and runs test commands automatically:

| Framework | Detection |
|-----------|-----------|
| npm/Vitest/Jest | `package.json`, config files |
| Playwright/Cypress | Config files, `/e2e` dirs |
| Pytest/Go/Cargo | `go.mod`, `Cargo.toml`, `pytest.ini` |
| Xcode/Swift | `.xcodeproj`, `Package.swift` |

### Stop Reason Tracking

Stop reasons logged to `.specweave/logs/auto-stop-reasons.log`:

| Category | Success | Description |
|----------|---------|-------------|
| `all_tasks_complete` | ✅ | All tests pass, all tasks done |
| `completion_promise` | ✅ | `<!-- auto-complete:DONE -->` |
| `max_iterations_reached` | ❌ | Safety limit hit |
| `test_failures_exhausted` | ❌ | 3 retry attempts failed |
| `human_gate_pending` | ⏸️ | Waiting for approval |

## ♿ UI/UX Quality Gates (NEW!)

Auto mode now includes comprehensive UI/UX quality gates that run automatically when E2E tests are detected.

### Accessibility Audit

When `@axe-core/playwright` or similar accessibility testing tools are detected, auto mode:
- Parses accessibility audit results from test output
- **Blocks** on critical and serious violations (WCAG Level A/AA)
- **Warns** on moderate and minor violations
- Shows detailed violation report with fix suggestions

**Violation Severity Handling:**

| Severity | Action | Example |
|----------|--------|---------|
| Critical | **BLOCKS** completion | Missing alt text, form without labels |
| Serious | **BLOCKS** completion | Color contrast, missing document lang |
| Moderate | Warning only | Landmark regions |
| Minor | Warning only | Empty headings |

**Enable in your tests:**
```typescript
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('page is accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Console Error Detection

Auto mode parses E2E test output for console errors:
- **Blocks** on uncaught exceptions
- **Blocks** on `console.error` from application code
- **Excludes** expected dev tool messages (React DevTools, HMR, etc.)

**Automatic exclusions:**
- React/Apollo DevTools prompts
- HMR messages
- Vite dev server messages
- Favicon loading failures

**Add custom exclusions in config:**
```json
{
  "auto": {
    "consoleErrors": {
      "excludePatterns": ["Expected test error"]
    }
  }
}
```

### UI State Coverage

Auto mode detects and reports on UI state test coverage:

| State | Detection | Recommendation |
|-------|-----------|----------------|
| Loading | Spinners, skeletons, `aria-busy` | Test loading/skeleton states |
| Error | Error boundaries, 404/500 pages | Test error handling |
| Empty | No data, no results | Test empty state displays |

Shows ⚠️ warning if states are detected but not explicitly tested.

## 🔄 Increment Queue Transition (NEW!)

Auto mode now handles multi-increment queues with smooth transitions.

### Completion Summary

When an increment completes, auto mode shows:
```
✅ INCREMENT COMPLETE: 0001-user-auth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 Tasks: 15/15 | Duration: 45m
  🧪 Tests: 42 passed, 0 failed
  ✅ Status: All acceptance criteria met

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT INCREMENT: 0002-notifications
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Queue: 2 increment(s) remaining
```

### Skip Failed Increments

If an increment fails after 3 retry attempts, you can skip it:

```bash
/sw:skip-increment
```

This will:
1. Mark the increment as "skipped" (not failed, not completed)
2. Log failure details for later review
3. Move to the next increment in queue
4. Continue auto mode execution

**Use when:**
- A blocking issue requires external resolution
- You want to prioritize other work
- The issue needs human investigation

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

## 🎯 Self-Assessment & Quality Gates

**Auto mode self-assesses each task and enforces quality gates:**

### Confidence Thresholds

| Score | Action |
|-------|--------|
| ≥ 0.90 | ✅ Continue confidently |
| 0.70-0.89 | ⚠️ Continue with caution |
| 0.50-0.69 | 🟡 Pause for self-review |
| < 0.50 | 🔴 Stop for human review |

### Quality Gates (verify before continuing)

1. ✅ Task marked complete in tasks.md + ACs in spec.md
2. ✅ All tests pass (3 retry attempts on failure)
3. ✅ E2E tests pass (if UI task)
4. ✅ Self-assessment score ≥ 0.70

### Test Status Reporting (MANDATORY)

After EVERY task, output test status:
```markdown
## 🧪 Test Status (T-003)
| Type | Status | Pass/Total |
|------|--------|------------|
| Unit | ✅ | 42/42 |
| E2E | ⚠️ | 8/10 |
```

### Local-First Development

Build and test locally first. Don't assume deployment target - ask user when ready

---

## Execution

**CRITICAL: You MUST show STOP CONDITIONS to user BEFORE starting work!**

When this command is invoked:

### Step 1: MANDATORY - Run specweave auto (DO THIS FIRST!)

**Execute this IMMEDIATELY when /sw:auto is invoked:**

```bash
specweave auto [INCREMENT_IDS...] [OPTIONS]
```

**IMPORTANT**: The command is executed via the globally-installed `specweave` CLI, NOT bash scripts. This ensures cross-platform compatibility (Windows, macOS, Linux).

Pass any arguments from the user (increment IDs, completion conditions, --max-iterations, --simple, etc.)

**Handle exit codes:**
- `0`: Success, session created → proceed to Step 1.5
- `1`: Error (no increments found with --no-increment/--no-inc) → STOP
- `2`: **Increment creation needed** → proceed to Step 2

### Step 1.5: MANDATORY - Analyze Tests & Display Stop Conditions

**⚠️ CRITICAL: You MUST analyze the test situation and output SPECIFIC stop conditions BEFORE starting any task work!**

#### Step 1.5a: Detect Existing Tests

Run these commands to detect what tests exist:

```bash
# Check for test frameworks
ls package.json 2>/dev/null && cat package.json | grep -E '"(jest|vitest|mocha|playwright|cypress)"' || true
ls vitest.config.* jest.config.* playwright.config.* cypress.config.* 2>/dev/null || true

# Count existing test files
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.test.js" 2>/dev/null | wc -l
find . -name "*.e2e.ts" -o -name "*.e2e-spec.ts" -path "*/e2e/*" -name "*.spec.ts" 2>/dev/null | wc -l

# Check if tests can run
npm test --help 2>/dev/null | head -1 || true
```

#### Step 1.5b: Determine Test Strategy

Based on what you find, determine:

**IF tests exist:**
- List the EXACT test commands that will be run
- List the SPECIFIC test files that will validate this work

**IF tests DON'T exist yet:**
- You MUST plan what tests need to be created as part of the tasks
- List the specific test files you will CREATE during auto mode
- These tests become part of the stop criteria

#### Step 1.5c: Output the Stop Conditions Banner

**Output this banner with SPECIFIC test information:**

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  🚀 AUTO MODE STARTING                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Increment: [INCREMENT_ID]                                                    ║
║  Tasks: [X] pending                                                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  🧪 TESTS THAT MUST PASS FOR COMPLETION:                                      ║
║                                                                               ║
║  Unit/Integration Tests:                                                      ║
║    Command: [EXACT_TEST_COMMAND]                                              ║
║    Files:                                                                     ║
║      • [test-file-1.test.ts] - [what it tests]                               ║
║      • [test-file-2.test.ts] - [what it tests]                               ║
║      • [NEW] [test-file-3.test.ts] - [will be created for X]                 ║
║                                                                               ║
║  E2E Tests (if applicable):                                                   ║
║    Command: [EXACT_E2E_COMMAND]                                               ║
║    Files:                                                                     ║
║      • [auth.e2e.ts] - [login/logout flows]                                  ║
║      • [NEW] [checkout.e2e.ts] - [will be created for payment flow]          ║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  🎯 SESSION WILL COMPLETE WHEN:                                               ║
║    ✅ All [X] tasks marked complete                                           ║
║    ✅ [TEST_COMMAND] passes (0 failures)                                      ║
║    ✅ [E2E_COMMAND] passes (if E2E tests exist)                               ║
║    ✅ /sw:done validation passes                                              ║
║                                                                               ║
║  🛑 SESSION WILL PAUSE/STOP IF:                                               ║
║    • Tests fail 3 times in a row → pauses for human review                   ║
║    • User runs /sw:cancel-auto                                                ║
║    • Max iterations reached (safety limit)                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  💡 Check progress: /sw:auto-status                                           ║
║  💡 Cancel: close session or /sw:cancel-auto                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

#### Step 1.5d: Fill in ALL placeholders with REAL values

**Required placeholders:**
- `[INCREMENT_ID]`: Actual increment ID (e.g., `0001-user-auth`)
- `[X]`: Number of pending tasks from tasks.md
- `[EXACT_TEST_COMMAND]`: Real command like `npm test` or `npx vitest run`
- `[EXACT_E2E_COMMAND]`: Real command like `npx playwright test`
- `[test-file-*.ts]`: Real test file names with brief description
- `[NEW]`: Mark any test files that will be CREATED during auto mode

**Examples of GOOD vs BAD:**

❌ **BAD (vague):**
```
Tests: All tests passing (unit + E2E if present)
```

✅ **GOOD (specific):**
```
Unit Tests:
  Command: npm test
  Files:
    • src/auth/auth.service.test.ts - JWT token generation
    • src/auth/login.test.ts - login validation
    • [NEW] src/auth/logout.test.ts - will create for logout flow

E2E Tests:
  Command: npx playwright test
  Files:
    • tests/auth.e2e.ts - full login/logout user journey
```

**DO NOT SKIP THIS STEP!** Users MUST see the EXACT tests that will determine success.

### Step 1.6: TDD Enforcement Check (when TDD mode enabled)

**If TDD mode is detected (`--tdd` flag, config, or increment metadata), enforce TDD discipline!**

#### Step 1.6a: TDD Marker Validation (CRITICAL!)

**BEFORE checking TDD order, validate that tasks.md HAS TDD markers:**

```bash
INCREMENT_PATH=".specweave/increments/<id>"
TASKS_FILE="$INCREMENT_PATH/tasks.md"

# Count TDD markers
RED_COUNT=$(grep -c '\[RED\]' "$TASKS_FILE" 2>/dev/null || echo "0")
GREEN_COUNT=$(grep -c '\[GREEN\]' "$TASKS_FILE" 2>/dev/null || echo "0")
REFACTOR_COUNT=$(grep -c '\[REFACTOR\]' "$TASKS_FILE" 2>/dev/null || echo "0")
TOTAL_MARKERS=$((RED_COUNT + GREEN_COUNT + REFACTOR_COUNT))

echo "TDD Marker Check: RED=$RED_COUNT, GREEN=$GREEN_COUNT, REFACTOR=$REFACTOR_COUNT"
```

**If TDD_MODE == true BUT TOTAL_MARKERS == 0:**

```
⚠️  TDD MODE ENABLED BUT NO TDD MARKERS IN TASKS

Your configuration has TDD mode enabled:
  • --tdd flag: [yes/no]
  • config.json: testing.defaultTestMode = "TDD"
  • Enforcement level: [strict/warn/off]

But tasks.md contains NO [RED], [GREEN], [REFACTOR] markers:
  • [RED] markers found: 0
  • [GREEN] markers found: 0
  • [REFACTOR] markers found: 0

⚠️  TDD ORDER ENFORCEMENT WILL BE BYPASSED!

The enforcement checks for task markers to validate RED→GREEN→REFACTOR order.
Without markers, tasks can be completed in ANY order - defeating TDD discipline.

CAUSE: Tasks were likely created:
  • Manually (without using /sw:increment)
  • Before TDD mode was enabled in config
  • By copying from a non-TDD template

💡 FIX OPTIONS:

1. (Recommended) Regenerate tasks with TDD structure:
   /sw:increment "your-feature"
   This will create proper RED→GREEN→REFACTOR triplets

2. Add markers manually to existing tasks:
   ### T-001: [RED] Write failing test for feature
   ### T-002: [GREEN] Implement feature to pass test
   ### T-003: [REFACTOR] Clean up feature code

3. Disable TDD mode if not needed:
   Set testing.defaultTestMode: "test-after" in config.json

4. Continue without TDD enforcement (not recommended):
   Set testing.tddEnforcement: "off" in config.json
```

**Behavior based on tddEnforcement:**

| Enforcement | TDD Enabled + No Markers | Action |
|-------------|--------------------------|--------|
| `strict` | **BLOCKS** | ❌ Cannot proceed - fix tasks.md first |
| `warn` | **WARNS** | ⚠️ Shows warning, continues without enforcement |
| `off` | **Silent** | Skips all TDD checks |

**Example (strict mode, no markers):**
```
❌ TDD MARKER VALIDATION FAILED (strict mode)

Cannot start auto mode with TDD enabled but no task markers.
Run /sw:increment to regenerate tasks with TDD structure.

Or set tddEnforcement: "warn" to continue anyway.
```

#### Step 1.6b: TDD Mode Detection

```bash
# Check TDD mode from multiple sources (priority order)
TDD_MODE=false
TDD_ENFORCEMENT="warn"  # Default

# 1. Check command-line flag (highest priority)
if [[ "$*" == *"--tdd"* ]] || [[ "$*" == *"--strict"* ]]; then
  TDD_MODE=true
  TDD_ENFORCEMENT="strict"
fi

# 2. Check increment metadata
if [[ -f "$INCREMENT_PATH/metadata.json" ]]; then
  INC_TDD=$(jq -r '.tddMode // .testMode' "$INCREMENT_PATH/metadata.json" 2>/dev/null)
  [[ "$INC_TDD" == "true" || "$INC_TDD" == "TDD" || "$INC_TDD" == "tdd" ]] && TDD_MODE=true
fi

# 3. Check global config
if [[ -f ".specweave/config.json" ]]; then
  GLOBAL_TDD=$(jq -r '.testing.defaultTestMode' ".specweave/config.json" 2>/dev/null)
  [[ "$GLOBAL_TDD" == "TDD" || "$GLOBAL_TDD" == "tdd" ]] && TDD_MODE=true
  # Check enforcement level
  TDD_ENFORCEMENT=$(jq -r '.testing.tddEnforcement // "warn"' ".specweave/config.json" 2>/dev/null)
fi
```

**If TDD_MODE == true, add TDD enforcement to stop conditions banner:**

```
╠══════════════════════════════════════════════════════════════════════════════╣
║  🔴 TDD MODE ACTIVE - RED→GREEN→REFACTOR ENFORCEMENT                         ║
║                                                                               ║
║  TDD Task Order Enforcement:                                                  ║
║    Enforcement Level: [strict|warn|off]                                       ║
║                                                                               ║
║    [RED] tasks can be completed freely                                        ║
║    [GREEN] tasks REQUIRE their [RED] counterpart completed first              ║
║    [REFACTOR] tasks REQUIRE their [GREEN] counterpart completed first         ║
║                                                                               ║
║  ⚠️  strict mode: BLOCKS completion of out-of-order tasks                     ║
║  ⚠️  warn mode: Shows warning but allows (not recommended)                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
```

**TDD Enforcement during task execution:**

```typescript
// Before marking ANY [GREEN] or [REFACTOR] task complete:
function enforceTDDOrder(task: Task, allTasks: Task[], enforcement: string): void {
  const phase = extractPhase(task.title); // [RED], [GREEN], [REFACTOR]
  if (!phase || phase === 'RED') return; // RED can always proceed

  const tripletBase = Math.floor((task.number - 1) / 3) * 3 + 1;

  if (phase === 'GREEN') {
    const redTask = allTasks.find(t => t.number === tripletBase && t.title.includes('[RED]'));
    if (redTask && redTask.status !== 'completed') {
      const msg = `TDD VIOLATION: Cannot complete ${task.id} [GREEN] before ${redTask.id} [RED]`;
      if (enforcement === 'strict') {
        throw new Error(msg); // BLOCKS completion
      } else {
        console.warn(`⚠️ ${msg}`); // Warns but allows
      }
    }
  }

  if (phase === 'REFACTOR') {
    const greenTask = allTasks.find(t => t.number === tripletBase + 1 && t.title.includes('[GREEN]'));
    if (greenTask && greenTask.status !== 'completed') {
      const msg = `TDD VIOLATION: Cannot complete ${task.id} [REFACTOR] before ${greenTask.id} [GREEN]`;
      if (enforcement === 'strict') {
        throw new Error(msg); // BLOCKS completion
      } else {
        console.warn(`⚠️ ${msg}`); // Warns but allows
      }
    }
  }
}
```

**Best practice for TDD in auto mode:**
1. Enable `--tdd` flag for strict enforcement: `/sw:auto --tdd 0001`
2. Or set globally: `testing.defaultTestMode: "TDD"` + `testing.tddEnforcement: "strict"`
3. Tasks should be grouped in triplets: T-001 [RED], T-002 [GREEN], T-003 [REFACTOR]

### Step 2: INTELLIGENT INCREMENT CREATION (if specweave auto exits with code 2)

**When specweave auto signals increment creation needed:**

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
   # Action: Activate it and run specweave auto with 0002
   /sw:resume 0002
   specweave auto 0002 [other-args]
   ```

   **B. Extend existing increment:**
   ```bash
   # User said: "add password reset to auth"
   # Found: .specweave/increments/0001-authentication (status: active, incomplete)
   # Action: Add tasks to existing increment, use it for auto mode
   # Edit tasks.md to add new tasks
   specweave auto 0001 [other-args]
   ```

   **C. Create new increment(s):**
   ```bash
   # User said: "build a payment integration with Stripe"
   # No matching increments found
   # Action: Create new increment via /sw:increment
   /sw:increment "Payment integration with Stripe - support card payments, webhooks, and subscription management"
   # Then run specweave auto with the new increment ID
   specweave auto 0003-payment-integration [other-args]
   ```

   **D. Multiple increments:**
   ```bash
   # User said: "finish all pending features"
   # Found: multiple backlog/planned increments
   # Action: Create queue
   specweave auto 0002-dashboard 0003-reports 0004-export [other-args]
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

5. **Proceed to Step 1.5** - Display the stop conditions banner!

### Step 3: Start Task Execution

**After displaying the stop conditions banner (Step 1.5), begin work:**

1. **Execute /sw:do in a loop** (stop hook handles continuation):
   - Work on tasks
   - Mark complete in tasks.md
   - Update spec.md ACs
   - Sync to external tools
   - Run tests after each task

2. **On completion**:
   ```
   ✅ Auto Session Complete!
   <!-- auto-complete:DONE -->

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
| `/sw:skip-increment` | Skip failed increment and continue queue |
| `/sw:do` | Execute tasks (also works standalone) |
| `/sw:progress` | Show increment progress |

---

## 🔀 Parallel Execution Mode

**For parallel multi-agent execution, see: `/sw:auto-parallel`**

Parallel mode spawns specialized agents (Frontend, Backend, Database, DevOps, QA) that work simultaneously in isolated git worktrees.

```bash
/sw:auto --parallel --frontend --backend 0170-auth-feature
```
