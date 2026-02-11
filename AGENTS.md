<!-- SW:META template="agents" version="1.0.240" sections="index,quickstart,rules,orchestration,principles,commands,nonclaudetools,syncworkflow,contextloading,structure,agents,skills,taskformat,usformat,workflows,plugincommands,troubleshooting,docs" -->

<!-- SW:SECTION:index version="1.0.240" -->
## Section Index (Use Ctrl+F to Navigate)

| Section | Search For | Purpose |
|---------|------------|---------|
| Rules | `#essential-rules` | Critical rules, file organization |
| **Orchestration** | `#workflow-orchestration` | **Plan Mode, Subagents, Verification** |
| **Principles** | `#core-principles` | **Quality: Simplicity, No Laziness** |
| Commands | `#commands` | All SpecWeave commands |
| **Hooks** | `#non-claude-tools` | **CRITICAL: Hook behavior to mimic** |
| **User Story** | `#user-story-format` | **CRITICAL: Project/Board fields** |
| Sync | `#sync-workflow` | When/how to sync |
| Context | `#context-loading` | Token savings (70%+) |
| Troubleshoot | `#troubleshooting` | Common issues |
<!-- SW:END:index -->

<!-- SW:SECTION:quickstart version="1.0.240" -->
## Quick Start

1. **Get Project Context FIRST**: `specweave context projects` (save the output!)
2. **Create Your First Increment**: `/sw:increment "your-feature"`
3. **Customize**: Edit spec.md - **EVERY User Story needs `**Project**:` field!**
4. **Execute**: `/sw:do` to start implementation
<!-- SW:END:quickstart -->

<!-- SW:SECTION:rules version="1.0.240" -->
## Essential Rules {#essential-rules}

```
1. NEVER pollute project root with .md files
2. Increment IDs unique (0001-9999)
3. ⛔ ONLY 4 files in increment root: metadata.json, spec.md, plan.md, tasks.md
4. ⛔ ALL reports/scripts/logs → increment subfolders (NEVER at root!)
5. metadata.json MUST exist BEFORE spec.md can be created
6. tasks.md + spec.md = SOURCE OF TRUTH (update after every task!)
7. ⛔ EVERY User Story MUST have **Project**: field
8. ⛔ For 2-level structures: EVERY US also needs **Board**: field
```

### ⛔ INCREMENT FOLDER CLEANLINESS (CRITICAL!)

**Increment folders MUST stay organized. NEVER create random files at increment root!**

| File Type | Correct Location |
|-----------|-----------------|
| Reports, summaries, analysis (*.md) | `reports/` |
| Validation/QA/completion reports | `reports/` |
| Auto-session summaries | `reports/` |
| Logs, execution output | `logs/{YYYY-MM-DD}/` |
| Helper scripts | `scripts/` |
| Domain docs | `docs/domain/` |

**File Organization**:
```
# ✅ CORRECT - clean increment structure
.specweave/increments/0001-feature/
├── metadata.json                  # REQUIRED - create FIRST
├── spec.md                        # WHAT & WHY
├── plan.md                        # HOW (optional)
├── tasks.md                       # Task checklist
├── reports/                       # ALL other .md files go here!
│   ├── validation-report.md
│   ├── completion-report.md
│   └── auto-session-summary.md
├── scripts/                       # Helper scripts
└── logs/                          # Execution logs
    └── 2026-01-04/

# ❌ WRONG - polluted increment folder!
.specweave/increments/0001-feature/
├── metadata.json
├── spec.md
├── tasks.md
├── completion-report.md          # WRONG! Move to reports/
├── auto-session-summary.md       # WRONG! Move to reports/
└── some-analysis.md              # WRONG! Move to reports/
```
<!-- SW:END:rules -->

<!-- SW:SECTION:orchestration version="1.0.240" -->
## Workflow Orchestration {#workflow-orchestration}

**Claude Code has built-in orchestration features. Non-Claude tools must implement these manually.**

