---
name: sw:auto
description: Start autonomous execution session with stop hook integration. Works until all tasks complete or max iterations reached. Uses Ralph Wiggum pattern with SpecWeave workflow integration. Activates for: auto, autonomous, auto mode, ship while sleeping.
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
| `--max-iterations N` | Maximum iterations (safety net, not primary stop) | **2500** (v2.3) |
| `--max-hours N` | Maximum hours to run | **600 hours** (25 days, v2.3) |
| `--simple` | Pure Ralph mode (minimal context) | false |
| `--dry-run` | Preview without starting | false |
| `--all-backlog` | Process all backlog items | false |
| `--skip-gates G1,G2` | Pre-approve specific gates | None |
| `--no-increment`, `--no-inc` | Skip auto-creation (require existing increments) | false |
| `--prompt "text"` | Analyze prompt and create increments (intelligent chunking) | None |
| `--yes`, `-y` | Auto-approve increment plan (skip user approval) | false |
| `--tdd`, `--strict` | **NEW v2.2**: Enable TDD strict mode - ALL tests must pass | false |
| **`--build`** | **NEW v0.4.0**: Build must pass before completion (auto-heal: 3 retries) | false |
| **`--tests`** | **NEW v0.4.0**: Tests must pass before completion (unit + integration) | false |
| **`--e2e`** | **NEW v0.4.0**: E2E tests must pass before completion | false |
| **`--lint`** | **NEW v0.4.0**: Linting must pass before completion (auto-heal: 3 retries) | false |
| **`--types`** | **NEW v0.4.0**: Type-checking must pass before completion (auto-heal: 3 retries) | false |
| **`--cov <n>`** | **NEW v0.4.0**: Code coverage must meet threshold (%) | 80 |
| **`--e2e-cov <n>`** | **NEW v0.4.0**: E2E coverage must meet threshold (%) | 70 |
| **`--cmd "<command>"`** | **NEW v0.4.0**: Custom command must pass before completion | None |

:::warning v2.3 - Iteration limits are SAFETY NETS
The primary completion criteria is **tests passing + tasks complete**. Iteration limits (2500 iterations, 600 hours) are backup safety nets. Per the Ralph Wiggum pattern, completion should be detected through **external verification** (test results), not self-assessment.

**IMPORTANT: Stop hook runs PER AGENT** - Each spawned subagent gets its own hook invocation. Iteration count is shared via session file, reflecting main agent loops.
:::

## Completion Conditions (v0.4.0+)

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
- **Max Iterations**: Prevents runaway loops (2500 default)
- **Max Hours**: Time boxing (600 hours / 25 days default)
- **stop_hook_active**: Prevents infinite continuation loops
- **Sound Notifications** (v2.6): Audible alerts when Claude stops working

## 🔔 Sound Notifications (NEW in v2.6!)

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

## 🔧 v2.1 Reliability Improvements (NEW!)

Auto mode v2.1 includes critical improvements for reliable long-running sessions:

### Context Management

**Auto mode now monitors context size and triggers compaction when needed:**

- Estimates context size from transcript file (~4 chars/token)
- Triggers compaction warning at ~150k tokens (~600KB transcript)
- Saves checkpoint before compaction for safe state recovery
- Logs `context_near_limit` events to `auto-iterations.log`

**Configuration:**
```json
{
  "auto": {
    "contextThreshold": 150000  // tokens before compaction warning
  }
}
```

### Heartbeat & Watchdog Mechanism

**Detects and logs stale sessions (zombie detection):**

- Heartbeat file updated on every stop hook invocation
- Watchdog detects sessions with no heartbeat for >5 minutes
- Stale sessions logged with `stale_heartbeat_detected` event
- Heartbeat stored in `.specweave/state/heartbeat.json`

**Heartbeat format:**
```json
{
  "timestamp": "2026-01-02T08:00:00Z",
  "sessionId": "auto-2026-01-02-abc123",
  "pid": 12345,
  "iteration": 42
}
```

### Xcode/iOS Test Support

**Full support for Apple platform testing:**

| Framework | Detection Pattern |
|-----------|------------------|
| xcodebuild test | `Executed X tests, with Y failures` |
| Swift PM (swift test) | `Test Suite passed/failed` |
| Xcode build | `BUILD FAILED`, `xcodebuild: error:` |

**Features:**
- Parses passed/failed counts from Xcode output
- Distinguishes build failures from test failures
- Extracts failure details (file, line, message)
- Framework auto-detection from output patterns

### Generic Test Framework Detection

**Works with ANY test framework via exit codes and patterns:**

