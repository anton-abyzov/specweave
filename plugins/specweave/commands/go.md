---
name: sw:go
description: Start autonomous execution loop (Ralph Wiggum pattern). Simple, powerful iteration until task complete. Activates for go, ship it, autonomous mode, keep working, iterate.
argument-hint: '"PROMPT" [OPTIONS]'
allowed-tools: ["Bash(specweave go *)"]
---

# Go Command

**Ralph Wiggum pattern for autonomous iteration - simple, powerful, unstoppable.**

Execute the go command to start the loop:

```!
specweave go $ARGUMENTS
```

Work on the task. When you try to exit, the stop hook checks completion and feeds the prompt back. Continue until done or max iterations reached.

## Usage

```bash
/sw:go "PROMPT" [OPTIONS]
```

## What Makes /sw:go Special

**Pure Ralph Pattern**:
- Same prompt, every iteration
- You see your own work from previous iterations
- Tests/builds provide feedback
- Loop until genuinely complete

**vs /sw:auto (Increment-Based)**:
- `/sw:auto` - Increment system, tasks.md tracking, complex workflows
- `/sw:go` - Single prompt, pure iteration, extreme simplicity

**When to use /sw:go**:
- Quick features without formal increment
- Iterate until tests pass
- Autonomous bug fixing
- Rapid prototyping
- "Just make it work" mode

## Arguments

### PROMPT (required)
The task description. Can be simple or detailed.

**Examples**:
```bash
# Simple
/sw:go "Fix all TypeScript errors"

# Detailed with completion criteria
/sw:go "Build REST API for todos. Must have: CRUD endpoints, validation, tests >80% coverage. Output DONE when complete."

# With structured goals
/sw:go "Phase 1: User auth (JWT). Phase 2: Product catalog. Phase 3: Shopping cart. Output COMPLETE when all phases done."
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-iterations N` | Stop after N attempts | 100 |
| `--completion-promise "TEXT"` | Exact phrase that signals completion | None |
| `--build` | Build must pass before completion | false |
| `--tests` | Tests must pass before completion | false |
| `--e2e` | E2E tests must pass before completion | false |
| `--lint` | Linting must pass before completion | false |
| `--types` | Type-checking must pass before completion | false |
| `--dry-run` | Preview without starting | false |

## Completion Detection

The loop stops when ANY of these occur:

1. **Completion Promise Found** - Output contains `<promise>TEXT</promise>` matching `--completion-promise`
2. **Tests Pass + Build Succeeds** - All specified conditions met (if flags used)
3. **Max Iterations Reached** - Safety limit hit
4. **Manual Cancel** - User runs `/sw:cancel-go`

## Examples

### Basic - Fix Until Tests Pass

```bash
/sw:go "Fix all failing tests. Run npm test after each fix. Output DONE when all pass." --completion-promise "DONE" --max-iterations 20
```

**What happens**:
1. Iteration 1: Claude reads prompt, sees failing tests, attempts fixes
2. Iteration 2: Claude sees previous fixes + test results, continues fixing
3. Iteration 3-N: Keeps fixing until tests pass
4. When done: Outputs `<promise>DONE</promise>`, loop stops

### With Quality Gates

```bash
/sw:go "Implement user authentication with JWT" --build --tests --types --max-iterations 50
```

**Loop continues until**:
- Build passes (`npm run build`)
- Tests pass (`npm test`)
- Type-check passes (`tsc --noEmit`)
- Iteration 50 reached (safety)

### Complex Task with Phases

```bash
/sw:go "
Build e-commerce checkout flow:

Phase 1: Cart management (add/remove items)
Phase 2: Address validation
Phase 3: Payment integration (Stripe)
Phase 4: Order confirmation email

Each phase needs:
- Implementation
- Unit tests (>80% coverage)
- E2E test for happy path

Output <promise>CHECKOUT_COMPLETE</promise> when all phases done and tested.
" --completion-promise "CHECKOUT_COMPLETE" --tests --e2e --max-iterations 100
```

### Rapid Bug Fix

```bash
/sw:go "Fix: Login redirect broken after successful auth. Should go to /dashboard but stays on /login. Debug and fix." --max-iterations 10
```

## How It Works