### 1. Plan Mode Default (Use SpecWeave Increments!)

**Claude Code**: Has `EnterPlanMode` tool → triggers `/sw:increment` workflow automatically.

**Non-Claude Tools - Use SpecWeave Increment Structure:**
```
BEFORE implementing ANY non-trivial task (3+ steps):

1. STOP - Don't start coding immediately
2. Create increment folder: `.specweave/increments/XXXX-feature/`
3. Create the 3 required files:
   - spec.md   → WHAT & WHY (user stories, acceptance criteria)
   - plan.md   → HOW (architecture, approach, risks)
   - tasks.md  → Task checklist with test plans
4. GET USER APPROVAL before implementing

If something goes sideways during implementation:
→ STOP and re-plan (don't keep pushing)
→ Update spec.md/plan.md with revised approach
→ Get approval again if scope changed
```

**SpecWeave Planning Files:**

**spec.md** (WHAT & WHY):
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
---

### US-001: User Story Title
**Project**: my-app              # ← MANDATORY! Get from: specweave context projects

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Criterion 1]
- [ ] **AC-US1-02**: [Criterion 2]
```

**plan.md** (HOW):
```markdown
# Plan: Feature Name

## Approach
[High-level architecture/approach]

## Risks & Decisions
- [ ] Decision: [question needing user input]
- Risk: [potential issue and mitigation]
```

**tasks.md** (Checklist):
```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

**Test Plan** (BDD):
- Given [context] → When [action] → Then [result]
```

### 2. Subagent Strategy (Parallel Execution)

**Claude Code**: Can spawn subagents with `Task` tool for parallel work.

**Non-Claude Tools - Manual Parallelization:**
```
For large exploration/analysis tasks:

Option A: Sequential Breakdown
1. Split work into independent chunks
2. Process one chunk at a time
3. Aggregate results

Option B: Parallel Prompts (Cursor/Copilot)
1. Open multiple chat sessions
2. Give each session one focused task
3. Combine outputs manually

Best practices:
- One task per "subagent" (focused execution)
- Keep analysis/exploration separate from implementation
- Use checklists to track parallel workstreams
```

**When to use parallel approach:**
- Codebase exploration (search multiple areas)
- Multi-file analysis (review patterns across modules)
- Batch validation (check multiple files for issues)
- Large-scale refactoring analysis

### 3. Verification Before Done

**Claude Code**: PostToolUse hooks validate completion automatically.

**Non-Claude Tools - Manual Verification Checklist:**
```
⛔ NEVER mark a task complete without proving it works!

Before marking ANY task as [x] completed:

□ Code compiles/builds successfully
□ Tests pass (run: npm test, pytest, etc.)
□ Manual verification performed (if applicable)
□ Acceptance criteria actually satisfied (re-read AC)
□ No console errors in browser (for frontend)
□ API returns expected responses (for backend)

Ask yourself: "Would a staff engineer approve this?"

If answer is NO → task is NOT complete
```

**Verification Commands by Stack:**
```bash
# JavaScript/TypeScript
npm run build && npm test

# Python
pytest && mypy .

# .NET
dotnet build && dotnet test

# General
git diff  # Review what actually changed
```

### 4. Think-Before-Act (Dependencies)

**Satisfy dependencies BEFORE dependent operations.**

```
❌ Wrong: node script.js → Error → npm run build
✅ Correct: npm run build → node script.js → Success

