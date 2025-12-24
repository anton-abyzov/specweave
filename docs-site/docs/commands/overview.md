---
sidebar_position: 1
---

# Commands Overview

SpecWeave provides slash commands for every stage of your development workflow. This page covers the **main workflow commands** you'll use daily.

:::warning No Shortcuts
All commands MUST use the `/sw:*` namespace prefix. Shortcuts like `/inc`, `/do`, `/pause`, `/resume` (without the namespace) conflict with Claude Code's native commands and other repositories.
:::

## The Core Workflow

```mermaid
graph LR
    A["/sw:increment"] --> B["/sw:do"]
    B --> C["/sw:progress"]
    C --> D["/sw:validate or /sw:qa"]
    D --> E["/sw:next"]
    E --> F["/sw:sync-docs"]
    F --> A

    style A fill:#a8e6cf
    style B fill:#ffd3b6
    style C fill:#a3d5ff
    style D fill:#ffaaa5
    style E fill:#ff8b94
    style F fill:#d4a5ff
```

**Pro tip**: Use `/sw:next` instead of `/sw:done` — it auto-closes and suggests next work!

## 1. Planning Commands

### `/sw:increment` - Create New Increment

**Most frequently used command** - Start every new feature here.

```bash
/sw:increment "User authentication with JWT"
/sw:increment "Payment processing with Stripe"
/sw:increment "Real-time notifications"
```

**What it does**:
- 🔍 Detects tech stack automatically
- 📋 [PM](/docs/glossary/terms/pm-agent)-led planning (market research, [spec.md](/docs/glossary/terms/spec-md), plan)
- ✅ Auto-generates [tasks.md](/docs/glossary/terms/tasks-md) from [plan](/docs/glossary/terms/plan-md)
- 🧪 Creates test strategy
- 👥 Strategic agent review ([Architect](/docs/glossary/terms/architect-agent), Security, [QA](/docs/glossary/terms/qa-lead-agent), [Tech Lead](/docs/glossary/terms/tech-lead-agent))

**See**: [ADR](/docs/glossary/terms/adr) (Architecture Decision Records) for design decisions made during planning.

**Reference**: [Command Decision Tree](/docs/reference/command-decision-tree) for workflow guidance.

---

## 2. Implementation Commands

### `/sw:do` - Execute Tasks

**Smart auto-resume** - Continue from where you left off.

```bash
/sw:do           # Auto-finds active increment
/sw:do 0007      # Specific increment
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

---

### `/sw:context` - Load Living Docs Context ⭐ NEW

**Load relevant context before implementing** - Uses progressive disclosure.

```bash
/sw:context authentication    # Load auth-related docs
/sw:context "payment flow"    # Load payment-related docs
/sw:context                   # Show available topics
```

**What it does**:
- 🔍 Searches living docs in `.specweave/docs/internal/`
- 📋 Loads relevant specs, ADRs, and architecture docs
- 💡 Injects context into current conversation
- 🎯 No RAG needed - uses Claude's native file reading

**Use cases**:
- Before implementing a feature (check existing patterns)
- When making architecture decisions (check existing ADRs)
- When onboarding (understand current system)

**How it works**:
```bash
# Internally runs:
grep -ril "auth" .specweave/docs/internal/
# Finds relevant files, reads them, synthesizes context
```

**See also**: [Who Benefits from Living Docs](/docs/guides/core-concepts/who-benefits-from-living-docs)

---

## 3. Quality Assurance Commands

### `/sw:validate` - Rule-Based Validation

**120+ checks** - Fast, free validation.

```bash
/sw:validate 0007
/sw:validate 0007 --quality        # Include AI assessment
/sw:validate 0007 --export         # Export suggestions to tasks.md
```

**What it validates**:
- ✅ Consistency (spec → plan → tasks)
- ✅ Completeness (all required sections)
- ✅ Quality (testable criteria, actionable tasks)
- ✅ Traceability ([AC-IDs](/docs/glossary/terms/ac-id), [ADR](/docs/glossary/terms/adr) references)

---

### `/sw:qa` - Quality Assessment with Risk Scoring

**Comprehensive [quality gate](/docs/glossary/terms/quality-gate)** - AI-powered assessment with quantitative risk scoring (Probability × Impact).

```bash
/sw:qa 0007                    # Quick mode (default)
/sw:qa 0007 --pre             # Before starting work
/sw:qa 0007 --gate            # Before closing increment
/sw:qa 0007 --export          # Export blockers to tasks.md
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

