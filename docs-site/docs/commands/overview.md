---
sidebar_position: 1
---

# Commands Overview

SpecWeave provides slash commands for every stage of your development workflow. This page covers the **main workflow commands** you'll use daily.

:::warning No Shortcuts
All commands MUST use the `/specweave:*` namespace prefix. Shortcuts like `/inc`, `/do`, `/pause`, `/resume` (without the namespace) conflict with Claude Code's native commands and other repositories.
:::

## The Core Workflow

```mermaid
graph LR
    A["/specweave:increment"] --> B["/specweave:do"]
    B --> C["/specweave:progress"]
    C --> D["/specweave:validate or /specweave:qa"]
    D --> E["/specweave:next"]
    E --> F["/specweave:sync-docs"]
    F --> A

    style A fill:#a8e6cf
    style B fill:#ffd3b6
    style C fill:#a3d5ff
    style D fill:#ffaaa5
    style E fill:#ff8b94
    style F fill:#d4a5ff
```

**Pro tip**: Use `/specweave:next` instead of `/specweave:done` — it auto-closes and suggests next work!

## 1. Planning Commands

### `/specweave:increment` - Create New Increment

**Most frequently used command** - Start every new feature here.

```bash
/specweave:increment "User authentication with JWT"
/specweave:increment "Payment processing with Stripe"
/specweave:increment "Real-time notifications"
```

**What it does**:
- 🔍 Detects tech stack automatically
- 📋 [PM](/docs/glossary/terms/pm-agent)-led planning (market research, [spec.md](/docs/glossary/terms/spec-md), plan)
- ✅ Auto-generates [tasks.md](/docs/glossary/terms/tasks-md) from [plan](/docs/glossary/terms/plan-md)
- 🧪 Creates test strategy
- 👥 Strategic agent review ([Architect](/docs/glossary/terms/architect-agent), Security, [QA](/docs/glossary/terms/qa-lead-agent), [Tech Lead](/docs/glossary/terms/tech-lead-agent))

**See**: [ADR](/docs/glossary/terms/adr) (Architecture Decision Records) for design decisions made during planning.

<!-- TODO: Add dedicated increment command documentation -->

---

## 2. Implementation Commands

### `/specweave:do` - Execute Tasks

**Smart auto-resume** - Continue from where you left off.

```bash
/specweave:do           # Auto-finds active increment
/specweave:do 0007      # Specific increment
```

**What it does**:
- 🎯 Resumes from last incomplete task
- 🔊 Plays sound after each task (via hooks)
- 📝 Updates docs inline (CLAUDE.md, README.md, CHANGELOG)
- 🔗 Syncs to GitHub (if plugin enabled)
- 🧪 Runs tests continuously

**Key Features**:
- **Cost optimization**: Uses Haiku for simple tasks (3x faster, 20x cheaper)
- **Automatic hooks**: Runs after EVERY task completion
- **[Living docs](/docs/glossary/terms/living-docs) sync**: Updates `.specweave/docs/` after all tasks complete

<!-- TODO: Add dedicated do command documentation -->

---

## 3. Quality Assurance Commands

### `/specweave:validate` - Rule-Based Validation

**120+ checks** - Fast, free validation.

```bash
/specweave:validate 0007
/specweave:validate 0007 --quality        # Include AI assessment
/specweave:validate 0007 --export         # Export suggestions to tasks.md
```

**What it validates**:
- ✅ Consistency (spec → plan → tasks)
- ✅ Completeness (all required sections)
- ✅ Quality (testable criteria, actionable tasks)
- ✅ Traceability ([AC-IDs](/docs/glossary/terms/ac-id), [ADR](/docs/glossary/terms/adr) references)

<!-- TODO: Add dedicated validate command documentation -->

---

### `/specweave:qa` - Quality Assessment with Risk Scoring

**Comprehensive [quality gate](/docs/glossary/terms/quality-gate)** - AI-powered assessment with quantitative risk scoring (Probability × Impact).

```bash
/specweave:qa 0007                    # Quick mode (default)
/specweave:qa 0007 --pre             # Before starting work
/specweave:qa 0007 --gate            # Before closing increment
/specweave:qa 0007 --export          # Export blockers to tasks.md
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

**Risk Scoring** (Probability × Impact method):
- CRITICAL (≥9.0) - Immediate action required
- HIGH (6.0-8.9) - Address before release
- MEDIUM (3.0-5.9) - Monitor
- LOW (\&lt;3.0) - Acceptable

<!-- TODO: Add dedicated qa command documentation -->

---

### `/specweave:check-tests` - Test Coverage Check

```bash
/specweave:check-tests 0007
```

**What it checks**:
- 📊 Per-task coverage (unit, integration, [E2E](/docs/glossary/terms/e2e))
- ✅ [AC-ID](/docs/glossary/terms/ac-id) coverage (all [acceptance criteria](/docs/glossary/terms/acceptance-criteria) tested)
- 🎯 Overall coverage vs target (80-90%)
- 📝 Missing tests and recommendations

---

## 4. Completion Commands

### `/specweave:next` - Smart Workflow Transition

**The flow command** - Auto-close current work, suggest next.

```bash
/specweave:next
```

**What it does**:
- 🔍 Validates current increment (3 gates: tasks, tests, docs)
- 🎯 Auto-closes if all gates pass
- 📊 Runs post-closure quality assessment
- 💡 Suggests next work (backlog or new feature)

**Why use `/specweave:next` instead of `/specweave:done`**:

| `/specweave:done` | `/specweave:next` |
|-------------------|-------------------|
| Closes increment | Closes AND suggests next |
| Requires increment ID | Auto-detects active increment |
| Manual next step | Intelligent recommendations |
| Single action | Complete workflow transition |

**Example**:
```
/specweave:next