❌ Wrong: Import module → Error → Install package
✅ Correct: npm install package → Import module → Success
```

**Dependency Detection Questions:**
1. Does this require a build step first?
2. Are all imports/packages installed?
3. Does this depend on another file being created?
4. Is there a database migration needed?
5. Are environment variables configured?
<!-- SW:END:orchestration -->

<!-- SW:SECTION:principles version="1.0.240" -->
## Core Principles (Quality) {#core-principles}

### Simplicity First
- Write the simplest code that solves the problem
- Avoid over-engineering and premature optimization
- One function = one responsibility
- If you can delete code and tests still pass, delete it

### No Laziness
- Don't leave TODO comments for "later"
- Don't skip error handling because "it probably won't fail"
- Don't copy-paste without understanding
- Test edge cases, not just happy paths

### Minimal Impact
- Change only what's necessary for the task
- Don't refactor adjacent code unless asked
- Keep PRs focused and reviewable
- Preserve existing patterns unless improving them is the task

### Demand Elegance (Balanced)
- Code should be readable by humans first
- Names should reveal intent
- BUT: Don't over-abstract for hypothetical futures
- Pragmatic > Perfect
<!-- SW:END:principles -->

<!-- SW:SECTION:commands version="1.0.240" -->
## Commands Reference {#commands}

### Core Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "name"` | Plan new feature (PM-led) |
| `/sw:do` | Execute tasks from active increment |
| `/sw:done 0001` | Close increment (validates gates) |
| `/sw:progress` | Show task completion status |
| `/sw:validate 0001` | Quality check before closing |
| `/sw:sync-tasks` | Sync tasks.md with reality |
| `/sw:sync-docs update` | Sync to living docs |

### Plugin Commands (when installed)

| Command | Purpose |
|---------|---------|
| `/sw-github:sync 0001` | Sync increment to GitHub issue |
| `/sw-jira:sync 0001` | Sync to Jira |
| `/sw-ado:sync 0001` | Sync to Azure DevOps |
<!-- SW:END:commands -->

<!-- SW:SECTION:nonclaudetools version="1.0.240" -->
## Non-Claude Tools (Cursor, Copilot, etc.) {#non-claude-tools}

**CRITICAL**: Claude Code has automatic hooks and orchestration. Other tools DO NOT.