| Pattern Type | Examples |
|-------------|----------|
| Exit code | Non-zero = failure |
| Universal failure | `FAIL`, `ERROR`, `FAILED`, `failed` |
| Universal success | `All tests passed`, `SUCCESS`, `OK` |

**Fallback chain:**
1. Try specific framework detection (Jest, Vitest, Pytest, etc.)
2. Try Xcode/Swift detection
3. Fall back to exit code + universal patterns

### Intelligent Failure Classification

**Failures are classified into categories with different handling:**

| Category | Patterns | Handling |
|----------|----------|----------|
| **Transient** | Network errors, timeouts, flaky tests | Immediate retry |
| **Fixable** | Assertion errors, type errors | AI analysis + fix |
| **Structural** | Import errors, syntax errors | Deeper analysis |
| **External** | Missing files, env config | Pause + alert |
| **Unfixable** | Permission denied, external service | Log + skip |

**Example classifications:**
- `ECONNREFUSED` → transient
- `expect(received).toEqual(expected)` → fixable
- `Module not found` → structural
- `ENOENT: no such file` → external

### Task-Level Checkpoints

**Progress preserved at task boundaries for crash recovery:**

- Checkpoint created when context limit approached
- Contains: task ID, increment ID, timestamp, status
- Stored in `.specweave/state/task-checkpoint.json`
- Incomplete checkpoints detected on resume

**Checkpoint format:**
```json
{
  "taskId": "T-003",
  "incrementId": "0001-feature",
  "timestamp": "2026-01-02T08:00:00Z",
  "status": "in_progress",
  "contextTokens": 145000
}
```

### Command Timeout Handling

**Graceful handling of hung commands:**

- Default timeout: 10 minutes for test commands
- Configurable per command type
- SIGTERM first, SIGKILL after 30s
- Timeout events logged with context

**Configuration:**
```json
{
  "auto": {
    "timeouts": {
      "test": 600,      // 10 minutes
      "build": 300,     // 5 minutes
      "deploy": 600     // 10 minutes
    }
  }
}
```

### Reliability Logs

All reliability events logged to `.specweave/logs/auto-iterations.log`:

```json
{"timestamp":"2026-01-02T08:00:00Z","event":"iteration","iteration":42,...}
{"timestamp":"2026-01-02T08:01:00Z","event":"context_near_limit","tokens":152000}
{"timestamp":"2026-01-02T08:02:00Z","event":"stale_heartbeat_detected","age":"320s"}
{"timestamp":"2026-01-02T08:03:00Z","event":"failure_classified","category":"transient"}
```

## 🔧 v2.2 TDD Strict Mode & Stop Reason Tracking (NEW!)

### TDD Strict Mode

**Enable TDD strict mode to enforce ALL tests passing before completion:**

```bash
/sw:auto --tdd 0001-feature
# or
/sw:auto --strict 0001-feature
```

**TDD Mode Requirements:**
- ALL unit tests must pass (0 failures)
- ALL E2E tests must pass
- Test execution must be detected in transcript
- At least 1 passing test required per completed task (suspicious if 0)

### Per-Increment TDD Configuration (NEW v2.2)

**TDD mode can be configured at multiple levels with priority:**

1. **Increment metadata.json** (highest priority)
2. **Increment config.json**
3. **spec.md frontmatter**
4. **Session (`--tdd` flag)**
5. **Global config.json** (lowest priority)

**Example: Enable TDD for a specific increment:**

```json
// .specweave/increments/0001-feature/metadata.json
{
  "tddMode": true,
  "testMode": "tdd"
}
```

**Or via spec.md frontmatter:**

```markdown
---
increment: 0001-feature
title: "Critical Payment Feature"
tdd: true
---
```

**Console output shows TDD source:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 AUTO MODE CONTINUING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STOP CRITERIA: 🔴 TDD MODE: ALL tests MUST pass
   TDD Source: increment metadata.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Global Configuration (`.specweave/config.json`):**
```json
{
  "testing": {
    "defaultTestMode": "tdd",    // "tdd", "test-first", or "test-after"
    "coverageTargets": {
      "unit": 85,
      "integration": 80,
      "e2e": 90
    }
  }
}
```

### Automatic Test Command Discovery (NEW v2.2)

**Auto mode now discovers and displays available test commands for your project:**

The stop hook scans for test frameworks and shows you exactly what commands to run:

```
AVAILABLE TEST COMMANDS FOR THIS PROJECT:

Unit/Integration Tests:
  • npm test (npm)
  • npx vitest run (vitest)

E2E Tests:
  • npx playwright test (playwright)

PRIORITY: Run ALL tests BEFORE marking tasks complete!
```

