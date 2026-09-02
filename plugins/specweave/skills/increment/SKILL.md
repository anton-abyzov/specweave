---
description: Plan and create SpecWeave increments with PM and Architect agent collaboration. Use when starting new features, hotfixes, bugs, or any development work that needs specification and task breakdown. Creates spec.md, plan.md, tasks.md with proper AC-IDs and living docs integration.
version: 1.0.0
argument-hint: "<feature-description>"
model: opus
effort: xhigh
---

**Effort**: `xhigh` (Opus 4.7 default for planning). Use `--effort max` for unusually complex architecture, accepting the overthinking risk.

# Plan Product Increment

## Tool-Use Rationale

- **Read**: Load `.specweave/config.json`, existing increments, and referenced living docs to inform scope and AC-IDs.
- **Write**: Produce the four increment artifacts (`metadata.json`, `spec.md`, `plan.md`, `tasks.md`) inside the increment directory.
- **Edit**: Refine AC-IDs, user-story numbering, and task dependencies after the single-agent draft is complete.

## CRITICAL: Plan Mode Required (BLOCKING)

**You MUST be in plan mode before proceeding.** If not, call `EnterPlanMode` now and wait for confirmation before continuing to Step 0.

1. Call `EnterPlanMode` immediately
2. Wait for plan mode confirmation
3. Then proceed to Step 0

Increment planning produces specs, plans, and task breakdowns that require user review. Do not skip plan mode or defer it — the user must approve the plan before any implementation begins.

## Project Overrides

**Skill Memories**: If `.specweave/skill-memories/increment.md` exists, read and apply its learnings.

## Project Context

**Project Context**: If `.specweave/config.json` exists, read it for testing mode, TDD enforcement, and multi-project settings. Check for active increments in `.specweave/increments/*/metadata.json`.

**Self-contained increment planning for ANY user project after `specweave init`.**

## Workflow Overview

```
STEP 0:  Tech Stack Detection
STEP 1:  Pre-flight (TDD mode, multi-project, Deep Interview check)
STEP 2:  Project Context (resolve project/board)
STEP 3:  Create Increment (via Template API) ← folder + ID exist after this
STEP 3a: Deep Interview (if enabled) ← runs AFTER folder exists
STEP 4:  Direct Specification Writing (universal, CLI-first)
STEP 4a: Enhanced: Team-Based Delegation (optional, Claude Code only)
STEP 5:  Post-Creation Sync
STEP 6:  Execution Strategy Recommendation
```

**CRITICAL**: Step 3 (Create Increment) MUST run before Step 3a (Deep Interview).
The interview state file is written to `.specweave/state/interview-{increment-id}.json`,
and the enforcement guard looks for it by increment ID. If the interview runs before the
increment folder exists, the guard cannot find the state file and blocks spec.md writing.

**WIP (advisory, never blocking):** prefer finishing active increments before starting new ones; the CLI prints one info note when active increments exceed `limits.activeIncrements` (default 3, `0` = off) and never blocks.

## Step 0: Tech Stack Detection

Auto-detect from project files:

| File | Language |
|------|----------|
| package.json | TypeScript/JavaScript |
| requirements.txt | Python |
| go.mod | Go |
| Cargo.toml | Rust |
| pom.xml | Java |
| *.csproj | C#/.NET |

If detection fails, ask user.

## Step 1: Pre-flight Checks

```bash
# 1. Check TDD mode
jq -r '.testing.defaultTestMode // "TDD"' .specweave/config.json 2>/dev/null

# 2. Check multi-project config
specweave context projects 2>/dev/null

# 3. Check deep interview mode (note: interview itself runs at Step 3a, after increment exists)
DEEP_INTERVIEW=$(jq -r '.planning.deepInterview.enabled // false' .specweave/config.json 2>/dev/null)

# 4. Check WIP limits
find .specweave/increments -maxdepth 2 -name "metadata.json" -exec grep -l '"status":"active"' {} \; 2>/dev/null | wc -l
```

## Step 2: Project Context

```bash
# Get project/board values for spec.md
specweave context projects
```

Every US MUST have `**Project**:` field. For 2-level structures, also `**Board**:`.

## Step 3: Create Increment

### 3a. Determine Increment Location

**Determine where increments are stored:**