---

### `/sw:check-tests` - Test Coverage Check

```bash
/sw:check-tests 0007
```

**What it checks**:
- 📊 Per-task coverage (unit, integration, [E2E](/docs/glossary/terms/e2e))
- ✅ [AC-ID](/docs/glossary/terms/ac-id) coverage (all [acceptance criteria](/docs/glossary/terms/acceptance-criteria) tested)
- 🎯 Overall coverage vs target (80-90%)
- 📝 Missing tests and recommendations

---

## 4. Completion Commands

### `/sw:next` - Smart Workflow Transition

**The flow command** - Auto-close current work, suggest next.

```bash
/sw:next
```

**What it does**:
- 🔍 Validates current increment (3 gates: tasks, tests, docs)
- 🎯 Auto-closes if all gates pass
- 📊 Runs post-closure quality assessment
- 💡 Suggests next work (backlog or new feature)

**Why use `/sw:next` instead of `/sw:done`**:

| `/sw:done` | `/sw:next` |
|-------------------|-------------------|
| Closes increment | Closes AND suggests next |
| Requires increment ID | Auto-detects active increment |
| Manual next step | Intelligent recommendations |
| Single action | Complete workflow transition |

**Example**:
```
/sw:next

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
   Run: /sw:do 0008
```

---

### `/sw:done` - Close Increment

**[PM](/docs/glossary/terms/pm-agent) validation before closing** - Ensures [quality gates](/docs/glossary/terms/quality-gate) pass.

```bash
/sw:done 0007
```

**What it does**:
- ✅ Validates all tasks complete
- ✅ Runs `/sw:qa --gate` (quality gate check)
- ✅ PM agent validates completion
- ✅ Creates [completion report](/docs/glossary/terms/completion-report)
- 🔗 Closes GitHub issues (if plugin enabled)

---

### `/sw:sync-docs` - Synchronize Living Documentation

**[Strategic docs sync](/docs/glossary/terms/split-source-sync)** - Review before implementation, export learnings after.

```bash
/sw:sync-docs review          # Before implementation (review strategic docs)
/sw:sync-docs update          # After implementation (update with learnings)
```

**What it syncs**:
- 📚 [ADRs](/docs/glossary/terms/adr) (Proposed → Accepted)
- 🏗️ Architecture diagrams (planned → actual)
- 📖 [API](/docs/glossary/terms/api) documentation (contracts → endpoints)
- 📋 Feature lists (planned → completed)

---

## 5. Sync & Repository Commands

### `/sw:save` - Save Changes Across Repositories

**One command for git operations** - Works for single repos and multi-repo umbrella setups.

```bash
# Auto-generate commit message
/sw:save

# With explicit message
/sw:save "feat: Add user authentication"

# Dry run (preview)
/sw:save --dry-run
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

### `/sw:sync-specs` - Sync Specs to Living Docs

**Quick specs-only sync** - Updates user stories and features only.

```bash
/sw:sync-specs 0007
/sw:sync-specs --dry-run
```

**What it syncs**:
- User stories to `.specweave/docs/internal/specs/`
- Feature documentation
- Bidirectional task links

**When to use**: After making changes to spec.md and wanting quick sync.

---

### `/sw:sync-progress` - Sync to External Tools

**Full external sync** - Updates all connected platforms.

```bash
/sw:sync-progress
/sw:sync-progress 0007
```

**What it syncs**:
- Living docs (user stories, features)
- GitHub Issues (checkboxes, comments)
- JIRA (if configured)
- Azure DevOps (if configured)

---

### `/sw:validate-status` - Fix Status Line

**Validate and auto-fix status line desync**.

```bash
/sw:validate-status
```

**What it checks**:
- [ ] Task count matches frontmatter
- [ ] Cache matches tasks.md reality
- [ ] Percentage calculations correct

**When to use**: Status line shows wrong percentage, after manual edits, after git conflicts.

---

### `/sw:workflow` - Dashboard View

**Complete workflow navigator** - Shows phase, status, and next steps.

```bash
/sw:workflow
/sw:workflow 0007
```

**What it shows**:
- Current phase (Planning, Implementing, Review, etc.)
- Task and AC completion
- External tools status
- Living docs status
- Suggested next actions

---

## 6. Monitoring Commands

### `/sw:progress` - Check Increment Progress

```bash
/sw:progress
/sw:progress 0007
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
- `/sw:increment` - Plan new increment ⭐ **START HERE**
- `/sw:context` - Load living docs context ⭐ **CONTEXT** (NEW)
- `/sw:do` - Execute tasks ⭐ **MAIN WORK**
- `/sw:next` - Smart workflow transition ⭐ **FLOW COMMAND** (auto-close + suggest next)
- `/sw:progress` - Check status ⭐ **VISIBILITY**
- `/sw:validate` - Quick validation ⭐ **PRE-CHECK**
- `/sw:qa` - Quality assessment ⭐ **QUALITY GATE**
- `/sw:check-tests` - Test coverage check ⭐ **TEST VALIDATION**
- `/sw:done` - Close increment ⭐ **FINISH**
- `/sw:sync-docs` - Synchronize living docs ⭐ **KEEP DOCS CURRENT**
- `/sw:sync-specs` - Sync specs only ⭐ **QUICK SPEC SYNC**
- `/sw:sync-progress` - Sync to external tools ⭐ **EXTERNAL SYNC**
- `/sw:save` - Save & push to all repos ⭐ **MULTI-REPO GIT**
- `/sw:workflow` - Dashboard view ⭐ **NAVIGATION**

