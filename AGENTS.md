<!-- SW:META template="agents" version="1.0.326" sections="rules,orchestration,principles,commands,nonclaudetools,syncworkflow,contextloading,structure,agents,skills,taskformat,usformat,workflows,troubleshooting,docs" -->

<!-- SW:SECTION:rules version="1.0.326" -->
## Essential Rules

```
1. NEVER pollute project root with .md files
2. Increment IDs unique (0001-9999)
3. ONLY 4 files in increment root: metadata.json, spec.md, plan.md, tasks.md
4. ALL reports/scripts/logs → increment subfolders (NEVER at root!)
5. metadata.json MUST exist BEFORE spec.md can be created
6. tasks.md + spec.md = SOURCE OF TRUTH (update after every task!)
7. EVERY User Story MUST have **Project**: field
8. For 2-level structures: EVERY US also needs **Board**: field
```

### Increment Folder Structure

```
.specweave/increments/0001-feature/
├── metadata.json                  # REQUIRED - create FIRST
├── spec.md                        # WHAT & WHY
├── plan.md                        # HOW (optional)
├── tasks.md                       # Task checklist
├── reports/                       # ALL other .md files go here!
├── scripts/                       # Helper scripts
└── logs/                          # Execution logs
    └── 2026-01-04/
```
<!-- SW:END:rules -->

<!-- SW:SECTION:orchestration version="1.0.326" -->
## Workflow Orchestration

### 1. Plan Before Code

BEFORE implementing ANY non-trivial task (3+ steps):
1. Create increment: spec.md (WHAT/WHY) + plan.md (HOW) + tasks.md (checklist)
2. Get user approval before implementing
3. If something goes sideways → STOP and re-plan

See **Task Format** and **User Story Format** sections for templates.

### 2. Verify Before Done

Never mark a task complete without proving it works:
- Code compiles/builds successfully
- Tests pass
- Acceptance criteria actually satisfied

### 3. Dependencies First

Satisfy dependencies BEFORE dependent operations.

```
Bad:  node script.js → Error → npm run build
Good: npm run build → node script.js → Success
```
<!-- SW:END:orchestration -->

<!-- SW:SECTION:principles version="1.0.326" -->
## Core Principles (Quality)

### Root Causes
- Don't leave TODO comments for "later"
- Don't skip error handling because "it probably won't fail"
- Don't copy-paste without understanding
- Test edge cases, not just happy paths

### Minimal Impact
- Change only what's necessary for the task
- Don't refactor adjacent code unless asked
- Keep PRs focused and reviewable
- Preserve existing patterns unless improving them is the task

### DRY (Don't Repeat Yourself)
- Flag repetitions aggressively — duplicated logic, config, or patterns
- Extract shared code into reusable functions/modules
- If you see the same block twice, refactor before adding a third
- Applies to code, config, tests, and documentation alike
<!-- SW:END:principles -->

<!-- SW:SECTION:commands version="1.0.326" -->
## Commands Reference

| Command | Purpose |
|---------|---------|
| `sw:increment "name"` | Plan new feature |
| `sw:do` | Execute tasks from active increment |
| `sw:review 0001` | Adversarial review before closing |
| `sw:done 0001` | Close increment (needs a green `verify.json`) |
| `sw:sync` | Sync to GitHub / Jira / Azure DevOps |
| `sw:handoff` | Hand off to another tool or machine |
| `specweave status` | Show task completion status |
| `specweave verify 0001` | Run build/test/lint, write `reports/verify.json` |
| `specweave sync push 0001` | Push progress to the configured tracker(s) |

The per-provider `sw-github:` / `sw-jira:` / `sw-ado:` namespaces were removed in 2.0 — one `sw:sync` skill covers all three, and `specweave sync push --provider <name>` targets one.
<!-- SW:END:commands -->

<!-- SW:SECTION:nonclaudetools version="1.0.326" -->
## Non-Claude Tools (Cursor, Copilot, etc.)

Claude Code has automatic hooks and orchestration. Other tools must do these manually.

### Capability Comparison

| Capability | Claude Code | Non-Claude Tools |
|------------|-------------|------------------|
| **Plan Mode** | `EnterPlanMode` → `sw:increment` | Manual: create spec.md + tasks.md (plan.md only if Approach overflows) |
| **Subagents** | `Task` tool for parallel work | Split into multiple chat sessions |
| **Verification** | PostToolUse hooks auto-validate | Manual: Run tests, check ACs |
| **Hooks** | Auto-run on events | YOU must mimic (see below) |
| **Task sync** | Automatic AC updates | Manual: Edit tasks.md + spec.md |
| **Skills** | Auto-activate on keywords | Read SKILL.md, follow manually |

