---
sidebar_position: 1
title: Command Reference
description: Complete reference for SpecWeave slash commands
---

# SpecWeave Command Reference

SpecWeave provides focused commands for increment-based development. All commands use the `/specweave:*` namespace to avoid conflicts with Claude Code's native commands.

## Command Categories

### 1. Planning Commands

#### `/specweave:increment "feature-name"`

Create a new increment with PM-led planning process.

**What it does**:
- Market research and feature analysis
- Generates spec.md with user stories and acceptance criteria
- Creates plan.md with architecture and implementation details
- Auto-generates tasks.md with embedded test plans (BDD format)
- Auto-closes previous increment if PM gates pass

**When to use**: Starting any new feature, bug fix, hotfix, refactor, or experiment

**Example**:
```bash
/specweave:increment "Add user authentication with JWT"
```

---

### 2. Implementation Commands

#### `/specweave:do`

Execute increment implementation following spec and plan (smart resume).

**What it does**:
- Resumes from last incomplete task automatically
- Runs hooks after EVERY task completion
- Auto-syncs living docs (if configured)
- Tracks progress in real-time

**When to use**: Starting or continuing work on the active increment

**Example**:
```bash
/specweave:do
# Automatically resumes from task T-005 (last incomplete task)
```

---

### 3. Quality Assurance Commands

SpecWeave provides **three distinct QA commands**, each serving a specific purpose. Understanding when to use each is critical for efficient workflows.

#### `/specweave:validate <increment-id> [--quality] [--export] [--fix]`

**Purpose**: Structural validation of increment files

**What it checks**:
- ✅ 120 rule-based validation checks (consistency, completeness, quality, traceability)
- ✅ Optional AI quality assessment (6 dimensions: clarity, testability, completeness, feasibility, maintainability, edge cases)
- ✅ Files exist and have proper structure
- ✅ Cross-document consistency (spec → plan → tasks alignment)

**Output**: Issues and suggestions (can export to tasks.md or auto-fix)

**When to use**:
- During development for quick structural checks
- After creating/editing spec.md, plan.md, or tasks.md
- When you want to verify files are well-formed

**User intent keywords**: "validate increment", "check increment", "validate files"

**Examples**:
```bash
# Basic validation (rule-based only)
/specweave:validate 0008

# With AI quality assessment
/specweave:validate 0008 --quality

# Export suggestions to tasks.md
/specweave:validate 0008 --quality --export

# Auto-fix issues (experimental)
/specweave:validate 0008 --quality --fix
```

---

#### `/specweave:qa <increment-id> [--pre|--gate|--quick] [--export] [--ci]`

**Purpose**: Comprehensive quality assessment with **risk scoring** and **PASS/CONCERNS/FAIL decisions**

**What it checks**:
- ✅ Same 120 rule-based checks as validate
- ✅ AI quality assessment with **7 dimensions** (6 from validate + **RISK ASSESSMENT**)
- ✅ **BMAD risk scoring** (Probability × Impact) for Security, Technical, Implementation, Operational risks
- ✅ **Quality gate decision**: PASS, CONCERNS, or FAIL
- ✅ Blockers (MUST fix) vs Concerns (SHOULD fix) vs Recommendations (NICE to fix)

**Key differences from validate**:
- Adds **Risk Assessment** dimension (security vulnerabilities, technical debt, etc.)
- Provides **quality gate decisions** (not just suggestions)
- Has **multiple modes**: `--quick` (30s), `--pre` (1m), `--gate` (2-3m), `--full` (5m)
- Returns **exit codes** for CI/CD integration
- Focuses on **actionable blockers** that prevent proceeding

**When to use**:
- **Before starting implementation** (`/specweave:qa 0008 --pre`)
- **Before closing increment** (`/specweave:qa 0008 --gate`) - auto-invoked by `/specweave:done`
- **In CI/CD pipelines** to block PRs with critical issues
- When you need a **go/no-go decision** ("Is this ready?")