### State Management
- `/sw:pause` - Pause active increment
- `/sw:resume` - Resume paused/backlog increment
- `/sw:abandon` - Abandon incomplete increment
- `/sw:backlog` - Move increment to backlog
- `/sw:reopen` - Reopen completed increment

### Status & Monitoring
- `/sw:status` - Show all increments overview
- `/sw:jobs` - Show background jobs and increment status
- `/sw:sync-monitor` - Sync orchestration dashboard
- `/sw:sync-logs` - Query sync audit logs
- `/sw:notifications` - View sync notifications
- `/sw:sync-status` - Fix metadata/spec status desyncs
- `/sw:update-status` - Force-update status line cache

### TDD Workflow
- `/sw:tdd-red` - Write failing tests (TDD red phase)
- `/sw:tdd-green` - Make tests pass (TDD green phase)
- `/sw:tdd-refactor` - Refactor with test safety net
- `/sw:tdd-cycle` - Full TDD red-green-refactor cycle

### Brownfield & Documentation
- `/sw:discrepancies` - View code-to-spec discrepancies
- `/sw:discrepancy-to-increment` - Convert discrepancy to increment
- `/sw:import-docs` - Import brownfield documentation
- `/sw:import-external` - Import external work items
- `/sw:living-docs` - Launch Living Docs Builder
- `/sw:organize-docs` - Smart documentation organization
- `/sw:validate-features` - Validate feature folder consistency

### Archiving & Cleanup
- `/sw:archive` - Archive completed increments
- `/sw:restore` - Restore archived increments
- `/sw:archive-features` - Archive features/epics
- `/sw:restore-feature` - Restore features/epics
- `/sw:fix-duplicates` - Resolve duplicate increments

### Advanced Commands
- `/sw:judge-llm` - Ultrathink LLM-as-Judge validation
- `/sw:check-hooks` - Health check for hooks
- `/sw:embed-acs` - Embed ACs from living docs into spec.md
- `/sw:plan` - Generate plan.md using Architect Agent
- `/sw:translate` - Batch translation
- `/sw:migrate-config` - Migrate config format

### External Tool Sync (Git-Style)
- `/sw-github:pull` - Pull changes from GitHub ⭐ **GIT-STYLE**
- `/sw-github:push` - Push progress to GitHub ⭐ **GIT-STYLE**
- `/sw-github:sync` - Two-way sync with GitHub
- `/sw-github:create` - Create GitHub issue from increment
- `/sw-github:close` - Close GitHub issue when done
- `/sw-github:status` - Check GitHub sync status
- `/sw-ado:pull` - Pull changes from Azure DevOps ⭐ **GIT-STYLE**
- `/sw-ado:push` - Push progress to Azure DevOps ⭐ **GIT-STYLE**
- `/sw-ado:sync` - Two-way sync with Azure DevOps
- `/sw-jira:pull` - Pull changes from JIRA ⭐ **GIT-STYLE**
- `/sw-jira:push` - Push progress to JIRA ⭐ **GIT-STYLE**
- `/sw-jira:sync` - Two-way sync with JIRA

---

## Workflow Example: Standard Feature Development