```bash
# Check umbrella mode
UMBRELLA_ENABLED=$(jq -r '.umbrella.enabled // false' .specweave/config.json 2>/dev/null)

if [ "$UMBRELLA_ENABLED" = "true" ]; then
  echo "UMBRELLA MODE: Increments go in UMBRELLA ROOT .specweave/increments/"
  echo "The **Project**: field in each user story controls sync routing to child repos."
  # List available child repos for context
  jq -r '.umbrella.childRepos[]? | "\(.name) (\(.path))"' .specweave/config.json 2>/dev/null
elif [ -d "repositories" ]; then
  echo "MULTI-REPO (no umbrella): Increments belong in EACH repo's .specweave/"
  ORG=$(jq -r '.repository.organization // empty' .specweave/config.json 2>/dev/null)
  [ -z "$ORG" ] && ORG=$(ls -d repositories/*/ 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  echo "Organization: $ORG"
  ls -d repositories/*/* 2>/dev/null | head -20
else
  echo "WORKSPACE: Use .specweave/increments/"
fi
```

**Umbrella mode (`umbrella.enabled: true`):**
- ALL increments go in the umbrella root `.specweave/increments/` — NOT in child repos
- The `**Project**:` field in each user story controls which repo receives sync (GitHub issues, JIRA tickets)
- Cross-cutting increments can span multiple child repos — each US targets a different project
- Repos MUST be at `repositories/{ORG}/{repo-name}/` — NEVER directly under `repositories/`

**Non-umbrella multi-repo (legacy):**
- Each repository has its OWN `.specweave/increments/` directory
- Run `specweave init` in each repo if `.specweave/` doesn't exist

### 3b. Create Increment

```bash
specweave create-increment --auto-id --name "your-feature-name" --title "Feature Title" --description "Brief description" --project "my-app"
```

This atomically reserves the next available ID and creates the increment directory in a single operation, preventing race conditions when multiple agents create increments concurrently.

**Optional flags**: `--type hotfix` | `--priority P1` | `--board "team-name"` | `--json`

For diagnostic purposes, `specweave next-id` is available to preview the next number.

### 3c. Create manually (if CLI unavailable)

```bash
mkdir -p .specweave/increments/XXXX-name
```

Create files in order: metadata.json FIRST, then spec.md, plan.md, tasks.md.

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--regenerate-plan` | Regenerate `plan.md` and `tasks.md` for an existing increment without re-running the PM interview. Useful when architecture changes after spec is finalized. Supersedes the deprecated standalone `sw:plan` skill. | false |

Example:

```bash
sw:increment --regenerate-plan 0014-checkout-flow
```

## Quick Reference

### Increment Types

| Type | Use When | WIP Limit |
|------|----------|-----------|
| **feature** | New functionality | Max 2 |
| **hotfix** | Production broken | Unlimited |
| **bug** | Needs RCA | Unlimited |
| **change-request** | Business changes | Max 2 |
| **refactor** | Technical debt | Max 1 |
| **experiment** | POC/spike | Unlimited |

### Directory Structure

```
.specweave/increments/####-name/
├── metadata.json  # REQUIRED - create FIRST
├── spec.md        # REQUIRED - user stories, ACs
├── plan.md        # OPTIONAL - architecture
└── tasks.md       # REQUIRED - implementation
```

### User Story Format

```markdown
### US-001: Feature Name
**Project**: my-app    # <- REQUIRED! Get from: specweave context projects

**As a** [role]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria**:
- [ ] **AC-US1-01**: [Criterion 1]
- [ ] **AC-US1-02**: [Criterion 2]
```

## Critical Rules

1. **NEVER write spec.md/plan.md/tasks.md directly** when TeamCreate is available — delegate via TeamCreate + team-scoped Agent() calls; write spec files directly only as fallback
2. **Project field is MANDATORY** — Every US MUST have `**Project**:` field
3. **Use Template Creator CLI** (REQUIRED): `specweave create-increment --auto-id --name "name" --title "Title" --description "Desc" --project "my-app"`
4. **Team-based delegation is the preferred path** when TeamCreate is available — but direct spec writing is the universal default that works with ALL AI tools
5. **Increment naming** — Format: `####-descriptive-kebab-case`
6. **Umbrella mode** — When `umbrella.enabled: true`, ALL increments go in the umbrella root `.specweave/increments/`. The `**Project**:` field per user story routes sync to child repos. Do NOT create increments in child repos.

## Step 3a: Deep Interview Mode (if enabled)

**IMPORTANT**: This step runs AFTER the increment folder is created (Step 3), so the
interview state file can reference the real increment ID.

**If deep interview is enabled, delegate to PM subagent (if Agent tool available) or conduct inline:**

