<!-- SW:META template="agents" version="1.0.231" sections="index,quickstart,rules,orchestration,principles,commands,nonclaudetools,syncworkflow,contextloading,structure,agents,skills,taskformat,usformat,workflows,plugincommands,troubleshooting,docs" -->

<!-- SW:SECTION:index version="1.0.231" -->
## Quick Navigation

| Section | Purpose |
|---|---|
| [Rules](#essential-rules) | File organization, increment structure |
| [Orchestration](#workflow-orchestration) | Plan mode, verification, dependencies |
| [Principles](#core-principles) | Quality standards |
| [Non-Claude Hooks](#non-claude-tools) | **CRITICAL: Hook behavior to simulate** |
| [User Story Format](#user-story-format) | **CRITICAL: Project/Board fields** |
| [Skills](#skills) | Loading and simulating SpecWeave plugins |
| [Sync](#sync-workflow) | Source of truth, sync commands |
<!-- SW:END:index -->

<!-- SW:SECTION:quickstart version="1.0.231" -->
## Quick Start

1. `specweave context projects` — save output (needed for every User Story)
2. `/sw:increment "your-feature"` — create increment
3. Edit spec.md — **every US needs `**Project**:` field**
4. `/sw:do` — implement
<!-- SW:END:quickstart -->

<!-- SW:SECTION:rules version="1.0.231" -->
## Essential Rules {#essential-rules}

1. NEVER pollute project root with .md files
2. Increment IDs unique (0001-9999)
3. ⛔ Only 4 files in increment root: `metadata.json`, `spec.md`, `plan.md`, `tasks.md`
4. ⛔ Reports/scripts/logs → subfolders (`reports/`, `scripts/`, `logs/`)
5. `metadata.json` MUST exist BEFORE `spec.md`
6. `tasks.md` + `spec.md` = SOURCE OF TRUTH (update after every task)
7. ⛔ Every User Story MUST have `**Project**:` field
8. ⛔ For 2-level structures: also needs `**Board**:` field

```
.specweave/increments/0001-feature/
├── metadata.json          # REQUIRED - create FIRST
├── spec.md                # WHAT & WHY
├── plan.md                # HOW (optional)
├── tasks.md               # Task checklist
├── reports/               # All other .md files go here
├── scripts/               # Helper scripts
└── logs/                  # Execution logs
```
<!-- SW:END:rules -->

<!-- SW:SECTION:orchestration version="1.0.231" -->
## Workflow Orchestration {#workflow-orchestration}

### 1. Plan Before Code

Before ANY non-trivial task (3+ steps):
1. Create increment: `.specweave/increments/XXXX-feature/`
2. Write `spec.md` (WHAT/WHY), `plan.md` (HOW), `tasks.md` (checklist)
3. Get user approval before implementing
4. If sideways → STOP, re-plan, get approval again

**spec.md template:**
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

**plan.md template:**
```markdown
# Plan: Feature Name

## Approach
[High-level architecture/approach]

## Risks & Decisions
- [ ] Decision: [question needing user input]
- Risk: [potential issue and mitigation]
```

**tasks.md template:**
```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01
**Status**: [ ] pending

**Test Plan** (BDD):
- Given [context] → When [action] → Then [result]
```

### 2. Verification Before Done

⛔ Never mark a task `[x]` without proving it works:
- Code builds and tests pass
- Acceptance criteria actually satisfied (re-read them)
- Ask: "Would a staff engineer approve this?"

### 3. Dependencies First

Build before run. Install before import. Migrate before query.
<!-- SW:END:orchestration -->

<!-- SW:SECTION:principles version="1.0.231" -->
## Core Principles {#core-principles}

- **Simplicity**: Simplest code that solves the problem. One function = one responsibility.
- **No laziness**: No TODO "for later". Test edge cases. Find root causes.
- **Minimal impact**: Change only what's necessary. Preserve existing patterns.
- **Pragmatic elegance**: Readable > clever. Don't over-abstract for hypothetical futures.
<!-- SW:END:principles -->

<!-- SW:SECTION:commands version="1.0.231" -->
## Commands {#commands}

| Command | Purpose |
|---|---|
| `/sw:increment "name"` | Plan feature (PM-led) |
| `/sw:do` | Execute tasks |
| `/sw:done 0001` | Close increment (validates gates) |
| `/sw:progress` | Show completion status |
| `/sw:validate` | Quality check |
| `/sw:sync-tasks` | Sync tasks.md with reality |
| `/sw:sync-docs update` | Sync to living docs |
| `/sw-github:sync 0001` | Sync to GitHub |
| `/sw-jira:sync 0001` | Sync to Jira |
| `/sw-ado:sync 0001` | Sync to Azure DevOps |
<!-- SW:END:commands -->

<!-- SW:SECTION:nonclaudetools version="1.0.231" -->
## Non-Claude Tools (Cursor, Copilot, Windsurf, etc.) {#non-claude-tools}

**Claude Code has automatic hooks and skill activation. Other tools DO NOT. You must simulate them.**

### What You Must Do Manually

| Feature | Claude Code (automatic) | Non-Claude (you do this) |
|---|---|---|
| Hooks | Auto on events | Simulate via checklists below |
| Task sync | Auto AC updates | Edit tasks.md + spec.md yourself |
| Skills | Auto-activate on keywords | Read SKILL.md, follow workflow |
| Commands | Slash syntax | Read command .md, follow steps |
| Plan Mode | `EnterPlanMode` tool | Create spec.md + plan.md + tasks.md manually |

### Plugin Access (CRITICAL)

Skills live in `plugins/` folder. If your project doesn't have them locally:

```bash
# Option 1: Copy from installed specweave
cp -r $(npm root -g)/specweave/plugins/ .specweave-plugins/

# Option 2: Clone specweave repo (shallow)
git clone --depth 1 https://github.com/anthropics/specweave.git /tmp/sw
cp -r /tmp/sw/plugins/ .specweave-plugins/

# Option 3: Already in project (monorepo/contributor)
# plugins/specweave*/skills/ — use directly
```

### Hook Simulation Checklists

**After EVERY task completion:**
1. `tasks.md`: `[ ] pending` → `[x] completed`
2. `spec.md`: Check off satisfied ACs (`[ ] AC-` → `[x] AC-`)
3. `/sw:sync-tasks`
4. `/sw-github:sync <id>` (if GitHub configured)
5. If all ACs for a US done → `/sw:sync-docs update`

**Session start:**
1. `/sw:sync-pull` (catch external changes)
2. `specweave jobs` (check background jobs)
3. `/sw:progress` (review status)
4. `/sw:do` (continue work)

**Increment completion:**
1. `/sw:validate <id>`
2. `/sw:sync-docs update`
3. `/sw-github:close-issue <id>` or `/sw-jira:close <id>`

### Skill Simulation

```bash
# 1. Find skills
ls plugins/specweave*/skills/

# 2. Read the skill
cat plugins/specweave/skills/pm/SKILL.md

# 3. Tell your AI to follow it
"Read plugins/specweave/skills/pm/SKILL.md and follow that workflow"
```

**Code-first rule**: Always prefer `npx` commands over MCP tools. Code is reusable, debuggable, and CI-compatible. Example: write Playwright tests and run `npx playwright test` instead of using a Playwright MCP.

### Background Jobs

Monitor: `specweave jobs` | Follow: `specweave jobs --follow <id>` | Kill: `specweave jobs --kill <id>`

Job types: `clone-repos`, `import-issues`, `living-docs-builder`, `sync-external`. The `living-docs-builder` auto-waits for clone/import to finish.

### Check External Tool Config

```bash
cat .specweave/increments/<id>/metadata.json
# Look for: "github": { "issue": 123 } | "jira": { "issue": "PROJ-123" } | "ado": { "item": 456 }
```
<!-- SW:END:nonclaudetools -->

<!-- SW:SECTION:syncworkflow version="1.0.231" -->
## Sync Workflow {#sync-workflow}

### Source of Truth

**Edit here** → `tasks.md` + `spec.md`
**Auto-derived** → `.specweave/docs/internal/specs/` (living docs)
**Mirror** → GitHub Issues / Jira Stories / ADO Work Items

**Update order**: tasks.md/spec.md FIRST → `/sw:sync-tasks` → `/sw:sync-docs` → external tools

| Command | When |
|---|---|
| `/sw:sync-tasks` | After editing tasks.md |
| `/sw:sync-docs update` | After US complete |
| `/sw-github:sync <id>` | After each task (if configured) |
| `/sw-jira:sync <id>` | After each task (if configured) |
| `/sw-ado:sync <id>` | After each task (if configured) |
<!-- SW:END:syncworkflow -->

<!-- SW:SECTION:contextloading version="1.0.231" -->
## Context Loading {#context-loading}

Load only what's needed: `tasks.md` + `spec.md` always. Living docs only when referenced. Never load entire `.specweave/docs/`.
<!-- SW:END:contextloading -->

<!-- SW:SECTION:structure version="1.0.231" -->
## Structure

```
.specweave/
├── increments/0001-feature/
│   ├── metadata.json       # REQUIRED first
│   ├── spec.md             # WHAT & WHY
│   ├── plan.md             # HOW (optional)
│   └── tasks.md            # Task checklist
├── docs/internal/
│   ├── strategy/           # PRD, requirements
│   ├── specs/{project}/    # Living docs
│   ├── architecture/       # HLD, ADRs
│   └── delivery/           # CI/CD guides
└── state/                  # Runtime state
```
<!-- SW:END:structure -->

<!-- SW:SECTION:agents version="1.0.231" -->
## Agents

{AGENTS_SECTION}

Adopt role perspective when working on related tasks.
<!-- SW:END:agents -->

<!-- SW:SECTION:skills version="1.0.231" -->
## Skills {#skills}

{SKILLS_SECTION}

**Claude Code**: Auto-activates on keywords. Invoke: `Skill({ skill: "sw:pm" })`

**Non-Claude Tools**: Read SKILL.md manually, follow workflow inside.

⛔ **BEFORE creating spec.md**: Run `specweave context projects` and use output in every `**Project**:` field.

```bash
# Key skills to know
# sw:pm              - Product manager (creates spec.md)
# sw:architect       - System architect (creates plan.md)
# sw:grill           - Code review before closure
# sw:tdd-orchestrator - TDD red-green-refactor
# sw-frontend:*      - React, Vue, Angular, Next.js
# sw-backend:*       - Node.js, .NET, Python
# sw-testing:*       - Unit, E2E, QA

# Find all available skills
ls plugins/specweave*/skills/
```
<!-- SW:END:skills -->

<!-- SW:SECTION:taskformat version="1.0.231" -->
## Task Format

```markdown
### T-001: Task Title
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [ ] pending
**Test**: Given [context] → When [action] → Then [result]
```
<!-- SW:END:taskformat -->

<!-- SW:SECTION:usformat version="1.0.231" -->
## User Story Format {#user-story-format}

⛔ Every User Story MUST have `**Project**:`. Get values from `specweave context projects`.

```markdown
### US-001: Feature Name
**Project**: my-app              # ← MANDATORY
**Board**: digital-ops           # ← Only for 2-level structures

**As a** user
**I want** [goal]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Criterion]
```

```bash
# 1-level: {"level":1,"projects":[{"id":"my-app"}]}
#   → **Project**: my-app
# 2-level: {"level":2,...,"boardsByProject":{"corp":[{"id":"digital-ops"}]}}
#   → **Project**: corp AND **Board**: digital-ops
```
<!-- SW:END:usformat -->

<!-- SW:SECTION:workflows version="1.0.231" -->
## Workflows

**Create increment**: `specweave context projects` → `mkdir` → `metadata.json` (FIRST) → `spec.md` (with `**Project**:` per US) → `tasks.md` → optional `plan.md`

**Complete task**: Implement → `tasks.md` `[x]` → `spec.md` ACs `[x]` → sync

**Close increment**: `/sw:done 0001` → validates gates → syncs docs → closes external issues
<!-- SW:END:workflows -->

<!-- SW:SECTION:plugincommands version="1.0.231" -->
<!-- Merged into Commands section -->
<!-- SW:END:plugincommands -->

<!-- SW:SECTION:troubleshooting version="1.0.231" -->
## Troubleshooting {#troubleshooting}

| Issue | Fix |
|---|---|
| Commands not working | Non-Claude: read `plugins/specweave/commands/*.md`, follow manually |
| Sync stale | `/sw:sync-tasks` → `/sw:sync-docs update` → `/sw-github:sync <id>` |
| Root polluted | `mv *.md .specweave/increments/$(ls -t .specweave/increments/ \| head -1)/reports/` |
| Progress wrong | Update tasks.md or `/sw:sync-tasks` |
| Context crashes | Load only active increment's spec.md + tasks.md. Never load entire docs/ |
| Missing **Project**: | Run `specweave context projects`, add to every US |
| Skills not activating | Expected for non-Claude. Read SKILL.md manually, tell AI to follow it |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:docs version="1.0.231" -->
## Docs

[spec-weave.com](https://spec-weave.com) | CLAUDE.md (Claude Code) | AGENTS.md (this file)
<!-- SW:END:docs -->