**Supported frameworks detected automatically:**

| Framework | Detection Method |
|-----------|-----------------|
| npm scripts | `package.json` scripts.test |
| Vitest | `vitest.config.ts/js` or dependency |
| Jest | `jest.config.ts/js` or dependency |
| Playwright | `playwright.config.ts/js` |
| Cypress | `cypress.config.ts/js` or `/cypress` dir |
| Detox | `.detoxrc.js/json` or dependency |
| Pytest | `pytest.ini` or `pyproject.toml` |
| Go test | `go.mod` |
| Cargo test | `Cargo.toml` |
| Xcode | `*.xcodeproj` or `*.xcworkspace` |
| Swift test | `Package.swift` |
| Gradle | `build.gradle(.kts)` |
| Maestro | `maestro.yaml` or `.maestro/` |

### Stop Reason Tracking

**v2.2 now logs EXACTLY why auto mode stops:**

All stop reasons logged to `.specweave/logs/auto-stop-reasons.log`:

```json
{
  "timestamp": "2026-01-02T08:00:00Z",
  "sessionId": "auto-2026-01-02-abc123",
  "reason": "All tasks completed, all tests passed (42 passed, 0 failed)",
  "success": true,
  "iteration": 15,
  "increment": "0001-feature",
  "testsRun": true,
  "testsPassed": 42,
  "testsFailed": 0
}
```

**Stop reasons categorized:**
| Category | Success | Example |
|----------|---------|---------|
| `all_tasks_complete` | ✅ | All tests pass, all tasks done |
| `completion_promise` | ✅ | `<auto-complete>DONE</auto-complete>` detected |
| `max_iterations_reached` | ❌ | Safety limit hit (not ideal) |
| `max_hours_exceeded` | ❌ | Time limit hit |
| `test_failures_exhausted` | ❌ | 3 retry attempts failed |
| `external_failure` | ❌ | Environment/config issue |
| `human_gate_pending` | ⏸️ | Waiting for user approval |

### Mobile App Testing Support

**For iOS/Android projects, auto mode detects:**

| Framework | Detection | Command |
|-----------|-----------|---------|
| Xcode (iOS) | `xcodebuild test` output | `xcodebuild -scheme X test` |
| Swift PM | `swift test` output | `swift test` |
| Detox (RN) | `detox test` output | `detox test -c ios.sim.debug` |
| Maestro | `maestro test` output | `maestro test flow.yaml` |
| Appium | Test framework output | Framework-specific |

**Best Practice for Mobile Apps:**
1. Set up automated tests (XCTest, Detox, Maestro)
2. Run tests as part of task completion
3. Auto mode blocks until all mobile tests pass
4. Use `--tdd` for strictest enforcement

**Example mobile test detection:**
```
Executed 15 tests, with 0 failures (0 unexpected) in 12.345 seconds
** TEST SUCCEEDED **
```

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

### Step 1.5: MANDATORY - Display Stop Conditions to User

**⚠️ CRITICAL: You MUST output this EXACT banner to the user BEFORE starting any task work!**

After `specweave auto` succeeds, you MUST output this to the user (not just run Bash):

```
╔══════════════════════════════════════════════════════════════════════════╗
║  🚀 AUTO MODE STARTING                                                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Increment: [INCREMENT_ID]                                               ║
║  Tasks: [X] pending                                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║  🎯 WHEN WILL THIS SESSION STOP?                                          ║
║                                                                          ║
║  ✅ SUCCESS CONDITIONS (session completes when ALL are met):              ║
║     • All tasks marked [x] complete in tasks.md                          ║
║     • All tests passing (unit + E2E if present)                          ║
║     • /sw:done validation passes                                         ║
║                                                                          ║
║  🛑 STOP CONDITIONS (session pauses/ends):                                ║
║     • Test failures after 3 retry attempts → pauses for human            ║
║     • User runs /sw:cancel-auto → immediate stop                         ║
║     • Max iterations reached (safety limit)                              ║
╠══════════════════════════════════════════════════════════════════════════╣
║  💡 You can check progress anytime: /sw:auto-status                       ║
║  💡 To cancel: close session or /sw:cancel-auto                           ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**Fill in the placeholders:**
- `[INCREMENT_ID]`: The actual increment ID (e.g., 0001-user-auth)
- `[X]`: The number of pending tasks (read from tasks.md)

**DO NOT SKIP THIS STEP!** Users MUST know when auto mode will stop BEFORE work begins.

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
| `/sw:skip-increment` | Skip failed increment and continue queue |
| `/sw:do` | Execute tasks (also works standalone) |
| `/sw:progress` | Show increment progress |