### Manual Hook Checklist

**After EVERY task completion:**
1. Update tasks.md: `[ ] pending` → `[x] completed`
2. Update spec.md ACs if satisfied: `[ ] AC` → `[x] AC`
3. Run `specweave sync push <id>` (syncs progress and living docs, then the tracker if one is configured)

**After all ACs for a User Story are done:**
- Run `specweave docs sync <id>`

**After increment completion:**
1. `specweave verify <id>`
2. `specweave sync push <id>` (syncs living docs and closes the tracker issue)

**Session start:**
1. `specweave jobs` (check background jobs)
2. `specweave status` (check current state)
3. `sw:do` (continue work)

**Background jobs**: Monitor with `specweave jobs` (clone-repos, import-issues, living-docs-builder, sync-external).
<!-- SW:END:nonclaudetools -->

## Hook Architecture

SpecWeave uses a CLI-first architecture. Only 2 hook event types are registered with Claude Code:

| Hook | Type | Purpose |
|------|------|---------|
| **PreToolUse** | Synchronous guard | Blocks illegal tool calls before execution (e.g., TDD enforcement, interview gates, shell injection prevention) |
| **UserPromptSubmit** | Context injection | Injects context (active increment, prompt health alerts, skill routing) before prompt processing |

All other events (SessionStart, PostToolUse, Stop, PreCompact) are **not registered as hooks**. They have been migrated to CLI commands (see Session Lifecycle below).

**Why only these two?** PreToolUse and UserPromptSubmit are the only events that require synchronous interception -- they must run *before* Claude Code acts. Everything else is a fire-and-forget side effect that works better as an explicit CLI call.

## Session Lifecycle

These CLI commands replace the former hook-based event handlers. Run them explicitly in your workflow.

### Session Start

```bash
specweave session start
```

Replaces the former SessionStart hook. Call at the beginning of each AI session. Performs:
- Clears stale auto-mode files (>24h)
- Resets context-pressure and prompt-health state
- Runs baseline prompt health check
- Cleans orphaned state files and stale plugin references

Use `--session-id <id>` to create an isolated per-session state directory.

### Session End

```bash
specweave session end
```

Replaces the former Stop hook (auto and sync sub-handlers). Call at the end of each AI session. Performs:
- Scans pending auto-mode tasks and logs progress (stop-auto)
- Deduplicates and flushes pending sync events (stop-sync)

### Sync Flush

```bash
specweave sync flush
```

Replaces the former PostToolUse event queue hook. Call after modifying increment files (tasks.md, spec.md). Reads pending events from the queue, deduplicates by increment ID, and writes to the sync log.

Use `--dry-run` to preview what would be flushed without clearing the queue.

### Analytics Push

```bash
specweave analytics-push --type <skill|agent> --name <name>
```

Replaces the former PostToolUse analytics hook. Call after skill or agent invocations to record usage events.

Examples:
```bash
specweave analytics-push --type skill --name sw:increment
specweave analytics-push --type agent --name general
```

### Session Compact

```bash
specweave session compact
```

Replaces the former PreCompact hook. Call when context compaction occurs to update context-pressure tracking.

## Available Subagent Types

SpecWeave uses specialized subagents for different phases of the increment workflow. These run in isolated contexts to keep the main agent's context clean.

| Subagent | Purpose | When to Use |
|----------|---------|-------------|
| `sw:sw-closer` | Runs the full `sw:done` closure pipeline in a fresh context | After `sw:team` completes, to keep closure out of a bloated context |

`sw-closer` is the only agent the plugin ships. The 1.x `sw-pm` / `sw-architect` /
`sw-planner` agents were folded into `sw:increment`, which writes spec.md (Problem,
Scope, ACs, Approach) and tasks.md in one pass. `sw:team`'s per-domain templates live in
`plugins/specweave/skills/team/agents/` and are not addressable as `sw:` agents.

Agent definitions live in `plugins/specweave/agents/`. The team-lead orchestrator spawns these automatically when needed.

<!-- SW:SECTION:syncworkflow version="1.0.326" -->
## Sync Workflow

### Source of Truth