> **See also**: [Workflow Orchestration](#workflow-orchestration) for Plan Mode, Subagent Strategy, and Verification protocols.

### Built-in vs Manual - Complete Comparison

| Capability | Claude Code | Non-Claude Tools |
|------------|-------------|------------------|
| **Plan Mode** | `EnterPlanMode` → `/sw:increment` | Manual: Create spec.md + plan.md + tasks.md |
| **Subagents** | `Task` tool spawns parallel agents | Manual: Split work, parallel prompts |
| **Verification** | PostToolUse hooks validate | Manual: Run tests, check AC checklist |
| **Hooks** | Auto-run on events | YOU must mimic (see below) |
| **Task sync** | Automatic AC updates | Manual: Edit tasks.md + spec.md |
| **Commands** | Slash syntax works | Read command .md, follow manually |
| **Skills** | Auto-activate on keywords | Read SKILL.md, follow workflow |

### Latest Features

SpecWeave v0.28+ introduces powerful automation that **works differently** in non-Claude tools:

| Feature | Claude Code | Non-Claude Tools |
|---------|-------------|------------------|
| **Living Docs Builder** | Auto-runs after init | Use `specweave jobs --follow` to monitor |
| **Bidirectional Sync** | Pull sync on session start | Run `/sw:sync-pull` manually |
| **Background Jobs** | Automatic with hooks | Monitor with `specweave jobs` CLI |
| **EDA Hooks** | Auto-detect task completion | Manually update tasks.md + spec.md |

### Background Jobs Workflow 
SpecWeave now runs heavy operations as **background jobs**:

```bash
# Monitor all jobs
specweave jobs

# Follow a specific job
specweave jobs --follow <job-id>

# View job logs
specweave jobs --logs <job-id>

# Pause/resume long-running jobs
specweave jobs --kill <job-id>    # Pauses gracefully
specweave jobs --resume <job-id>  # Resumes from checkpoint
```

**Job Types**:
- `clone-repos` - Clone multiple repositories (ADO/GitHub)
- `import-issues` - Import work items from external tools
- `living-docs-builder` - Generate documentation from codebase (NEW!)
- `sync-external` - Bidirectional sync with external tools

**Job Dependencies**: The `living-docs-builder` waits for `clone-repos` and `import-issues` to complete before starting. This is automatic - just monitor with `specweave jobs`.

### Code-First Approach (MANDATORY for Non-Claude Tools)

> **Engineering insight**: [Anthropic research](https://www.anthropic.com/engineering/code-execution-with-mcp) shows code execution achieves **98% token reduction** vs MCP tool calls.
>
> **For non-Claude tools, this is even MORE important** - MCP support varies, but `npx` works everywhere!

**Rule**: Always prefer direct code execution over MCP:

```bash
# ❌ DON'T: Use Playwright MCP for testing
# ✅ DO: Write Playwright tests and run with npx
npx playwright test

# ❌ DON'T: Use Kafka MCP for messaging
# ✅ DO: Write kafkajs code
import { Kafka } from 'kafkajs';
const kafka = new Kafka({ brokers: ['localhost:9092'] });

# ❌ DON'T: Chain multiple MCP tool calls
# ✅ DO: Write a script that does all the work
npx ts-node scripts/process-data.ts
```

**Why code is better**:
| Aspect | MCP | Code (`npx`) |
|--------|-----|--------------|
| Token cost | High (tool defs + data duplication) | Low (only results) |
| Reusability | Ephemeral | Committed to git |
| CI/CD | Usually can't run | Native execution |
| Debugging | Limited | Full stack traces |
| Works with | Tools with MCP support | ANY tool |

**Pattern for non-Claude tools**:
```
1. AI writes code (test, script, automation)
2. You run: npx <command>
3. AI analyzes output
4. Repeat
```

This gives you the SAME experience as Claude Code with MCP, but deterministic and reusable!

### What's Different

| Feature | Claude Code | Cursor/Copilot |
|---------|-------------|----------------|
| Commands | Slash syntax works | Manual workflow |
| Hooks | Auto-run on events | **YOU must mimic** |
| Task sync | Automatic | Manual |
| GitHub/Jira sync | Automatic | Manual |
| Living docs | Auto-updated | Manual |

### Hook Behavior You Must Mimic

**Claude Code hooks do these automatically. YOU must do them manually:**

#### 1. After EVERY Task Completion
```bash
# Claude hook: PostTaskCompletion
# You must run these commands:

# Step 1: Update tasks.md (source of truth)
# Change: **Status**: [ ] pending → **Status**: [x] completed

# Step 2: Update spec.md ACs (if task satisfies any)
# Change: - [ ] AC-US1-01 → - [x] AC-US1-01

# Step 3: Sync to external tools (if configured)
/sw:sync-tasks
/sw-github:sync <increment-id>   # If GitHub enabled
/sw-jira:sync <increment-id>     # If Jira enabled
```

#### 2. After User Story Completion (all ACs satisfied)
```bash
# Claude hook: PostUserStoryCompletion
# When ALL acceptance criteria for a user story are [x] checked:

# Step 1: Sync to living docs
/sw:sync-docs update

# Step 2: Update GitHub/Jira issue status
/sw-github:sync <increment-id>
```

#### 3. After Increment Completion
```bash
# Claude hook: PostIncrementDone
# When running /sw:done:

# Step 1: Validate all tasks complete
/sw:validate <increment-id>

# Step 2: Sync living docs
/sw:sync-docs update

# Step 3: Close external issues
/sw-github:close-issue <increment-id>
```

#### 4. After Writing to spec.md or tasks.md
```bash
# Claude hook: PostToolUse (Write/Edit to spec/tasks files)
# After any edit to spec.md or tasks.md:

# Sync status line cache
/sw:sync-tasks

# If external tools configured, sync progress
/sw-github:sync <increment-id>
```

#### 5. Bidirectional Sync - PULL from External Tools
```bash
# Claude hook: SessionStart (runs automatically)
# For non-Claude tools, run manually to catch external changes:

# Pull changes from external tools (status, priority, assignee)
/sw:sync-pull

# This does:
# 1. Query ADO/JIRA/GitHub for items changed since last sync
# 2. Pull status/priority/assignee updates to living docs
# 3. Use timestamp-based conflict resolution (latest wins)
# 4. Log all changes with full audit trail

# When to run:
# - Start of each work session (catch overnight changes)
# - Before starting work on a linked increment
# - After PM updates status in external tool
```

#### 6. After Init on Brownfield Project
```bash
# SpecWeave automatically launches living-docs-builder job after init
# For non-Claude tools, monitor it manually:

# Check job status
specweave jobs

# Follow the living-docs-builder progress
specweave jobs --follow <job-id>

# The job runs in 6 phases:
# 1. waiting - Waits for clone/import jobs to complete
# 2. discovery - Scans codebase structure (no LLM, fast)
# 3. foundation - Generates overview.md, tech-stack.md (1-2 hours)
# 4. integration - Matches work items to discovered modules
# 5. deep-dive - Analyzes modules one at a time with checkpoints
# 6. suggestions - Generates SUGGESTIONS.md with next steps

# Output locations:
# - .specweave/docs/internal/architecture/overview.md
# - .specweave/docs/internal/architecture/tech-stack.md
# - .specweave/docs/internal/strategy/modules-skeleton.md
# - .specweave/docs/internal/SUGGESTIONS.md
```

### How to Check if External Tools Configured

```bash
# Check increment metadata for external tool config
cat .specweave/increments/<id>/metadata.json

# Look for these fields:
# "github": { "issue": 123 }     → GitHub enabled
# "jira": { "issue": "PROJ-123" } → Jira enabled
# "ado": { "item": 456 }          → Azure DevOps enabled
```

### Manual Command Execution

In non-Claude tools, commands are markdown workflows:

```bash
# Find and read command file
cat plugins/specweave/commands/increment.md
# Follow the workflow steps manually
```

### Quick Reference: After EVERY Task

```
┌─────────────────────────────────────────────────────────────┐
│ AFTER COMPLETING ANY TASK (MANDATORY FOR NON-CLAUDE TOOLS)  │
├─────────────────────────────────────────────────────────────┤
│ 1. Update tasks.md: [ ] → [x]                               │
│ 2. Update spec.md ACs if satisfied: [ ] → [x]               │
│ 3. Run: /sw:sync-tasks                               │
│ 4. Run: /sw-github:sync <id>  (if GitHub configured) │
│ 5. If all ACs for US done: /sw:sync-docs update      │
└─────────────────────────────────────────────────────────────┘
```

### Quick Reference: Session Start Routine 
```
┌─────────────────────────────────────────────────────────────┐
│ START OF EVERY SESSION (FOR NON-CLAUDE TOOLS)               │
├─────────────────────────────────────────────────────────────┤
│ 1. Pull external changes: /sw:sync-pull              │
│ 2. Check job status:      specweave jobs                    │
│ 3. Check progress:        /sw:progress               │
│ 4. Continue work:         /sw:do                     │
└─────────────────────────────────────────────────────────────┘
```

**Without these manual steps, your work won't be tracked!**
<!-- SW:END:nonclaudetools -->

<!-- SW:SECTION:syncworkflow version="1.0.240" -->
## Sync Workflow {#sync-workflow}

### Source of Truth Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ SOURCE OF TRUTH (edit here first!)                          │
│ ├── tasks.md: Task completion status                        │
│ └── spec.md: Acceptance criteria checkboxes                 │
├─────────────────────────────────────────────────────────────┤
│ DERIVED (auto-updated via sync commands)                    │
│ └── .specweave/docs/internal/specs/: Living documentation   │
├─────────────────────────────────────────────────────────────┤
│ MIRROR (synced to external tools)                           │
│ ├── GitHub Issues: Task checklist, AC progress              │
│ ├── Jira Stories: Status, story points, completion          │
│ └── Azure DevOps: Work item state, task list                │
└─────────────────────────────────────────────────────────────┘
```

**Update Order**: ALWAYS tasks.md/spec.md FIRST → sync-tasks → sync-docs → external tools

### Sync Commands Reference

| Command | What It Does | When to Run |
|---------|--------------|-------------|
| `/sw:sync-tasks` | Recalculates progress from tasks.md | After editing tasks.md |
| `/sw:sync-docs update` | Updates living docs from increment | After US complete |
| `/sw-github:sync <id>` | Syncs progress to GitHub issue | After each task |
| `/sw-github:close-issue <id>` | Closes GitHub issue | On increment done |
| `/sw-jira:sync <id>` | Syncs progress to Jira story | After each task |
| `/sw-ado:sync <id>` | Syncs to Azure DevOps work item | After each task |

### Complete Sync Flow (Non-Claude Tools)

```
TASK COMPLETED
     │
     ▼
┌─────────────────────────────┐
│ 1. Edit tasks.md            │
│    [ ] pending → [x] done   │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ 2. Edit spec.md ACs         │
│    [ ] AC → [x] AC          │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ 3. /sw:sync-tasks    │
│    Updates progress cache   │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────┐
│ 4. /sw-github:sync   │
│    Updates GitHub issue     │
└─────────────────────────────┘
     │
     ▼ (if all ACs for US done)
┌─────────────────────────────┐
│ 5. /sw:sync-docs     │
│    Updates living docs      │
└─────────────────────────────┘
```

### Claude Code Hooks (Automatic)

| Hook | Trigger | What It Does |
|------|---------|--------------|
| `UserPromptSubmit` | Every prompt | WIP limits, discipline checks |
| `PostToolUse` | File write/edit | Detects task completion, syncs |
| `PostTaskCompletion` | Task done | Updates GitHub/Jira progress |
| `PostIncrementDone` | Increment closed | Closes issues, syncs all docs |

**Non-Claude tools**: NO HOOKS EXIST. See "Hook Behavior You Must Mimic" section above.
<!-- SW:END:syncworkflow -->

<!-- SW:SECTION:contextloading version="1.0.240" -->
## Context Loading {#context-loading}

### Efficient Context Management

```
Read only what's needed for the current task:
- Active increment: spec.md, tasks.md (always)
- Supporting docs: only when referenced in tasks
- Living docs: load per-US when implementing
```

### Token-Efficient Approach

1. Start with increment's `tasks.md` - contains current task list
2. Reference `spec.md` for acceptance criteria
3. Load living docs only when needed for context
4. Avoid loading entire documentation trees
<!-- SW:END:contextloading -->

<!-- SW:SECTION:structure version="1.0.240" -->
## Project Structure

```
.specweave/
├── increments/           # Feature increments (0001-9999)
│   └── 0001-feature/
│       ├── metadata.json # Increment metadata - REQUIRED
│       ├── spec.md       # WHAT & WHY (user stories, ACs)
│       ├── plan.md       # HOW (architecture, APIs) - optional
│       └── tasks.md      # Task checklist with test plans
├── docs/internal/
│   ├── strategy/         # PRD, business requirements
│   ├── specs/            # Living docs (extracted user stories)
│   │   └── {project}/    # Per-project specs
│   ├── architecture/     # HLD, ADRs, technical design
│   └── delivery/         # CI/CD, deployment guides
└── state/                # Runtime state (active increment, caches)
```
<!-- SW:END:structure -->

<!-- SW:SECTION:agents version="1.0.240" -->
## Agents (Roles)

{AGENTS_SECTION}

**Usage**: Adopt role perspective when working on related tasks.
<!-- SW:END:agents -->

<!-- SW:SECTION:skills version="1.0.240" -->
## Skills (Capabilities)

{SKILLS_SECTION}

**Usage for Claude Code**: Skills auto-activate based on keywords in your prompt.

**Usage for Non-Claude Tools (Cursor, Copilot, etc.)**:
Skills don't auto-activate. You must manually load them:

```bash
# Step 1: Find relevant skill
ls plugins/specweave*/skills/

# Step 2: Read the skill file
cat plugins/specweave/skills/increment-planner/SKILL.md

# Step 3: Tell AI to follow the skill's workflow
"Follow the increment-planner skill workflow to create my feature"

# Step 4: AI reads skill content and follows instructions
```

**Skill Simulation Pattern**:
```
Non-Claude AI Tools simulate skills by:
1. Reading SKILL.md files from plugins/ folder
2. Following the workflow instructions inside
3. Using the patterns and templates provided
4. Running `npx` commands instead of MCP tools (code-first!)
```

**Example** - Creating increment with Cursor:
```
User: "Create an increment for user authentication"

# STEP 0: AI MUST run this first!
AI: [Runs: specweave context projects]
AI: [Gets output: {"level":1,"projects":[{"id":"my-app"}]}]
AI: [Stores: RESOLVED_PROJECT = "my-app"]

# Then follow the skill workflow
AI: [Reads plugins/specweave/skills/increment-planner/SKILL.md]
AI: [Follows PM workflow: research → spec → plan → tasks]
AI: [Creates .specweave/increments/0001-auth/spec.md with **Project**: my-app per US!]
```

**⛔ CRITICAL**: The AI MUST run `specweave context projects` BEFORE creating spec.md, and use the output values in every `**Project**:` field!
<!-- SW:END:skills -->

<!-- SW:SECTION:taskformat version="1.0.240" -->
## Task Format

```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending / [x] completed

**Test Plan** (BDD):
- Given [context] → When [action] → Then [result]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:usformat version="1.0.240" -->
## User Story Format (CRITICAL for spec.md) {#user-story-format}

**⛔ MANDATORY: Every User Story MUST have `**Project**:` field!**

```markdown
### US-001: Feature Name
**Project**: my-app          # ← MANDATORY! Get from: specweave context projects
**Board**: digital-ops       # ← MANDATORY for 2-level structures ONLY

**As a** user
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Criterion 1]
- [ ] **AC-US1-02**: [Criterion 2]
```

**How to get Project/Board values:**
```bash
# Run BEFORE creating any increment:
specweave context projects

# 1-level output (single project):
# {"level":1,"projects":[{"id":"my-app"}]}
# → Use: **Project**: my-app

# 2-level output (multi-project with boards):
# {"level":2,"projects":[...],"boardsByProject":{"corp":[{"id":"digital-ops"}]}}
# → Use: **Project**: corp AND **Board**: digital-ops
```
<!-- SW:END:usformat -->

<!-- SW:SECTION:workflows version="1.0.240" -->
## Workflows

### Creating Increment

**⛔ STEP 0: Get Project Context FIRST (BLOCKING!)**
```bash
# YOU CANNOT CREATE spec.md UNTIL YOU COMPLETE THIS STEP!
specweave context projects
# Store the output - you'll need project IDs for every User Story
```

**Main Steps:**
1. `mkdir -p .specweave/increments/0001-feature`
2. Create `metadata.json` (increment metadata) - **MUST be FIRST**
3. Create `spec.md` (WHAT/WHY, user stories, ACs) - **EVERY US needs `**Project**:` field!**
4. Create `tasks.md` (task checklist with tests)
5. Optional: Create `plan.md` (HOW, architecture) for complex features

**Example spec.md (CORRECT):**
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
---

### US-001: Login Form
**Project**: my-app              # ← Value from step 0!

**As a** user
**I want** to log in
**So that** I can access my account

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Login form displays username/password fields
```

**Example spec.md (WRONG - WILL FAIL!):**
```markdown
### US-001: Login Form
**As a** user                     # ← Missing **Project**: = BLOCKED!
**I want** to log in
```

### Completing Tasks
1. Implement the task
2. Update `tasks.md`: `[ ] pending` → `[x] completed`
3. Update `spec.md`: Check off satisfied ACs
4. Sync to external trackers if enabled

### Closing Increment
1. Run `/sw:done 0001`
2. PM validates 3 gates (tasks, tests, docs)
3. Living docs synced automatically
4. GitHub issue closed (if enabled)
<!-- SW:END:workflows -->

<!-- SW:SECTION:plugincommands version="1.0.240" -->
## Plugin Commands

| Command | Plugin |
|---------|--------|
| `/sw-github:sync` | GitHub sync |
| `/sw-jira:sync` | Jira sync |
| `/sw-ado:sync` | Azure DevOps |
<!-- SW:END:plugincommands -->

<!-- SW:SECTION:troubleshooting version="1.0.240" -->
## Troubleshooting {#troubleshooting}

### Commands Not Working

**Non-Claude tools**: Commands are markdown workflows, not slash syntax.

```bash
# Find and read the command file
ls plugins/specweave/commands/
cat plugins/specweave/commands/increment.md
# Follow the workflow steps manually
```

### Sync Issues

**Symptoms**: GitHub/Jira not updating, living docs stale

**Solution** (run after EVERY task in non-Claude tools):
```bash
/sw:sync-tasks                  # Update tasks.md
/sw:sync-docs update            # Sync living docs
/sw-github:sync <increment-id>  # Sync to GitHub
```

### Root Folder Polluted

**Symptoms**: `git status` shows .md files in project root

**Fix**:
```bash
CURRENT=$(ls -t .specweave/increments/ | head -1)
mv *.md .specweave/increments/$CURRENT/reports/
```

### Tasks Out of Sync

**Symptoms**: Progress shows wrong completion %

**Fix**: Update tasks.md manually:
```markdown
**Status**: [ ] pending  →  **Status**: [x] completed
```

Or run: `/sw:sync-tasks`

### Context Explosion / Crashes

**Symptoms**: Tool crashes 10-50s after start

**Causes**: Loading too many files at once

**Fix**:
1. Load only the active increment's spec.md and tasks.md
2. Reference living docs only when needed for specific tasks
3. Never load entire `.specweave/docs/` folder at once

### Increment Creation Fails / Missing **Project**: Field

**Symptoms**: Increment creation blocked, validation errors about missing `**Project**:` field

**Cause**: Every User Story in spec.md MUST have `**Project**:` (and `**Board**:` for 2-level structures)

**Fix**:
```bash
# 1. Get valid project IDs
specweave context projects

# 2. Add **Project**: to EVERY user story in spec.md
### US-001: Feature Name
**Project**: my-app        # ← Add this line!
**As a** user...

# 3. For 2-level structures, also add **Board**:
**Project**: corp
**Board**: digital-ops     # ← Add for 2-level!
```

**Why this happens**: Non-Claude tools don't have hooks that auto-detect project context. You MUST run `specweave context projects` BEFORE creating any increment and use those values in every User Story.

### Skills/Agents Not Activating

**Non-Claude tools**: Skills don't auto-activate. This is EXPECTED.

**Manual activation (Cursor, Copilot, Windsurf, etc.)**:
```bash
# 1. Find skills in plugins folder (NOT .claude/)
ls plugins/specweave*/skills/

# 2. Read the skill file
cat plugins/specweave/skills/e2e-playwright/SKILL.md

# 3. Tell AI to follow it
"Read the e2e-playwright skill and write tests for my login page"

# 4. AI writes code, YOU run it (code-first!)
npx playwright test
```

**Remember**: Non-Claude tools get SAME functionality by:
- Reading skill files manually
- Following the workflows inside
- Running `npx` instead of MCP tools (better anyway!)
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:docs version="1.0.240" -->
## Documentation

| Resource | Purpose |
|----------|---------|
| CLAUDE.md | Quick reference (Claude Code) |
| AGENTS.md | This file (non-Claude tools) |
| spec-weave.com | Official documentation |
| .specweave/docs/ | Project-specific docs |
<!-- SW:END:docs -->