**User intent keywords**: "check quality", "is ready", "quality gate", "assess risks", "quality assessment"

**Examples**:
```bash
# Quick check during development
/specweave:qa 0008

# Pre-implementation check (before starting work)
/specweave:qa 0008 --pre

# Quality gate check (before closing, comprehensive)
/specweave:qa 0008 --gate

# Export blockers to tasks.md
/specweave:qa 0008 --export

# CI mode (exit 1 on FAIL)
/specweave:qa 0008 --ci

# Skip AI assessment (rule-based only, free)
/specweave:qa 0008 --no-ai
```

**Cost breakdown**:

| Mode | Tokens | Cost (USD) | Time |
|------|--------|------------|------|
| Quick | ~2,500 | ~$0.025 | 30s |
| Pre | ~5,000 | ~$0.050 | 1m |
| Gate | ~10,000 | ~$0.100 | 2-3m |
| Full | ~50,000 | ~$0.500 | 5m |

---

#### `/specweave:check-tests <increment-id> [--detailed] [--ac-coverage]`

**Purpose**: Validate test coverage and execution status from tasks.md

**What it checks**:
- ✅ Task test coverage (which tasks have test plans)
- ✅ **Test execution status** (passing/failing/not implemented)
- ✅ **Coverage metrics** (per-task, overall, vs targets)
- ✅ **AC-ID coverage** (which acceptance criteria have tests)
- ✅ Missing tests or coverage gaps

**Key differences from validate/qa**:
- Actually **runs the tests** (not just checking if test plans exist)
- Reports **test pass/fail status** with error messages
- Validates **coverage targets** (80-90%)
- Maps **AC-IDs to test cases** (traceability)
- Works with **NEW format** (embedded tests in tasks.md) and OLD format (tests.md)

**When to use**:
- **After implementing tasks** (verify tests pass)
- **Before creating PR** (ensure coverage meets targets)
- **In CI/CD** to fail build if tests fail or coverage < 80%
- **During increment closure** (auto-invoked by `/specweave:done`)

**User intent keywords**: "check tests", "test coverage", "are tests passing", "validate tests", "coverage report"

**Examples**:
```bash
# Check tests for current increment
/specweave:check-tests

# Check tests for specific increment
/specweave:check-tests 0008

# Detailed report with test case breakdown
/specweave:check-tests 0008 --detailed

# AC-ID coverage report only
/specweave:check-tests 0008 --ac-coverage
```

**Exit codes** (for CI/CD):
- 0 = All tests passing, coverage ≥80%
- 1 = Tests failing
- 2 = Coverage &lt;80%
- 3 = AC-IDs not covered
- 4 = Command error (invalid increment, etc.)

---

### Quality Commands Comparison

| Aspect | **validate** | **qa** | **check-tests** |
|--------|------------|--------|----------------|
| **Primary focus** | Structural validation | Quality gate + risk scoring | Test execution + coverage |
| **Rule-based checks** | ✅ 120 checks | ✅ 120 checks | ❌ No (tests-specific) |
| **AI assessment** | ✅ Optional (6 dimensions) | ✅ Default (7 dimensions + risk) | ❌ No AI |
| **Runs tests** | ❌ No | ❌ No | ✅ Yes |
| **Coverage validation** | ❌ No | ❌ No | ✅ Yes |
| **Risk scoring** | ❌ No | ✅ Yes (BMAD pattern) | ❌ No |
| **Quality gate decision** | ❌ No | ✅ PASS/CONCERNS/FAIL | ✅ Pass/fail (coverage) |
| **Exit codes (CI/CD)** | ❌ No | ✅ Yes | ✅ Yes |
| **Modes** | Single mode | 4 modes (quick/pre/gate/full) | Single mode |
| **Use case** | Development checks | Critical decision points | Test validation |

---

### Typical Workflow with QA Commands

