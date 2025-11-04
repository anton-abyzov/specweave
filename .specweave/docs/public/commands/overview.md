---
sidebar_position: 1
---

# Commands Overview

SpecWeave provides slash commands for every stage of your development workflow. This page covers the **main workflow commands** you'll use daily.

:::tip Quick Reference
All commands have convenient short forms (e.g., `/inc`) and explicit namespace forms (e.g., `/specweave:inc`). Use whichever you prefer!
:::

## The Core Workflow

```mermaid
graph LR
    A["/inc"] --> B["/do"]
    B --> C["/validate or /qa"]
    C --> D["/done"]
    D --> E["/next"]
    E --> A

    style A fill:#a8e6cf
    style B fill:#ffd3b6
    style C fill:#ffaaa5
    style D fill:#ff8b94
    style E fill:#a8e6cf
```

## 1. Planning Commands

### `/inc` - Create New Increment

**Most frequently used command** - Start every new feature here.

```bash
/inc "User authentication with JWT"
/inc "Payment processing with Stripe"
```

**What it does**:
- 🔍 Detects tech stack automatically
- 📋 PM-led planning (market research, spec.md, plan.md)
- ✅ Auto-generates tasks.md from plan
- 🧪 Creates test strategy
- 👥 Strategic agent review (Architect, Security, QA, DevOps)

**See**: [ADR](/docs/glossary/terms/adr) (Architecture Decision Records) for design decisions made during planning.

[Full documentation →](./inc)

---

### `/next` - Smart Increment Transition

Intelligently suggests what to work on next.

```bash
/next
```

**What it does**:
- ✅ Auto-closes current increment if ready (PM gates check)
- 💡 Suggests next work (backlog or new feature)
- 📊 Shows progress and priorities

---

## 2. Implementation Commands

### `/do` - Execute Tasks

**Smart auto-resume** - Continue from where you left off.

```bash
/do           # Auto-finds active increment
/do 0007      # Specific increment
```

**What it does**:
- 🎯 Resumes from last incomplete task
- 🔊 Plays sound after each task (via hooks)
- 📝 Updates docs inline (CLAUDE.md, README.md, CHANGELOG.md)
- 🔗 Syncs to GitHub (if plugin enabled)
- 🧪 Runs tests continuously

**Key Features**:
- **Cost optimization**: Uses Haiku for simple tasks (3x faster, 20x cheaper)
- **Automatic hooks**: Runs after EVERY task completion
- **Living docs sync**: Updates `.specweave/docs/` after all tasks complete

[Full documentation →](./do)

---

### `/update-scope` - Update Increment Scope

**Living completion reports** - Track scope changes in real-time.

```bash
/update-scope "Added dark mode toggle (stakeholder request, +16 hours)"
```

**What it does**:
- 📝 Logs scope changes with rationale
- ⏱️ Tracks time impact (+/- hours)
- 👥 Documents who approved
- 🔗 Links to ADRs, GitHub issues, etc.

**Why it matters**: Complete audit trail for compliance, retrospectives, and knowledge transfer.

[Full documentation →](./update-scope)

---

## 3. Quality Assurance Commands

### `/validate` - Rule-Based Validation

**120+ checks** - Fast, free validation.

```bash
/validate 0007
/validate 0007 --quality        # Include AI assessment
/validate 0007 --export         # Export suggestions to tasks.md
```

**What it validates**:
- ✅ Consistency (spec → plan → tasks)
- ✅ Completeness (all required sections)
- ✅ Quality (testable criteria, actionable tasks)
- ✅ Traceability (AC-IDs, ADR references)

[Full documentation →](./validate)

---

### `/qa` - Quality Assessment with Risk Scoring

**Comprehensive quality gate** - AI-powered assessment with BMAD risk scoring.

```bash
/qa 0007                    # Quick mode (default)
/qa 0007 --pre             # Before starting work
/qa 0007 --gate            # Before closing increment
/qa 0007 --export          # Export blockers to tasks.md
```

**7 Quality Dimensions**:
1. Clarity (18% weight)
2. Testability (22% weight)
3. Completeness (18% weight)
4. Feasibility (13% weight)
5. Maintainability (9% weight)
6. Edge Cases (9% weight)
7. **Risk Assessment** (11% weight)

**Quality Gate Decisions**:
- 🟢 **PASS** - Ready to proceed
- 🟡 **CONCERNS** - Should fix before release
- 🔴 **FAIL** - Must fix before proceeding

**Risk Scoring** (BMAD pattern):
- CRITICAL (≥9.0) - Immediate action required
- HIGH (6.0-8.9) - Address before release
- MEDIUM (3.0-5.9) - Monitor
- LOW (<3.0) - Acceptable

[Full documentation →](./qa)

---

### `/validate-coverage` - Test Coverage Check

```bash
/validate-coverage 0007
```

**What it checks**:
- 📊 Per-task coverage (unit, integration, [E2E](/docs/glossary/terms/e2e))
- ✅ AC-ID coverage (all acceptance criteria tested)
- 🎯 Overall coverage vs target (80-90%)
- 📝 Missing tests and recommendations