📊 Checking current increment...
Active: 0007-user-authentication

🔍 PM Validation:
  ✅ Gate 1: All tasks complete (15/15)
  ✅ Gate 2: Tests passing (87% coverage)
  ✅ Gate 3: Docs updated

🎯 Auto-closing increment 0007...
  ✓ Quality score: 87/100 (GOOD)

🎉 Increment 0007 closed!

🎯 Next: 0008-payment-processing (P1, ready to start)
   Run: /specweave:do 0008
```

---

### `/specweave:done` - Close Increment

**[PM](/docs/glossary/terms/pm-agent) validation before closing** - Ensures [quality gates](/docs/glossary/terms/quality-gate) pass.

```bash
/specweave:done 0007
```

**What it does**:
- ✅ Validates all tasks complete
- ✅ Runs `/specweave:qa --gate` (quality gate check)
- ✅ PM agent validates completion
- ✅ Creates [completion report](/docs/glossary/terms/completion-report)
- 🔗 Closes GitHub issues (if plugin enabled)

<!-- TODO: Add dedicated done command documentation -->

---

### `/specweave:sync-docs` - Synchronize Living Documentation

**[Bidirectional sync](/docs/glossary/terms/bidirectional-sync)** - Keep strategic docs and implementation in sync.

```bash
/specweave:sync-docs review          # Before implementation (review strategic docs)
/specweave:sync-docs update          # After implementation (update with learnings)
```

**What it syncs**:
- 📚 [ADRs](/docs/glossary/terms/adr) (Proposed → Accepted)
- 🏗️ Architecture diagrams (planned → actual)
- 📖 [API](/docs/glossary/terms/api) documentation (contracts → endpoints)
- 📋 Feature lists (planned → completed)

<!-- TODO: Add dedicated sync-docs command documentation -->

---

## 5. Sync & Repository Commands

### `/specweave:save` - Save Changes Across Repositories

**One command for git operations** - Works for single repos and multi-repo umbrella setups.

```bash
# Auto-generate commit message
/specweave:save

# With explicit message
/specweave:save "feat: Add user authentication"

# Dry run (preview)
/specweave:save --dry-run
```

**What it does**:
- 📊 Analyzes changes to auto-generate commit message
- 🔍 Detects all repos (umbrella or single)
- ⚡ Commits and pushes to all repos with one command
- 🔧 Sets up remotes if missing

**Options**:
- `--dry-run` - Preview without executing
- `--repos <list>` - Specific repos only
- `--yes` / `-y` - Accept auto-message without prompt
- `--no-push` - Commit only, don't push

---

### `/specweave:sync-specs` - Sync Specs to Living Docs

**Quick specs-only sync** - Updates user stories and features only.

```bash
/specweave:sync-specs 0007
/specweave:sync-specs --dry-run
```

**What it syncs**:
- User stories to `.specweave/docs/internal/specs/`
- Feature documentation
- Bidirectional task links

**When to use**: After making changes to spec.md and wanting quick sync.

---

### `/specweave:sync-progress` - Sync to External Tools

**Full external sync** - Updates all connected platforms.

```bash
/specweave:sync-progress
/specweave:sync-progress 0007
```

**What it syncs**:
- Living docs (user stories, features)
- GitHub Issues (checkboxes, comments)
- JIRA (if configured)
- Azure DevOps (if configured)

---

### `/specweave:validate-status` - Fix Status Line

**Validate and auto-fix status line desync**.

```bash
/specweave:validate-status
```

**What it checks**:
- [ ] Task count matches frontmatter
- [ ] Cache matches tasks.md reality
- [ ] Percentage calculations correct

**When to use**: Status line shows wrong percentage, after manual edits, after git conflicts.

---

### `/specweave:workflow` - Dashboard View

**Complete workflow navigator** - Shows phase, status, and next steps.

```bash
/specweave:workflow
/specweave:workflow 0007
```

**What it shows**:
- Current phase (Planning, Implementing, Review, etc.)
- Task and AC completion
- External tools status
- Living docs status
- Suggested next actions

---

## 6. Monitoring Commands

### `/specweave:progress` - Check Increment Progress

```bash
/specweave:progress
/specweave:progress 0007
```

**What it shows**:
- 📊 Task completion (15/42 tasks, 36%)
- ⏱️ Time tracking (1.2 weeks elapsed, 2.1 weeks remaining)
- 🎯 Current phase and next phase
- ✅ Recent completions
- 📝 Upcoming tasks

---

## All Available Commands

### Essential Workflow (Use These!)
- `/specweave:increment` - Plan new increment ⭐ **START HERE**
- `/specweave:do` - Execute tasks ⭐ **MAIN WORK**
- `/specweave:next` - Smart workflow transition ⭐ **FLOW COMMAND** (auto-close + suggest next)
- `/specweave:progress` - Check status ⭐ **VISIBILITY**
- `/specweave:validate` - Quick validation ⭐ **PRE-CHECK**
- `/specweave:qa` - Quality assessment ⭐ **QUALITY GATE**
- `/specweave:check-tests` - Test coverage check ⭐ **TEST VALIDATION**
- `/specweave:done` - Close increment ⭐ **FINISH**
- `/specweave:sync-docs` - Synchronize living docs ⭐ **KEEP DOCS CURRENT**
- `/specweave:sync-specs` - Sync specs only ⭐ **QUICK SPEC SYNC**
- `/specweave:sync-progress` - Sync to external tools ⭐ **EXTERNAL SYNC**
- `/specweave:save` - Save & push to all repos ⭐ **MULTI-REPO GIT**
- `/specweave:workflow` - Dashboard view ⭐ **NAVIGATION**
- `/specweave:validate-status` - Fix status line ⭐ **STATUS FIX**

---

## Workflow Example: Standard Feature Development

```bash
# 1. Plan new feature
/specweave:increment "User authentication"
# → Creates: spec.md, plan.md, tasks.md