```bash
# 1. After creating increment
/specweave:validate 0008
# → Checks files are well-structured

# 2. Before starting implementation
/specweave:qa 0008 --pre
# → Quality gate: Is spec ready? Any risks?
# → Decision: PASS/CONCERNS/FAIL

# 3. During implementation (after writing tests)
/specweave:check-tests 0008
# → Are tests passing? Coverage ≥ 80%?

# 4. Before closing increment
/specweave:qa 0008 --gate
# → Comprehensive check (auto-runs check-tests too)
# → Decision: Ready to close or not?
```

---

### 4. Completion Commands

#### `/specweave:done <increment-id>`

Close increment with PM validation.

**What it does**:
- Checks all tasks complete
- Validates test coverage (runs `/specweave:check-tests` automatically)
- Runs quality gate check (runs `/specweave:qa --gate` automatically)
- Updates living docs (syncs spec.md to `.specweave/docs/internal/specs/`)
- Creates completion report
- Marks increment as complete

**When to use**: When all tasks are complete and increment is ready to close

**Example**:
```bash
/specweave:done 0008
# PM Agent validates:
# ✅ All tasks complete
# ✅ Tests passing, coverage ≥80%
# ✅ Quality gate: PASS
# ✅ Living docs synced
# ✅ Completion report created
```

---

#### `/specweave:sync-docs [update|review]`

Bidirectional documentation sync between increments and living docs.

**Modes**:

**Review mode** (before implementation):
```bash
/specweave:sync-docs review
# Reads strategic docs (.specweave/docs/internal/)
# Suggests updates to increment spec.md
```

**Update mode** (after implementation):
```bash
/specweave:sync-docs update
# Syncs completed increments to living docs
# Updates `.specweave/docs/internal/specs/spec-NNN.md`
```

**When to use**:
- **Review**: Before starting increment (sync knowledge into spec.md)
- **Update**: After completing increment (sync spec.md into living docs)

**Note**: Post-task-completion hook auto-syncs if configured in `.specweave/config.json`

---

### 5. Monitoring Commands

#### `/specweave:progress`

Show current increment progress, task completion %, PM gate status, and next action.

**What it shows**:
- Current increment ID and name
- Task completion percentage
- PM gate status (Gate 1: Spec ready, Gate 2: Implementation complete)
- Test coverage status
- Next recommended action

**When to use**: Anytime you want to check current status

**Example output**:
```
📊 Increment 0008-user-authentication

Progress: 15/24 tasks complete (62%)

PM Gates:
  ✅ Gate 1: Spec approved
  ⏳ Gate 2: Implementation in progress

Test Coverage: 78% (target: 80-90%)

Next Action: Complete T-016 (Implement password reset)
```

---

#### `/specweave:status`

Show increment status overview with rich details (active, paused, completed, abandoned).

**What it shows**:
- All increments grouped by status
- Completion percentage
- Creation and completion dates
- Pause/abandon reasons

**When to use**: View all increments at a glance

**Example output**:
```
Active Increments (1):
  • 0008-user-authentication (62% complete, started 2025-11-01)

Completed Increments (7):
  • 0007-smart-increment-discipline (100%, closed 2025-10-28)
  • 0006-llm-native-i18n (100%, closed 2025-10-25)
  ...

Paused Increments (1):
  • 0005-cross-platform-cli (45%, paused 2025-10-20)
    Reason: Blocked by external dependency (Node.js 20 compatibility)
```

---

### 6. State Management Commands

#### `/specweave:pause <increment-id> --reason="..."`

Pause an active increment (blocked by external dependency, deprioritized).

**When to use**: When work is temporarily blocked or deprioritized

**Example**:
```bash
/specweave:pause 0008 --reason="Waiting for API vendor to fix bug #1234"
```

---

#### `/specweave:resume <increment-id>`

Resume a paused increment.

**When to use**: When blocker is resolved and work can continue

**Example**:
```bash
/specweave:resume 0008
```