---

## 4. Completion Commands

### `/done` - Close Increment

**PM validation before closing** - Ensures quality gates pass.

```bash
/done 0007
```

**What it does**:
- ✅ Validates all tasks complete
- ✅ Runs `/qa --gate` (quality gate check)
- ✅ PM agent validates completion
- ✅ Creates completion report
- 🔗 Closes GitHub issues (if plugin enabled)

[Full documentation →](./done)

---

### `/sync-docs` - Synchronize Living Documentation

**Bidirectional sync** - Keep strategic docs and implementation in sync.

```bash
/sync-docs review          # Before implementation (review strategic docs)
/sync-docs update          # After implementation (update with learnings)
```

**What it syncs**:
- 📚 [ADRs](/docs/glossary/terms/adr) (Proposed → Accepted)
- 🏗️ Architecture diagrams (planned → actual)
- 📖 [API](/docs/glossary/terms/api) documentation (contracts → endpoints)
- 📋 Feature lists (planned → completed)

[Full documentation →](./sync-docs)

---

## 5. Monitoring Commands

### `/progress` - Check Increment Progress

```bash
/progress
/progress 0007
```

**What it shows**:
- 📊 Task completion (15/42 tasks, 36%)
- ⏱️ Time tracking (1.2 weeks elapsed, 2.1 weeks remaining)
- 🎯 Current phase and next phase
- ✅ Recent completions
- 📝 Upcoming tasks

---

### `/status` - View All Increments

**High-level overview** - See what SpecWeave is managing.

```bash
/status
```