| Level | Location | Update Method |
|-------|----------|---------------|
| **Source** | tasks.md + spec.md | Edit directly |
| **Derived** | .specweave/docs/internal/specs/ | `specweave docs sync` |
| **Mirror** | GitHub/Jira/ADO | `sw:sync` (or `specweave sync push`) |

**Update order**: ALWAYS tasks.md/spec.md FIRST, then `specweave sync push` (progress → living docs → external tools)

### Sync Commands

| Command | When to Run |
|---------|-------------|
| `specweave docs sync <id>` | After a user story completes (also runs inside `sync push`) |
| `specweave sync push <id>` | After each task, and on increment done |
| `specweave sync status` | When a push looks stuck (queue, breakers, gaps) |
<!-- SW:END:syncworkflow -->

<!-- SW:SECTION:contextloading version="1.0.326" -->
## Context Loading

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

<!-- SW:SECTION:structure version="1.0.326" -->
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

### Repository Structure

**Every workspace uses `repositories/` to organize code. Each repo has its own `.specweave/`:**

```
workspace/
├── .specweave/config.json          # Workspace config ONLY
├── repositories/
│   ├── org/frontend/
│   │   └── .specweave/increments/  # Frontend increments HERE
│   ├── org/backend/
│   │   └── .specweave/increments/  # Backend increments HERE
│   └── org/shared/
│       └── .specweave/increments/  # Shared increments HERE
```

**Rules**: Each repo manages its own increments. Never create increments in the workspace root.
<!-- SW:END:structure -->

<!-- SW:SECTION:agents version="1.0.326" -->
## Agents (Roles)

{AGENTS_SECTION}

**Usage**: Adopt role perspective when working on related tasks.
<!-- SW:END:agents -->

<!-- SW:SECTION:skills version="1.0.326" -->
## Skills (Capabilities)

{SKILLS_SECTION}

**Claude Code**: Skills auto-activate based on keywords in your prompt.

**Non-Claude Tools**: Skills don't auto-activate. Manually load them:
1. Find: `ls plugins/specweave*/skills/`
2. Read: `cat plugins/specweave/skills/<name>/SKILL.md`
3. Follow the workflow instructions inside
4. Run `specweave context projects` BEFORE creating any increment
<!-- SW:END:skills -->

<!-- SW:SECTION:taskformat version="1.0.326" -->
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

<!-- SW:SECTION:usformat version="1.0.326" -->
## User Story Format (CRITICAL for spec.md)

**MANDATORY: Every User Story MUST have `**Project**:` field!**

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

<!-- SW:SECTION:workflows version="1.0.326" -->
## Workflows

### Creating Increment
1. Run `specweave context projects` → store project IDs
2. `mkdir -p .specweave/increments/XXXX-feature`
3. Create `metadata.json` (MUST be FIRST)
4. Create `spec.md` — every US needs `**Project**:` field (see User Story Format)
5. Create `tasks.md` (task checklist with BDD tests)
6. Optional: `plan.md` for complex features

### Completing Tasks
1. Implement the task
2. Update tasks.md: `[ ] pending` → `[x] completed`
3. Update spec.md: check off satisfied ACs
4. Sync to external trackers if enabled

### Closing Increment
1. `sw:done 0001` — needs `reports/verify.json` with `ok: true` (or an explicit `--reason`)
2. Living docs synced automatically
3. GitHub/Jira issue closed if enabled
<!-- SW:END:workflows -->

<!-- SW:SECTION:troubleshooting version="1.0.326" -->
## Troubleshooting

| Issue | Fix |
|-------|-----|
| Commands not working (non-Claude) | Read `plugins/specweave/commands/<name>.md`, follow manually |
| GitHub/Jira not updating | `specweave sync status`, then `specweave sync push <id>` |
| .md files in project root | `mv *.md .specweave/increments/<current>/reports/` |
| Progress % wrong | Update tasks.md manually, then `specweave sync push <id>` |
| Tool crashes on start | Load only active increment's spec.md + tasks.md, not entire docs/ |
| Missing **Project**: field | `specweave context projects`, add `**Project**:` to every US |
| Skills not activating (non-Claude) | Expected — read SKILL.md from `plugins/specweave*/skills/` |
<!-- SW:END:troubleshooting -->

<!-- SW:SECTION:docs version="1.0.326" -->
## Documentation

| Resource | Purpose |
|----------|---------|
| CLAUDE.md | Quick reference (Claude Code) |
| AGENTS.md | This file (all AI tools) |
| spec-weave.com | Official documentation |
| .specweave/docs/ | Project-specific docs |
<!-- SW:END:docs -->