---

#### `/specweave:abandon <increment-id> --reason="..."`

Abandon an incomplete increment (requirements changed, obsolete).

**When to use**: When increment is no longer needed or requirements changed significantly

**Example**:
```bash
/specweave:abandon 0008 --reason="Requirements changed, feature no longer needed"
```

---

### 7. Utility Commands

#### `/specweave:costs [increment-id]`

Display AI cost dashboard for current or specified increment with real-time savings tracking.

**Example**:
```bash
/specweave:costs 0008

💰 AI Cost Dashboard: Increment 0008

Total Cost: $2.45
  • Planning (PM agent): $0.75
  • Implementation: $1.20
  • QA assessment: $0.50

Savings from context optimization: $18.30 (88% reduction!)
```

---

#### `/specweave:update-scope`

Update living completion report with scope changes during increment execution.

**When to use**: Whenever scope changes (add/remove user stories, pivot architecture)

**Example**:
```bash
/specweave:update-scope "Added dark mode toggle (stakeholder request from CMO, +16 hours)"
```

---

#### `/specweave:next`

Smart increment transition - auto-close current if ready, intelligently suggest next work (backlog or new feature).

**When to use**: After completing current increment, to decide what to work on next

**Example**:
```bash
/specweave:next
# Suggests: "Close 0008, start 0009-dark-mode from backlog" or "Create new feature"
```

---

## Intent-Based Command Routing

SpecWeave intelligently routes user intents to the correct command:

| User says | Routes to | Reason |
|-----------|-----------|--------|
| "validate increment 0008" | `/specweave:validate 0008` | Generic validation |
| "check quality of 0008" | `/specweave:qa 0008` | Quality-focused |
| "is 0008 ready to start?" | `/specweave:qa 0008 --pre` | Quality gate decision |
| "check test coverage for 0008" | `/specweave:check-tests 0008` | Test-specific |
| "are tests passing in 0008?" | `/specweave:check-tests 0008` | Test execution status |
| "run all checks before closing" | `/specweave:qa 0008 --gate` | Comprehensive pre-closure |
| "assess risks in 0008" | `/specweave:qa 0008` | Risk scoring needed |

---

## Essential 8 Commands (Quick Start)

For most users, these 8 commands cover 95% of workflows:

1. **`/specweave:increment "feature"`** - Plan new increment
2. **`/specweave:do`** - Execute tasks (smart resume)
3. **`/specweave:progress`** - Check current status
4. **`/specweave:validate <id>`** - Validate structure
5. **`/specweave:qa <id>`** - Quality gate check
6. **`/specweave:check-tests <id>`** - Test validation
7. **`/specweave:done <id>`** - Close increment
8. **`/specweave:sync-docs`** - Sync living docs

---

## Command Naming Convention

**All commands use the `/specweave:*` namespace** to avoid conflicts with Claude Code's native commands and other repositories.

**NO SHORTCUTS**: Do NOT use shortcuts like `/inc`, `/do`, `/pause`, `/resume`, `/qa`, etc. They conflict with Claude Code and other tools and will break functionality.

**Correct** (full namespace):
```bash
/specweave:increment "feature"     # ✅ Full namespace
/specweave:do                       # ✅ Full namespace
/specweave:qa 0008                  # ✅ Full namespace
/specweave:pause 0008               # ✅ Full namespace
```

**Incorrect** (shortcuts without namespace):
```bash
/inc "feature"      # ❌ Shortcut - conflicts with Claude Code and other repos
/do                 # ❌ Shortcut - conflicts with Claude Code and other repos
/qa 0008            # ❌ Shortcut - conflicts with Claude Code and other repos
/pause 0008         # ❌ Shortcut - conflicts with Claude Code and other repos
```

---

## Related Documentation

- [What is SpecWeave?](/docs/intro)
- [DORA Metrics](/docs/metrics)
- [FAQ](/docs/faq)