**What it shows**:
- ▶️  Active increments (what's in progress)
- ⏸️  Paused increments (what's blocked)
- ✅ Completed increments
- 📈 WIP limits and progress

[Full documentation →](./status)

---

### `/costs` - AI Cost Dashboard

**Real-time cost tracking** - See savings from intelligent model selection.

```bash
/costs              # Current increment
/costs 0007         # Specific increment
```

**What it shows**:
- 💰 Total cost (actual spend)
- 📊 Savings (Haiku vs Sonnet)
- 📈 Cost per task
- 🎯 Cost efficiency (% cheaper than all-Sonnet)

---

## 6. Supporting Commands

### `/translate` - Multilingual Support

**Zero-cost LLM-native translation** - Work in your language, maintain docs in English.

```bash
/translate spec.md ru en          # Russian → English
```

**Supported languages**: English, Russian, Spanish, Chinese, German, French, Japanese, Korean, Portuguese

**Smart features**:
- ✅ Preserves code blocks, inline code, links
- ✅ Keeps framework terms ([RFC](/docs/glossary/terms/rfc), ADR, increment)
- ✅ Keeps technical terms ([Node.js](/docs/glossary/terms/nodejs), [REST](/docs/glossary/terms/rest), [GraphQL](/docs/glossary/terms/graphql))
- ✅ Validates structure (heading count, code block count)

[Full documentation →](./translate)

---

## Status Management (System Commands)

:::warning Mostly Automatic
These commands are **primarily used by SpecWeave internally**. The system automatically detects blockages, pauses work, and resumes when ready. You rarely need to call these manually.
:::

### `/pause`, `/resume`, `/abandon`

**SpecWeave automatically**:
- ⏸️  **Pauses** when blocked (missing API keys, waiting for approvals)
- ▶️  **Resumes** when blockage resolved (dependencies available)
- 🚫 **Abandons** when you explicitly request it (business pivot)

**Manual use cases**:
- `/pause 0007 --reason "Pausing for hotfix"` - Business decision
- `/resume 0007` - Restart abandoned work
- `/abandon 0007 --reason "Requirements changed"` - Cancel permanently

[Status Management Guide →](./status-management)

---

## TDD Commands (Test-Driven Development)

For projects using TDD workflow:

```bash
/tdd-red           # Write failing test
/tdd-green         # Implement feature
/tdd-refactor      # Improve code
/tdd-cycle         # Full red-green-refactor cycle
```

---

## All Available Commands

### Core Workflow
- `/inc` - Plan new increment ⭐ **Most used**
- `/do` - Execute tasks ⭐ **Most used**
- `/validate` - Rule-based validation ⭐ **Most used**
- `/qa` - Quality assessment with risk scoring ⭐ **Most used**
- `/done` - Close increment ⭐ **Most used**
- `/next` - Smart increment transition

### Monitoring
- `/status` - View all increments
- `/progress` - Check increment progress
- `/costs` - AI cost dashboard

### Quality Assurance
- `/validate-coverage` - Test coverage check
- `/check-tests` - Validate test structure

### Documentation
- `/sync-docs` - Synchronize living docs
- `/update-scope` - Track scope changes
- `/translate` - Multilingual support

### Status Management (System)
- `/pause` - Pause increment (mostly automatic)
- `/resume` - Resume increment (mostly automatic)
- `/abandon` - Cancel increment

### TDD Workflow
- `/tdd-red` - Write failing test
- `/tdd-green` - Implement feature
- `/tdd-refactor` - Improve code
- `/tdd-cycle` - Full cycle

### Utilities
- `/list-increments` - List all increments
- `/sync-tasks` - Sync tasks to external tools

---

## Command Patterns

### Short vs Namespace Forms

**Both forms work identically**:

```bash
# Short forms (convenient for daily use)
/inc "feature"
/do
/validate 0007
/qa 0007

# Namespace forms (explicit, avoids conflicts)
/specweave:inc "feature"
/specweave:do
/specweave:validate 0007
/specweave:qa 0007
```

**When to use namespace forms**:
- ✅ Brownfield projects (avoid conflicts with existing commands)
- ✅ Documentation (explicit and clear)
- ✅ Scripts (no ambiguity)

---

## Workflow Examples

### Example 1: Standard Feature Development

```bash
# 1. Plan
/inc "User authentication"
# → Creates: spec.md, plan.md, tasks.md

# 2. Review (optional)
/sync-docs review
# → Review strategic docs before starting

# 3. Validate (optional)
/qa 0007 --pre
# → Pre-implementation quality check

# 4. Implement
/do 0007
# → Auto-resumes, hooks fire after each task

# 5. Quality gate
/qa 0007 --gate
# → Comprehensive check before closing

# 6. Close
/done 0007
# → PM validates, closes GitHub issues

# 7. Sync docs
/sync-docs update
# → Update living docs with learnings

# 8. Next
/next
# → Suggests next increment
```

---

### Example 2: Hotfix Workflow

```bash
# 1. Check status
/status
# → See active increments

# 2. Quick increment
/inc "Critical SQL injection fix"
# → Fast planning

# 3. Implement immediately
/do 0008
# → Execute fix

# 4. Validate
/qa 0008 --gate
# → Ensure quality

# 5. Close and deploy
/done 0008
```

---

### Example 3: Multilingual Development

```bash
# 1. Plan in Russian
/inc "Добавить аутентификацию пользователя"
# → PM generates spec in Russian

# 2. Auto-translate to English
# (post-increment-planning hook fires automatically)
# → Spec, plan, tasks now in English

# 3. Continue normally
/do 0007
```

---

## Integration with External Tools

### GitHub Issues (via specweave-github plugin)

```bash
# Create GitHub issue from increment
/github-create-issue 0007

# Sync progress to GitHub
/github-sync 0007

# Close GitHub issue when done
/github-close-issue 0007
```

**Automatic sync**: When GitHub plugin enabled, `/do` and `/done` automatically sync to GitHub.

---

## Best Practices

### 1. Use Short Commands Daily

```bash
# ✅ Quick and efficient
/inc "feature"
/do
/qa 0007

# ❌ Verbose (but works)
/specweave:inc "feature"
/specweave:do
/specweave:qa 0007
```

---

### 2. Validate Early and Often

```bash
# During planning
/qa 0007 --pre

# During development (quick checks)
/qa 0007

# Before closing (comprehensive)
/qa 0007 --gate
```

---

### 3. Track Scope Changes

```bash
# ✅ Good - documented scope change
/update-scope "Added dark mode (stakeholder request, +16h)"

# ❌ Bad - undocumented scope creep
# (just adding features without tracking)
```

---

### 4. Trust the System

```bash
# ✅ Let SpecWeave handle status
/do  # System pauses automatically when blocked

# ❌ Don't manually manage status
# (unless business decision)
```

---

## Configuration

All commands respect `.specweave/config.json`:

```json
{
  "limits": {
    "maxActiveIncrements": 1,
    "hardCap": 2
  },
  "validation": {
    "quality_judge": {
      "enabled": true,
      "always_run": false
    }
  },
  "language": "en",
  "translation": {
    "enabled": true,
    "autoTranslateInternalDocs": true
  }
}
```

---

## Glossary Links

Understanding SpecWeave terminology:

- **[ADR](/docs/glossary/terms/adr)** - Architecture Decision Records
- **[RFC](/docs/glossary/terms/rfc)** - Request for Comments (specification format)
- **[API](/docs/glossary/terms/api)** - Application Programming Interface
- **[E2E](/docs/glossary/terms/e2e)** - End-to-End Testing
- **[Node.js](/docs/glossary/terms/nodejs)** - JavaScript runtime
- **[REST](/docs/glossary/terms/rest)** - RESTful API pattern
- **[GraphQL](/docs/glossary/terms/graphql)** - Query language for APIs
- **[Microservices](/docs/glossary/terms/microservices)** - Distributed architecture pattern
- **[IaC](/docs/glossary/terms/iac)** - Infrastructure as Code

[View full glossary →](/docs/glossary)

---

## Next Steps

- **Getting Started**: [Quick Start Guide](/docs/guides/getting-started)
- **Workflow Guide**: [Complete Development Workflow](/docs/guides/workflow)
- **Quality Gates**: [Quality Assurance Guide](/docs/guides/quality-gates)
- **GitHub Integration**: [GitHub Sync Guide](/docs/guides/github-sync)

---

**Philosophy**:
> SpecWeave commands are designed for **intelligent automation**. The system detects intent, suggests actions, and handles workflow management - you focus on building.