```typescript
Agent({ subagent_type: "sw:sw-pm", prompt: "Deep interview for increment XXXX-name: <user description>. Increment path: <path>", description: "PM deep interview" })
```

The PM agent will:
1. Assess complexity and determine question count (trivial: 0-3, small: 4-8, medium: 9-18, large: 19-40)
2. Interview the user across relevant categories
3. Write interview state to `.specweave/state/interview-{increment-id}.json`
4. Return interview summary for spec.md creation

**After PM agent returns**, read the interview state file to confirm all categories are covered
before proceeding to spec.md creation (especially when `enforcement: "strict"`).

## Step 4: Single-Agent Planning (DEFAULT — 0669 AC-US4-01, AC-US4-02)

**Default path: one agent writes spec.md + plan.md + tasks.md + rubric.md sequentially.**

This is now the default for ALL increments — no fan-out, no team-creation overhead, faster planning for the typical small-to-medium increment. It works with Claude Code, Cursor, OpenCode, Copilot, Aider, and any other AI tool.

1. Create the increment: `specweave create-increment --auto-id --name "feature-name" --title "Title" --description "Desc" --project "my-app"`
   - Add `--parallel` to opt into 3-agent fan-out planning (see Step 4a).
2. Write `spec.md` with user stories and acceptance criteria (use the User Story Format above)
3. Write `plan.md` with architecture decisions and ADR references (must contain `## Design` and `## Rationale` headings)
4. Write `tasks.md` with BDD test plans (Given/When/Then) for each AC (`### T-NN` entries)
5. Write `rubric.md` with the per-increment quality contract (`## Quality Contract` heading)
6. Run: `specweave sync-living-docs {increment-id}`

Proceed to Step 5 after writing all files.

**Parity contract (enforced by `tests/integration/increment-single-agent-parity.test.ts`):** single-agent output MUST match the top-level structure of the 3-agent path — `spec.md` with an `Acceptance Criteria` section and `AC-US*-NN` IDs, `plan.md` with `Design` and `Rationale` headings, `tasks.md` with `### T-NN` tasks, and `rubric.md` with a `Quality Contract` heading.

### Step 4a: Opt-In — Team-Based 3-Agent Fan-Out (Parallel Planning)

**Use the 3-agent fan-out ONLY when one of these gates fires:**

1. **Explicit flag** — user invoked with `--parallel` (maps to `parallel: true` on the create-increment options).
2. **Large scope** — user-story count is ≥ 10 in the feature description or an existing draft.
3. **Keyword trigger** — the feature description contains any of: `parallel`, `team lead`, `fan out`.

If NONE of these fire, STOP — use Step 4 (single-agent) instead. Do not spawn a planning team for small/medium increments by default.

**When the gate fires and TeamCreate is available**, use team-based delegation for better quality. This provides isolated context, persistent memory, resumability, auto-compaction, and tmux pane visibility for each agent.

**Team lifecycle:**
1. `TeamCreate({ team_name: "plan-XXXX-name", description: "Planning: <feature>" })`
2. Spawn agents with `team_name` parameter (PM + Architect in parallel, then Planner)
3. After all complete: `SendMessage({ type: "shutdown_request", recipient: "<agent>" })` for each
4. `TeamDelete()`
5. **Kill orphaned panes** — `SendMessage` shutdown does NOT close tmux panes:
   ```bash
   if command -v tmux >/dev/null 2>&1; then
     CURRENT_PANE=$(tmux display-message -p '#{pane_id}' 2>/dev/null || echo "")
     for pane_id in $(tmux list-panes -a -F '#{pane_id}' 2>/dev/null); do
       [ -n "$CURRENT_PANE" ] && [ "$pane_id" = "$CURRENT_PANE" ] && continue
       if tmux capture-pane -t "$pane_id" -p -S -50 2>/dev/null | grep -q "Resume this session"; then
         tmux kill-pane -t "$pane_id" 2>/dev/null
       fi
     done
   fi
   ```

**Agents to spawn:**

| File | Agent | Invocation |
|------|-------|------------|
| spec.md | sw:sw-pm | `Agent({ team_name: "plan-XXXX-name", name: "pm", subagent_type: "sw:sw-pm", mode: "bypassPermissions", prompt: "...", description: "PM writes spec.md" })` |
| plan.md | sw:sw-architect | `Agent({ team_name: "plan-XXXX-name", name: "architect", subagent_type: "sw:sw-architect", mode: "bypassPermissions", prompt: "...", description: "Architect writes plan.md" })` |
| tasks.md | sw:sw-planner | `Agent({ team_name: "plan-XXXX-name", name: "planner", subagent_type: "sw:sw-planner", mode: "bypassPermissions", prompt: "...", description: "Planner writes tasks.md" })` |