```bash
# 1. Plan new feature
/sw:increment "User authentication"
# → Creates: spec.md, plan.md, tasks.md

# 2. Load context (recommended)
/sw:context authentication
# → Loads existing auth specs, ADRs, patterns

# 3. Review docs (optional)
/sw:sync-docs review
# → Review strategic docs before starting

# 4. Pre-check quality (optional)
/sw:qa 0007 --pre
# → Pre-implementation quality check

# 5. Implement tasks
/sw:do 0007
# → Auto-resumes from last task, hooks fire after each completion

# 5. Check progress
/sw:progress 0007
# → See completion status

# 6. Validate quality
/sw:qa 0007 --gate
# → Comprehensive quality gate check

# 7. Check test coverage
/sw:check-tests 0007
# → Validate all AC-IDs are tested

# 8. Close increment
/sw:done 0007
# → PM validates and closes

# 9. Update living docs
/sw:sync-docs update
# → Sync learnings to strategic docs
```

---

## Integration with External Tools

### Git-Style Commands (Recommended)

SpecWeave provides intuitive **git-style commands** for external tool synchronization:

| Platform | Pull | Push | Sync |
|----------|------|------|------|
| **GitHub** | `/sw-github:pull` | `/sw-github:push` | `/sw-github:sync` |
| **Azure DevOps** | `/sw-ado:pull` | `/sw-ado:push` | `/sw-ado:sync` |
| **JIRA** | `/sw-jira:pull` | `/sw-jira:push` | `/sw-jira:sync` |

### Basic Usage

```bash
# Pull latest changes from external tool
/sw-github:pull
/sw-ado:pull
/sw-jira:pull

# Push your progress to external tool
/sw-github:push
/sw-ado:push
/sw-jira:push

# Two-way sync (both directions)
/sw-github:sync 0007
/sw-ado:sync 0007
/sw-jira:sync 0007
```

### Multi-Project Sync Options

```bash
# Pull ALL specs across ALL projects (living docs sync)
/sw-github:pull --all
/sw-ado:pull --all
/sw-jira:pull --all

# Pull specific project only
/sw-ado:pull --project clinical-insights
/sw-jira:pull --project BACKEND

# Pull specific feature hierarchy
/sw-github:pull --feature FS-042
/sw-ado:pull --feature FS-042
```

### Sync Brief Output

After every sync operation, you'll see a compact summary:

```
┌─────────────────────────────────────────────────────────┐
│  PULL COMPLETE                                    ✓ ADO │
├─────────────────────────────────────────────────────────┤
│  Scanned: 47 specs across 3 projects                    │
│  Updated: 7 specs                                       │
│  Conflicts: 2 (resolved: external wins)                 │
├─────────────────────────────────────────────────────────┤
│  CHANGES APPLIED                                        │
│    ↓ Status changes:    4                               │
│    ↓ Priority changes:  2                               │
│    + Comments imported: 8                               │
└─────────────────────────────────────────────────────────┘
```

**Symbols**: `↓` = pulled (incoming), `↑` = pushed (outgoing), `✓` = success

### Other GitHub Commands

```bash
# Create GitHub issue from increment
/sw-github:create 0007

# Check sync status
/sw-github:status 0007

# Close GitHub issue when done
/sw-github:close 0007
```

### Other Azure DevOps Commands

```bash
# Create ADO work item from increment
/sw-ado:create 0007

# Check sync status
/sw-ado:status 0007

# Close work item when done
/sw-ado:close 0007
```

**Automatic sync**: When external tool plugins are enabled, `/sw:do` and `/sw:done` automatically sync to the configured platforms.

---

## Best Practices

### 1. Follow the Core Flow

Always use the standard workflow for best results:
1. `/sw:increment` - Plan (START HERE)
2. `/sw:do` - Implement (MAIN WORK)
3. `/sw:progress` - Check status (VISIBILITY)
4. `/sw:qa` - Validate quality (QUALITY GATE)
5. `/sw:done` - Close (FINISH)
6. `/sw:sync-docs` - Update docs (KEEP CURRENT)

### 2. Validate Early and Often

```bash
# Before starting work
/sw:qa 0007 --pre

# Before closing
/sw:qa 0007 --gate
```

### 3. Check Test Coverage

```bash
# Always validate tests before closing
/sw:check-tests 0007
```

### 4. Keep Living Docs Current

```bash
# After completing increment
/sw:sync-docs update
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