# 2. Review docs (optional)
/specweave:sync-docs review
# → Review strategic docs before starting

# 3. Pre-check quality (optional)
/specweave:qa 0007 --pre
# → Pre-implementation quality check

# 4. Implement tasks
/specweave:do 0007
# → Auto-resumes from last task, hooks fire after each completion

# 5. Check progress
/specweave:progress 0007
# → See completion status

# 6. Validate quality
/specweave:qa 0007 --gate
# → Comprehensive quality gate check

# 7. Check test coverage
/specweave:check-tests 0007
# → Validate all AC-IDs are tested

# 8. Close increment
/specweave:done 0007
# → PM validates and closes

# 9. Update living docs
/specweave:sync-docs update
# → Sync learnings to strategic docs
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

**Automatic sync**: When GitHub plugin enabled, `/specweave:do` and `/specweave:done` automatically sync to GitHub.

---

## Best Practices

### 1. Follow the Core Flow

Always use the standard workflow for best results:
1. `/specweave:increment` - Plan (START HERE)
2. `/specweave:do` - Implement (MAIN WORK)
3. `/specweave:progress` - Check status (VISIBILITY)
4. `/specweave:qa` - Validate quality (QUALITY GATE)
5. `/specweave:done` - Close (FINISH)
6. `/specweave:sync-docs` - Update docs (KEEP CURRENT)

### 2. Validate Early and Often

```bash
# Before starting work
/specweave:qa 0007 --pre

# Before closing
/specweave:qa 0007 --gate
```

### 3. Check Test Coverage

```bash
# Always validate tests before closing
/specweave:check-tests 0007
```

### 4. Keep Living Docs Current

```bash
# After completing increment
/specweave:sync-docs update
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

Understanding SpecWeave terminology (see [full glossary](/docs/glossary)):

- **[ADR](/docs/glossary/terms/adr)** - Architecture Decision Records
- **[RFC](/docs/glossary/terms/rfc)** - Request for Comments (specification format)
- **[API](/docs/glossary/terms/api)** - Application Programming Interface
- **[E2E](/docs/glossary/terms/e2e)** - End-to-End Testing
- **[Node.js](/docs/glossary/terms/nodejs)** - JavaScript runtime
- **[REST](/docs/glossary/terms/rest)** - RESTful API pattern
- **[GraphQL](/docs/glossary/terms/graphql)** - Query language for APIs
- **[Microservices](/docs/glossary/terms/microservices)** - Distributed architecture pattern
- **[IaC](/docs/glossary/terms/iac)** - Infrastructure as Code

**SpecWeave-Specific Terms**:
- **[Increments](/docs/glossary/terms/increments)** - Work units in SpecWeave
- **[spec.md](/docs/glossary/terms/spec-md)** - Specification file format
- **[plan.md](/docs/glossary/terms/plan-md)** - Architecture plan format
- **[tasks.md](/docs/glossary/terms/tasks-md)** - Task tracking format
- **[PM Agent](/docs/glossary/terms/pm-agent)** - Product Manager agent
- **[Architect Agent](/docs/glossary/terms/architect-agent)** - System design agent
- **[Quality Gate](/docs/glossary/terms/quality-gate)** - Validation checkpoints
- **[WIP Limits](/docs/glossary/terms/wip-limits)** - Work-in-progress limits

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