```
User runs /sw:go "PROMPT"
         │
         ▼
specweave go creates session state
   └─ .specweave/state/go-session.json
         │
         ▼
Claude reads prompt and works
         │
         ▼
Claude tries to exit
         │
         ▼
Stop hook (stop-go.sh) intercepts
   ├─ Task complete? → approve exit
   ├─ Tests pass? → approve exit
   ├─ Max iterations? → approve exit
   └─ Otherwise → block exit, re-feed prompt
         │
         ▼
Claude sees SAME prompt + NEW context:
   - Files modified in previous iteration
   - Test output from previous run
   - Build errors from previous attempt
   - Git history of changes
         │
         ▼
Loop continues...
```

## Best Practices

### 1. Write Clear Completion Criteria

❌ **Bad**:
```bash
/sw:go "Make the app better"
```

✅ **Good**:
```bash
/sw:go "Optimize page load time to <2s. Metrics: Lighthouse score >90, LCP <1.5s. Output OPTIMIZED when done." --completion-promise "OPTIMIZED"
```

### 2. Use Quality Gates for Safety

```bash
# Ensures code quality throughout iteration
/sw:go "Refactor auth module for better testability" --tests --lint --types
```

### 3. Include Self-Verification in Prompt

```bash
/sw:go "
Implement feature X following TDD:
1. Write failing test
2. Implement feature
3. Run tests
4. If any fail, debug and fix
5. Refactor
6. Repeat until all green
7. Output TESTS_GREEN when done
" --completion-promise "TESTS_GREEN" --tests
```

### 4. Set Reasonable Iteration Limits

```bash
# Simple tasks
/sw:go "Fix typos in README" --max-iterations 5

# Medium tasks
/sw:go "Add search feature" --max-iterations 30

# Complex tasks
/sw:go "Build payment system" --max-iterations 100
```

### 5. Leverage Previous Work Visibility

The prompt stays the same, but Claude sees:
- **Files**: Your code from previous iterations
- **Tests**: Output from `npm test` runs
- **Errors**: Build failures, type errors
- **Git**: Commit history showing attempts

**This means**: Write the prompt ONCE with full requirements. Don't say "fix the last iteration's bugs" - Claude automatically sees and learns from previous attempts.

## Differences from /sw:auto

| Feature | /sw:go | /sw:auto |
|---------|--------|----------|
| **Pattern** | Pure Ralph loop | Increment workflow |
| **Prompt** | Same every iteration | Task-based progression |
| **Tracking** | Session state only | tasks.md, spec.md, metadata |
| **Complexity** | Minimal | Full PM workflow |
| **Use Case** | Quick iteration | Formal development |
| **Best For** | "Just ship it" | "Ship it right" |

## Session Management

### Check Status

```bash
/sw:go-status
```

Shows:
- Current iteration
- Max iterations
- Completion promise
- Session ID
- Runtime

### Cancel Session

```bash
/sw:cancel-go
```

Immediately stops the loop and cleans up session state.

### Resume After Crash

If Claude Code crashes during a go session:

```bash
# Check if session exists
cat .specweave/state/go-session.json

# Resume by running /sw:go again with SAME prompt
/sw:go "SAME PROMPT AS BEFORE" --max-iterations X
```

The hook will detect the existing session and continue from current iteration.

## Advanced Patterns

### Self-Correcting Test Loop

```bash
/sw:go "
Feature: User registration with email verification

Requirements:
- POST /api/register endpoint
- Email validation
- Password strength check (min 8 chars, 1 number, 1 special)
- Send verification email
- Tests for all edge cases

Process:
1. Implement feature
2. Run: npm test
3. If failures detected:
   - Read failure output
   - Identify root cause
   - Fix the issue
   - Goto step 2
4. Once all tests pass, output: <promise>REGISTRATION_COMPLETE</promise>

IMPORTANT: Actually RUN the tests each iteration, don't just write them.
" --completion-promise "REGISTRATION_COMPLETE" --tests --max-iterations 30
```

### Build + Deploy Loop

```bash
/sw:go "
Deploy new feature to staging:

Steps:
1. Implement feature X
2. npm run build (must pass)
3. npm test (must pass)
4. npm run e2e (must pass)
5. Deploy to staging (vercel deploy)
6. Smoke test staging URL
7. Output: <promise>DEPLOYED</promise>

If ANY step fails:
- Debug the failure
- Fix the issue
- Restart from that step
" --completion-promise "DEPLOYED" --build --tests --e2e --max-iterations 40
```

### Iterative Refactoring