**DO NOT (when using team-based delegation):**
- Write user stories, architecture, or tasks inline
- Copy/paste spec content into Write() calls
- "Summarize" what an agent would produce
- Skip any of the 3 Agent() calls
- Use standalone Agent() without team_name for Phase 1/2 delegation — agents MUST be in a team for tmux visibility (exception: Deep Interview in Step 3a is standalone because it's interactive + sequential)
- Use Skill() for these — team agents provide memory + resumability + visibility

#### 4a-i. Create Planning Team (before spawning any agents)

**Cleanup first** — if you previously created a planning team in this session, shut down those agents before proceeding:
```typescript
// Only if a previous plan-* team exists from this session:
SendMessage({ type: "shutdown_request", recipient: "pm" })
SendMessage({ type: "shutdown_request", recipient: "architect" })
SendMessage({ type: "shutdown_request", recipient: "planner" })
TeamDelete()
```

Then create the new team:
```typescript
TeamCreate({ team_name: "plan-XXXX-name", description: "Planning: <feature description>" })
```

**team_name prefix `plan-*`** bypasses the increment-existence-guard (planning doesn't require an active increment).

#### 4a-ii. Spawn PM and Architect IN PARALLEL

PM and Architect run concurrently in separate tmux panes. Architect starts codebase exploration immediately while PM writes spec.md. Architect polls for spec.md and reads it once available, then produces plan.md.

**Spawn both agents in a single message (parallel tool calls):**

```typescript
// PM agent — writes spec.md
// For umbrella mode, include: "UMBRELLA MODE: Child repos: [repo1, repo2, ...]. Design cross-cutting stories — assign **Project**: to each US based on which repo owns that work."
Agent({ team_name: "plan-XXXX-name", name: "pm", subagent_type: "sw:sw-pm", mode: "bypassPermissions", prompt: "Write spec for increment XXXX-name: <description>. Increment path: .specweave/increments/XXXX-name/.", description: "PM writes spec.md" })

// Architect — spawned IN PARALLEL with PM
Agent({ team_name: "plan-XXXX-name", name: "architect", subagent_type: "sw:sw-architect", mode: "bypassPermissions", prompt: "Design architecture for increment XXXX-name. Increment path: .specweave/increments/XXXX-name/. ADR directory: .specweave/docs/internal/architecture/adr/. PARALLEL MODE: You are spawned in parallel with PM. Start by exploring the codebase and existing ADRs. spec.md may not exist yet — poll for it. Once spec.md is available and has content, read it and design architecture that satisfies all ACs.", description: "Architect writes plan.md" })
```

**IMPORTANT**: Use parallel Agent() tool calls — call PM and Architect in the SAME message so they start concurrently.

#### 4a-iii. Spawn Planner (after PM + Architect complete)
```typescript
Agent({ team_name: "plan-XXXX-name", name: "planner", subagent_type: "sw:sw-planner", mode: "bypassPermissions", prompt: "Generate tasks for increment XXXX-name. Read spec.md at .specweave/increments/XXXX-name/spec.md and plan.md at .specweave/increments/XXXX-name/plan.md", description: "Planner writes tasks.md" })
```

**Dependency order**: PM + Architect run in parallel (Phase 1) → Planner runs after both complete (Phase 2).
Architect explores the codebase while PM writes spec.md, then reads spec.md to produce plan.md.
Planner needs both spec.md AND plan.md, so it must wait for Phase 1 to finish.

#### 4a-iv. Team Cleanup (after Planner completes)

```typescript
SendMessage({ type: "shutdown_request", recipient: "pm" })
SendMessage({ type: "shutdown_request", recipient: "architect" })
SendMessage({ type: "shutdown_request", recipient: "planner" })
TeamDelete()
// If TeamDelete fails, wait 3 seconds and retry once (max 2 attempts)
```

## Step 5: Post-Creation Sync (MANDATORY)

After ALL delegation completes (PM + Architect + Planner), sync living docs AND external tools.
This MUST run — the template guard in `create-increment` skips sync because spec.md is empty at that point.
By now spec.md has real content, so this is the actual sync trigger.

```bash
specweave sync-living-docs {increment-id}
```

This command chains automatically to external tools (GitHub Issues, JIRA, ADO) via `syncToExternalTools()`.
No separate GitHub/JIRA/ADO sync call needed — it's all handled by `sync-living-docs`.

## Step 6: Execution Strategy Recommendation

After delegation completes, analyze the increment:

1. **Count tasks**: `grep -c '^\- \[ \]\|^### T-' tasks.md`
2. **Count domains** from spec.md user stories and plan.md architecture
3. **Classify**: Low (<=8 tasks, 1 domain) | Medium (9-15, 1-2 domains) | High (>15 OR 3+ domains)

**Show recommendation in output:**

```
EXECUTION STRATEGY
================================================
Tasks: [N] | Domains: [M] | Complexity: [Low/Medium/High]

  sw:do <id>         - Step-by-step, full control
  sw:auto <id>       - Autonomous sequential (unattended)
  sw:team-lead       - Parallel multi-agent (best quality for multi-domain, higher token cost)
```

See CLAUDE.md Execution Strategy section for the full decision matrix.

## Markdown Preview Guidelines

When presenting **scope or structure decisions** that have 2+ meaningful options, use `AskUserQuestion` with the `markdown` preview field to show tree diagrams (folder structures) or tables (AC coverage). This helps the user visually compare what each approach delivers.

**When to use**: Choosing between increment scopes (MVP vs full), folder structures, or comparing AC coverage across approaches.

**When NOT to use**: Simple type classification (feature vs bug), single-option confirmations, or questions without structural implications.

### Example 1: Scope Decision with AC Coverage Table

```
AskUserQuestion({
  questions: [{
    question: "Which scope should this increment cover?",
    header: "Scope",
    multiSelect: false,
    options: [
      {
        label: "MVP (Recommended)",
        description: "Core auth flow only. Ship fast, iterate in next increment.",
        markdown: "Task        AC Coverage      Stories\n──────────  ───────────────  ───────\nDB Schema   AC-US1-01        US-001\nJWT Utils   AC-US1-02        US-001\nLogin API   AC-US1-01,03     US-001\nAuth MW     AC-US2-01        US-002\n\nTotal: 4 tasks | 2 stories | 4 ACs covered"
      },
      {
        label: "Full Feature",
        description: "Auth + password reset + OAuth. More complete but 3x the work.",
        markdown: "Task          AC Coverage        Stories\n────────────  ─────────────────  ───────\nDB Schema     AC-US1-01          US-001\nJWT Utils     AC-US1-02          US-001\nLogin API     AC-US1-01,03       US-001\nAuth MW       AC-US2-01          US-002\nPwd Reset     AC-US3-01,02       US-003\nOAuth Flow    AC-US4-01,02,03    US-004\nE2E Tests     AC-US1-01..US4-03  All\n\nTotal: 7 tasks | 4 stories | 10 ACs covered"
      }
    ]
  }]
})
```

### Example 2: Structure Decision with Tree Preview

```
AskUserQuestion({
  questions: [{
    question: "Which folder structure should we use for this feature?",
    header: "Structure",
    multiSelect: false,
    options: [
      {
        label: "By Domain (Recommended)",
        description: "Group files by business domain. Better for feature isolation.",
        markdown: "src/\n├── auth/\n│   ├── api/\n│   │   ├── login.ts\n│   │   └── register.ts\n│   ├── middleware.ts\n│   └── jwt-utils.ts\n├── billing/\n│   ├── api/\n│   └── stripe-client.ts\n└── shared/\n    └── db.ts"
      },
      {
        label: "By Layer",
        description: "Group by technical layer. Familiar MVC-style structure.",
        markdown: "src/\n├── api/\n│   ├── auth.ts\n│   └── billing.ts\n├── middleware/\n│   └── auth.ts\n├── services/\n│   ├── jwt-utils.ts\n│   └── stripe-client.ts\n└── db/\n    └── client.ts"
      }
    ]
  }]
})
```

## Output

```
Created increment 0003-user-authentication

   Tech stack: TypeScript, NextJS, PostgreSQL
   Location: .specweave/increments/0003-user-authentication/

   Files: spec.md, plan.md, tasks.md, metadata.json

   Next: sw:do 0003 | sw:auto 0003 | sw:team-lead (see Execution Strategy)
```

## Error Handling

- `.specweave/` not found: "Run specweave init first"
- Vague description: Ask clarifying questions
- TeamCreate fails: Fall back to standalone Agent() calls without team_name (loses tmux panes but still works)
- Agent fails: Fall back to invoking `sw:pm` or `sw:architect` skills directly (skills still work standalone)

---

**This command is the main entry point for creating new work in SpecWeave.**

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#increment)