```bash
/sw:go "
Refactor the messy UserService class:

Goals:
- Extract smaller, focused methods
- Add proper types
- Write unit tests (coverage >85%)
- Fix all ESLint warnings
- Document public methods

After each change:
- Run: npm run lint
- Run: npm test
- Check: coverage report

Output REFACTORED when:
- All tests pass
- No lint errors
- Coverage >85%
- Code is readable
" --completion-promise "REFACTORED" --tests --lint --types
```

## Configuration

In `.specweave/config.json`:

```json
{
  "go": {
    "defaultMaxIterations": 100,
    "testCommand": "npm test",
    "buildCommand": "npm run build",
    "enableHeartbeat": true,
    "soundOnComplete": true
  }
}
```

## Safety Features

- **Max Iterations**: Hard stop at configured limit
- **Heartbeat Tracking**: Detects stale sessions
- **Session Cleanup**: Auto-cleanup on completion
- **Sound Alert**: Plays sound when loop completes (macOS/Linux)
- **Crash Recovery**: Resume from last iteration

## Troubleshooting

**Loop won't stop**:
- Check completion promise exact match (case-sensitive)
- Verify quality gates are actually passing
- Use `/sw:cancel-go` to force stop
- Check `.specweave/logs/go-iterations.log` for details

**Tests not running**:
- Ensure test command is correct in config
- Prompt must explicitly say "run tests"
- Use `--tests` flag to enforce test execution

**Max iterations too low**:
- Start conservative (20-30)
- Increase after observing a few runs
- Complex tasks may need 50-100

**Session state corrupt**:
```bash
rm -f .specweave/state/go-session.json
# Then start fresh /sw:go session
```

## Philosophy

**Ralph Wiggum says**: "I'm in danger!" - but he keeps going.

**The Go Pattern**:
1. **Iteration > Planning** - Start working, fix as you go
2. **Feedback > Prediction** - Let tests guide you
3. **Done > Perfect** - Ship when it works
4. **Persistence > Cleverness** - Keep trying until it works

**Use /sw:go when**:
- You want to **ship fast**
- The task is **well-defined**
- **Automated verification** exists (tests, linters)
- You're okay **walking away** and letting it run

**Use /sw:auto when**:
- You want **formal tracking**
- Task is **part of larger project**
- Need **PM workflow** (specs, ACs, tasks)
- Want **external sync** (GitHub, JIRA)

## Real-World Examples

### Example 1: Fix All E2E Test Failures

```bash
/sw:go "
Current state: 15 E2E tests, 8 failing

Task: Fix ALL failing E2E tests

Process per failure:
1. Read test failure output
2. Identify root cause
3. Fix the issue (code or test)
4. Run: npx playwright test
5. Repeat until that test passes
6. Move to next failure

Output <promise>ALL_TESTS_PASS</promise> when 15/15 tests pass.

CRITICAL: Actually run the tests each iteration!
" --completion-promise "ALL_TESTS_PASS" --e2e --max-iterations 40
```

### Example 2: Performance Optimization Loop

```bash
/sw:go "
Current: Page load time is 5.2s
Target: <2s page load time

Optimization strategy:
1. Run Lighthouse audit
2. Identify top 3 bottlenecks
3. Fix highest impact item
4. Re-run Lighthouse
5. Repeat until <2s

Output <promise>FAST</promise> when:
- Lighthouse Performance score >90
- LCP <1.5s
- Total page load <2s
" --completion-promise "FAST" --max-iterations 25
```

### Example 3: Security Fixes

```bash
/sw:go "
npm audit shows 23 vulnerabilities

Task: Fix ALL security vulnerabilities

Process:
1. Run: npm audit
2. Attempt: npm audit fix
3. If vulnerabilities remain:
   - Read vulnerability details
   - Update packages manually
   - Test that app still works
   - Repeat
4. Output <promise>SECURE</promise> when npm audit shows 0 vulnerabilities

Must verify:
- npm audit shows 0 vulnerabilities
- npm test passes (no regressions)
- npm run build succeeds
" --completion-promise "SECURE" --tests --build --max-iterations 30
```

## Related Commands

| Command | Purpose |
|---------|---------|
| `/sw:go-status` | Check go session status |
| `/sw:cancel-go` | Cancel go session |
| `/sw:auto` | Full increment workflow (alternative) |
| `/sw:do` | Execute increment tasks (alternative) |

---

**Ship it.** 🚀
