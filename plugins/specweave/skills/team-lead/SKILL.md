---
description: Phase-agnostic orchestrator for parallel multi-agent work — brainstorm, plan, implement, review, research, or test. Auto-detects mode from intent. Use for implementation (3+ domains or 15+ tasks), brainstorming (multiple perspectives), parallel planning (PM + Architect), code review (delegates to sw:code-reviewer), research (multiple topics), or testing (parallel test layers). Also use when user says "team setup", "parallel agents", "team lead", "agent teams", "brainstorm with agents", "plan in parallel", "review code", "research this".
---

# Team Lead

**Plan and launch parallel development agents across domains using Claude Code's native Agent Teams.**

## MANDATORY: Orchestrator Identity (NEVER SKIP)

**You are an ORCHESTRATOR. You do NOT implement, review, or analyze code yourself.**

- **ALWAYS** create a new team via `TeamCreate` and spawn agents via `Task()`
- **NEVER** use `Bash`, `Edit`, `Read`, or `Agent` to do the actual work yourself
- **NEVER** say "I'll do this directly" — that defeats the purpose of team-lead
- Even if you just finished a previous team-lead session in this conversation, you MUST create a **new** team and spawn **new** agents
- Even if the work seems "simple enough to do directly" — spawn agents anyway
- Your only tools are: `TeamCreate`, `Task`, `SendMessage`, `Read` (for agent templates; during active phase use PLAN_READY summaries instead of reading full plan files), `Bash` (only for team state inspection), and `Skill()` (only during closure phase for grill/done)

**The test**: If you're about to call `Edit()` or write code, STOP — you're violating this rule.

---

## -1. Pre-Flight Cleanup (ALWAYS FIRST)

**Before mode detection or any other step**, clean up stale teams from previous runs in this session.

### Cleanup Protocol

1. **First team-lead invocation in this session**: Nothing to clean. Proceed to Section 0.

2. **Repeat invocation** (you previously ran team-lead and remember the team name + agent names):
   - Send `shutdown_request` to each agent you previously spawned:
     ```typescript
     SendMessage({ type: "shutdown_request", recipient: "<previous-agent-name>" });
     ```
   - Call `TeamDelete()` with the previous team name
   - If `TeamDelete` fails (agents still shutting down), wait 3 seconds, retry once

3. **Use a unique team name** for each invocation to avoid collisions:
   - `impl-checkout-1`, `impl-checkout-2`
   - `review-auth-{timestamp}`

**Do NOT** inspect the filesystem (`ls`, `jq`, reading config files). You either know the previous team name from this session, or there is nothing to clean.

---

## Usage

```bash
sw:team-lead "<feature description>" [OPTIONS]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Show proposed agent plan without launching | false |
| `--mode` | Force operating mode: `brainstorm`, `plan`, `implement`, `review`, `research`, `test` | auto-detect |
| `--domains` | Override domain detection (e.g., `--domains frontend,backend,testing`) | auto-detect |
| `--max-agents` | Maximum number of concurrent agents | 6 |

---

## 0. Mode Detection (BEFORE Increment Pre-Flight)

**Detect operating mode FIRST. This determines the entire workflow path.**

### Detection Rules (priority order)

1. **Explicit flag**: `--mode brainstorm|plan|implement|review|research|test`
2. **team_name prefix**: `review-*`, `brainstorm-*`, `research-*`, `plan-*`, `test-*`
3. **Intent keywords** in the user's request:

| Keywords | Mode | Go To |
|----------|------|-------|
| "brainstorm", "ideate", "explore ideas", "what if", "pros and cons" | BRAINSTORM | Section 0a |
| "plan", "spec", "design", "architect", "define requirements" | PLANNING | Section 0b |
| "implement", "build", "code", "develop" *(or default)* | IMPLEMENTATION | Section 1 |
| "review", "audit", "check code", "review PR", "code quality" | REVIEW | Section 0c |
| "research", "investigate", "analyze", "explore codebase" | RESEARCH | Section 0d |
| "test", "write tests", "test strategy", "test coverage" | TESTING | Section 0e |

4. **Default**: IMPLEMENTATION mode if no keywords match.

### Mode Configuration

| Mode | Increment? | Agent Templates | Coordination | Output |
|------|-----------|-----------------|--------------|--------|
| BRAINSTORM | No | brainstorm-advocate, brainstorm-critic, brainstorm-pragmatist | Parallel → synthesize | Decision matrix |
| PLANNING | Creates one | pm, architect (+ optional security reviewer) | PM + Architect parallel (Architect explores while PM specs) | spec.md, plan.md, tasks.md |
| IMPLEMENTATION | Required | backend, frontend, database, testing, security | Contract-first phases | Working code |
| REVIEW | Optional | Delegates to sw:code-reviewer | Parallel | Review report |
| RESEARCH | No | researcher (1-3 instances) | Parallel → merge | Research report |
| TESTING | Required | testing (split by layer) | Parallel | Test suites |

---

### 0a. BRAINSTORM Mode

**team_name**: `brainstorm-{topic-slug}`

Skip increment pre-flight entirely. Brainstorm doesn't need a spec — it explores possibilities.

1. Create team: `TeamCreate({ team_name: "brainstorm-{slug}", description: "Brainstorm: {topic}" })`
2. Read agent templates from `agents/brainstorm-advocate.md`, `agents/brainstorm-critic.md`, `agents/brainstorm-pragmatist.md`
3. Replace `[BRAINSTORM_QUESTION]` with the user's question/topic
4. Spawn all 3 agents in parallel — each call MUST include `team_name` so agents join the team (and get tmux panes):
   ```
   Task({
     team_name: "brainstorm-{slug}",
     name: "brainstorm-advocate",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced brainstorm-advocate.md content>
   })
   Task({
     team_name: "brainstorm-{slug}",
     name: "brainstorm-critic",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced brainstorm-critic.md content>
   })
   Task({
     team_name: "brainstorm-{slug}",
     name: "brainstorm-pragmatist",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced brainstorm-pragmatist.md content>
   })
   ```
5. **PASSIVE WAIT (CRITICAL)**: Do NOT apply §8b stuck detection to brainstorm agents.
   Brainstorm agents send `STATUS:` heartbeats (not task-granularity `T-{N}/{total}`).
   Wait patiently for `PERSPECTIVE_COMPLETE:` messages — expected 2-5 minutes per agent.
   **Do NOT send STATUS_CHECK or shutdown_request** while agents are working.
   The only valid intervention is responding to `BLOCKING_ISSUE:` messages.
6. Collect ALL 3 `PERSPECTIVE_COMPLETE:` messages before proceeding. Do NOT start synthesis after receiving only 1 or 2.
7. Synthesize perspectives into a decision matrix:
   - Compare approaches across dimensions (effort, risk, value, alignment)
   - Highlight points of agreement and disagreement
   - Provide a ranked recommendation
8. Offer handoff: "Ready to proceed? Run `sw:increment` to formalize the chosen approach."
9. **Cleanup (ALL 3 phases from Step 9 — NEVER skip Phase 3)**:
   - Phase 1: Send `shutdown_request` to each agent
   - Phase 2: `TeamDelete()` (retry once after 3s if it fails)
   - Phase 3: Run the orphaned pane safety net bash script from Step 9 — `SendMessage` shutdown does NOT close tmux panes, this script is the ONLY thing that does
10. **STOP** — do not proceed to implementation sections

---

### 0b. PLANNING Mode

**team_name**: `plan-{feature-slug}`

Planning mode runs PM and Architect agents in parallel for richer, faster spec creation.

1. **Check for existing increment**:
   - If increment exists: read it as context, agents will update/enhance its spec and plan
   - If no increment: create one (folder + metadata.json only, agents will write spec/plan)

2. **Spawn PM + Architect in parallel** (TRUE parallelism):
   - Read `agents/pm.md`, replace `[INCREMENT_ID]`, `[MASTER_INCREMENT_PATH]`, `[FEATURE_DESCRIPTION]`
   - Read `agents/architect.md`, replace `[INCREMENT_ID]`, `[MASTER_INCREMENT_PATH]`
   - **Spawn BOTH in a single step — each call MUST include `team_name`:**
     ```
     Task({
       team_name: "plan-{feature-slug}",
       name: "pm-agent",
       subagent_type: "general-purpose",
       mode: "bypassPermissions",
       prompt: <replaced pm.md content>
     })
     Task({
       team_name: "plan-{feature-slug}",
       name: "architect-agent",
       subagent_type: "general-purpose",
       mode: "bypassPermissions",
       prompt: <replaced architect.md content>
     })
     ```
   - PM writes spec.md with user stories and ACs
   - Architect starts codebase exploration immediately (does NOT need spec.md for this)
   - Architect polls for spec.md, reads it when PM finishes, then designs architecture
   - Optionally read `agents/reviewer-security.md`, replace `[REVIEW_TARGET]` with the spec, spawn Security reviewer after PM signals `PLAN_READY:`
   - Wait for all agents' `COMPLETION:` messages

   **Why this works**: Architect's workflow has two phases — exploration (no spec.md needed)
   and design (needs spec.md). By spawning both agents simultaneously, the Architect's
   exploration phase (~30s) overlaps with PM's spec writing, reducing total wall-clock time.

4. **Post-planning**:
   - Run `specweave sync-living-docs {increment-id}` to sync external tools
   - Present the spec + plan summary to the user
   - Recommend execution strategy: `sw:do`, `sw:auto`, or `sw:team-lead` (implementation mode)

5. **Cleanup (ALL 3 phases from Step 9 — NEVER skip Phase 3)**:
   - Phase 1: Send `shutdown_request` to each agent
   - Phase 2: `TeamDelete()` (retry once after 3s if it fails)
   - Phase 3: Run the orphaned pane safety net bash script from Step 9 — `SendMessage` shutdown does NOT close tmux panes, this script is the ONLY thing that does
6. **STOP** — do not proceed to implementation sections

---

### 0c. REVIEW Mode

**Delegates entirely to `sw:code-reviewer`.**

Team-lead does NOT spawn its own reviewer agents for review mode. The code-reviewer skill handles its own orchestration with 6 specialized reviewers.

```typescript
Skill({ skill: "sw:code-reviewer", args: "<user's review target or flags>" })
```

Pass through any arguments the user provided (--pr N, --changes, --cross-repo, path).

**STOP** after the skill completes — do not proceed to implementation sections.

---

### 0d. RESEARCH Mode

**team_name**: `research-{topic-slug}`

Skip increment pre-flight. Research is exploratory — no spec needed.

1. Create team: `TeamCreate({ team_name: "research-{slug}", description: "Research: {topic}" })`
2. **Determine research agents**:
   - Single topic: spawn 1 researcher from `agents/researcher.md`
   - Multi-faceted topic: spawn 2-3 researchers with different scopes
     (e.g., "research auth" → one agent on OAuth providers, one on session management, one on security best practices)
3. Replace `[RESEARCH_TOPIC]` and `[RESEARCH_SCOPE]` in each agent prompt
4. Spawn all researchers in parallel — each call MUST include `team_name`:
   ```
   Task({
     team_name: "research-{slug}",
     name: "researcher-{scope}",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced researcher.md content>
   })
   ```
5. Collect `RESEARCH_COMPLETE:` messages
6. Merge findings into a unified research report:
   - Cross-reference findings between agents
   - Resolve contradictions
   - Produce ranked recommendations
7. Offer handoff: `sw:increment` (to act on findings) or `sw:brainstorm` (to explore approaches)
8. **Cleanup (ALL 3 phases from Step 9 — NEVER skip Phase 3)**:
   - Phase 1: Send `shutdown_request` to each agent
   - Phase 2: `TeamDelete()` (retry once after 3s if it fails)
   - Phase 3: Run the orphaned pane safety net bash script from Step 9 — `SendMessage` shutdown does NOT close tmux panes, this script is the ONLY thing that does
9. **STOP** — do not proceed to implementation sections

---

### 0e. TESTING Mode

**team_name**: `test-{increment-id}`

Testing mode requires an increment (it needs to know WHAT to test).

1. **Verify increment exists** (same as implementation mode — see below)
2. Create team: `TeamCreate({ team_name: "test-{id}", description: "Testing: {increment}" })`
3. Spawn testing agents split by layer:
   - **Unit test agent**: read `agents/testing.md`, override scope to unit tests only
   - **E2E test agent**: read `agents/testing.md`, override scope to E2E tests only
   - Split scope via the agent prompt, not via separate templates
4. Spawn both in parallel — each call MUST include `team_name`:
   ```
   Task({
     team_name: "test-{id}",
     name: "unit-test-agent",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced testing.md content with unit-test scope>
   })
   Task({
     team_name: "test-{id}",
     name: "e2e-test-agent",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced testing.md content with e2e scope>
   })
   ```
5. Collect `COMPLETION:` messages
6. Run test suites to verify: `npx vitest run` + `npx playwright test`
7. Report results: pass/fail counts, coverage, uncovered ACs
8. **Cleanup (ALL 3 phases from Step 9 — NEVER skip Phase 3)**:
   - Phase 1: Send `shutdown_request` to each agent
   - Phase 2: `TeamDelete()` (retry once after 3s if it fails)
   - Phase 3: Run the orphaned pane safety net bash script from Step 9 — `SendMessage` shutdown does NOT close tmux panes, this script is the ONLY thing that does
9. **STOP** — do not proceed to implementation sections

---

## 0.5. Increment Pre-Flight (IMPLEMENTATION and TESTING modes only)

**This section applies only to IMPLEMENTATION mode (default) and TESTING mode.**
All other modes handle their own increment logic (or skip it entirely) in Section 0a-0e above.

The team-lead works best with an increment (spec.md, plan.md, tasks.md) but can also run **without one** in free-form mode.

### Check: Is an increment required?

**Free-form mode** (no increment needed) applies when:
- `SPECWEAVE_NO_INCREMENT=1` is set (via `specweave team --no-increment`)
- The user explicitly opted out of increment creation

In free-form mode: **skip the rest of Section 0.5** and proceed directly to Step 1. Agents will work from the natural language description instead of a spec. Note: without a spec, `sw:done` closure is not available — the team-lead simply coordinates agent completion.

### Standard mode: Verify increment exists

```bash
# Single-repo
find .specweave/increments -maxdepth 2 -name "spec.md" 2>/dev/null | head -5

# Multi-repo (umbrella)
find repositories -path "*/.specweave/increments/*/spec.md" -maxdepth 6 2>/dev/null | head -5
```

### If NO increment exists → Auto-invoke sw:increment

Do NOT ask permission. Invoke the increment skill with the user's feature description:

```typescript
Skill({ skill: "sw:increment", args: "the user's feature description" })
```

Wait for sw:increment to complete (spec.md, plan.md, tasks.md created and user exits plan mode).
Then continue to Step 1.

If sw:increment fails (user rejects plan, skill errors, etc.): **STOP. Do NOT proceed.**
Report the failure to the user and ask them to run `sw:increment` manually.

### If increment exists → Read the master spec

Read the increment's spec.md. This is the **source of truth** for all agent work:
- Scope and boundaries
- User stories and acceptance criteria
- Task breakdown and dependencies

Store the increment path as `MASTER_INCREMENT_PATH` — you will reference it in agent prompts.

**WHY THIS MATTERS**: Without a spec, agents infer scope from natural language alone.
This leads to uncoordinated implementation, scope creep, and missing acceptance criteria.
The spec-first principle exists because specs are the contract between user intent and agent execution.

### Activate the Master Increment (MANDATORY — standard mode only)

**Before spawning ANY agents**, transition the master increment to `"active"` status. The `specweave complete` command silently exits on increments with `"planned"` or `"backlog"` status — if you skip this step, closure will fail.

```bash
# Read current status
STATUS=$(jq -r '.status' [MASTER_INCREMENT_PATH]/metadata.json)

# If not already active, activate it
if [ "$STATUS" != "active" ] && [ "$STATUS" != "ready_for_review" ]; then
  # Edit metadata.json: set status to "active" and update lastActivity
  Edit metadata.json:
    "status": "planned" → "status": "active"
    "lastActivity": "<current ISO timestamp>"
fi
```

**Why**: Agents implement tasks but don't manage the increment lifecycle. The team-lead owns status transitions — activate before work begins, close after work completes.

---

## 1. Tool Reference

| Action | Tool | Parameters |
|--------|------|------------|
| Create team | `TeamCreate` | `team_name`, `description` |
| Spawn agent | `Task` | `team_name`, `name`, `subagent_type`, `prompt`, `mode: "bypassPermissions"` |
| Send message | `SendMessage` | `type`, `recipient`, `content`, `summary` |
| Shutdown agent | `SendMessage` | `type: "shutdown_request"`, `recipient` |

---

## 2. Domain-to-Skill Mapping

Analyze the feature request and map affected domains to SpecWeave skills.

| Domain | Primary Skill | Additional Skills | When to Use |
|--------|--------------|-------------------|-------------|
| **Frontend** | `sw:architect` | — | UI components, pages, client-side state |
| **Backend** | `sw:architect` | `infra:devops` | API endpoints, services, business logic |
| **Database** | `sw:architect` | | Schema design, migrations, seed data |
| **Shared/Types** | `sw:architect` | `sw:code-simplifier` | TypeScript interfaces, shared constants, API contracts |
| **Testing** | `sw:e2e` | `sw:tdd-red`, `sw:validate` | Test strategy, E2E suites, integration tests |
| **Security** | `sw:security` | `security:patterns` | Auth, authorization, threat modeling, OWASP |
| **DevOps** | `infra:devops` | `k8s:deployment-generate`, `infra:observability` | CI/CD, Docker, K8s, monitoring |
| **Mobile** | `mobile:react-native` | `mobile:screen-generate`, `mobile:expo` | Native/cross-platform mobile apps |
| **ML** | `ml:engineer` | `ml:pipeline`, `ml:deploy` | Model training, inference pipelines, deployment |

### Auto-Detection Signals

The orchestrator infers domains from the feature description and codebase structure (e.g., `src/components/` signals Frontend, `prisma/` signals Database, `src/api/` signals Backend, `tests/` signals Testing, auth-related keywords signal Security, Docker/K8s/CI files signal DevOps, React Native/Flutter signal Mobile, model/pipeline keywords signal ML).

---

## 3. Contract-First Spawning Protocol

Agents are NOT all spawned simultaneously. The orchestrator follows a two-phase dependency protocol to prevent integration conflicts.

### Contract Artifacts

| Artifact | Location | Producer | Consumers |
|----------|----------|----------|-----------|
| TypeScript interfaces | `src/types/` or `src/shared/types/` | Shared/Types agent | Frontend, Backend, Testing |
| Prisma schema | `prisma/schema.prisma` | Database agent | Backend, Testing |
| OpenAPI spec | `openapi.yaml` or `src/api/openapi.yaml` | Backend agent | Frontend, Testing |
| GraphQL schema | `schema.graphql` | Backend agent | Frontend, Mobile |
| API route types | `src/api/types/` | Backend agent | Frontend |

### Organization Discovery (CRITICAL -- resolve BEFORE spawning agents)

**The orchestrator MUST resolve the actual organization/owner name before spawning ANY agents.**
All `{ORG}` placeholders below must be replaced with the real value.

**Discovery chain (in order of priority):**

1. **From config** (`repository.organization`):
```bash
ORG=$(jq -r '.repository.organization // empty' .specweave/config.json 2>/dev/null)
```

2. **From sync profiles** (fallback if repository.organization not set):
```bash
if [ -z "$ORG" ]; then
  ORG=$(jq -r '[.sync.profiles[].config.owner // .sync.profiles[].config.organization] | map(select(. != null)) | first // empty' .specweave/config.json 2>/dev/null)
fi
```

3. **From umbrella childRepos** (fallback):
```bash
if [ -z "$ORG" ]; then
  ORG=$(jq -r '.umbrella.childRepos[0].path // empty' .specweave/config.json 2>/dev/null | sed 's|repositories/||' | cut -d/ -f1)
fi
```

4. **From existing filesystem** (last resort):
```bash
if [ -z "$ORG" ]; then
  ORG=$(ls -d repositories/*/ 2>/dev/null | head -1 | xargs basename 2>/dev/null)
fi
```

5. **If all fail**: Ask the user. NEVER guess or use a placeholder.

**NEVER read org from .env files.** Organization belongs in `.specweave/config.json`.

### Multi-Repo Increment Placement (CRITICAL)

**When `umbrella.enabled: true` in config.json, ALL increments go in the umbrella root `.specweave/increments/` — NOT in child repos.** Use the `project` field in metadata.json to route increments to the correct child repo context.

```
# CORRECT: All increments at umbrella root, tagged by project
umbrella-project/
├── .specweave/config.json
├── .specweave/increments/
│   ├── 0001-domain-models/     # metadata.json: "project": "sw-ecom-domain"
│   ├── 0002-shared-types/      # metadata.json: "project": "sw-ecom-shared"
│   └── 0003-api-endpoints/     # metadata.json: "project": "sw-ecom-api"
├── repositories/
│   ├── {ORG}sw-ecom-domain/   # NO .specweave/increments/ here
│   ├── {ORG}sw-ecom-shared/   # NO .specweave/increments/ here
│   └── {ORG}sw-ecom-api/      # NO .specweave/increments/ here

# WRONG: Increments inside child repos
umbrella-project/
├── repositories/{ORG}sw-ecom-domain/
│   └── .specweave/increments/0001-domain-models/    # WRONG!
```

**Rules:**
- NEVER create `.specweave/increments/` inside child repos under `repositories/`
- NEVER run `specweave init` in child repos — the umbrella root owns all increments
- Each agent works on files inside its assigned repo in `repositories/`, but increments stay at umbrella root
- Replace `{ORG}` with the actual organization discovered above

### Phase 1: Upstream Agents (Contracts First)

**Contract chain order**: shared/types -> database -> backend -> frontend (upstream before downstream).

Spawn agents that produce shared contracts. These MUST complete before downstream agents begin.

**Upstream agents** (spawn first, wait for completion):
- **Shared/Types agent** -- produces TypeScript interfaces, enums, constants
- **Database agent** -- produces Prisma schema, migration files, seed data

```
Phase 1: Upstream
  ├── Shared/Types Agent -> produces interfaces, enums
  └── Database Agent -> produces schema, migrations

  [WAIT for Phase 1 completion via CONTRACT_READY messages]
```

### Phase 2: Downstream Agents (Consume Contracts)

Once upstream contracts are established, spawn downstream agents in parallel.

**Downstream agents** (spawn in parallel after Phase 1):
- **Backend agent** -- consumes types and schema, produces API endpoints
- **Frontend agent** -- consumes types and API contracts, produces UI
- **Testing agent** -- consumes all contracts, produces test suites
- **Security agent** -- consumes all code, produces security hardening
- **DevOps agent** -- consumes all code, produces deployment config

```
Phase 2: Downstream (parallel)
  ├── Backend Agent (reads types + schema)
  ├── Frontend Agent (reads types + API spec)
  ├── Testing Agent (reads all contracts)
  ├── Security Agent (reads all code)
  └── DevOps Agent (reads all code)
```

### No-Dependency Case

If the feature has no cross-domain dependencies (e.g., purely frontend work with no new types), skip Phase 1 and spawn all agents in parallel immediately.

### Spawn Decision Logic

```
Analyze domains
  │
  ├── Any upstream domains (shared/types, database)?
  │     YES -> Phase 1: spawn upstream, wait for contracts
  │           Phase 2: spawn downstream in parallel
  │     NO  -> Spawn all agents in parallel (no dependency)
  │
  └── Single domain?
        YES -> Spawn single agent, no orchestration needed
```

---

## 3b. Plan Review Workflow

The team lead reviews agent plans **asynchronously**. Agents do NOT wait for approval — they proceed to implementation immediately after creating plans and sending a notification.

### Why Async Review

The previous blocking handshake (where agents waited for explicit approval before implementing) caused sessions to freeze:
- When 3-5 Phase 2 agents spawned simultaneously, they ALL blocked waiting for a response
- Team-lead had to review each plan sequentially while all agents sat idle
- If team-lead was processing another message (or in extended thinking), agents waited indefinitely
- In tmux/iTerm2, this appeared as a completely frozen session

Async review eliminates the bottleneck: agents proceed immediately, and the team-lead only intervenes when something is wrong.

### Permission Mode: bypassPermissions (CRITICAL)

**All agents MUST be spawned with `mode: "bypassPermissions"`.** This is required because:
- Agents run as separate processes that encounter folder trust prompts
- Trust prompts require interactive input that agents CANNOT provide
- Without `bypassPermissions`, agents get STUCK waiting for trust confirmation and never execute
- This applies to ALL agent spawns — upstream and downstream

**NEVER use `mode: "plan"` for agent spawns** — it causes agents to block on the trust-folder prompt.

### Protocol (Async Notify + Correct)

**Agent side** (built into every agent prompt template):
1. Read the increment spec and explore the codebase
2. Create plan files (spec.md, plan.md, tasks.md) in the increment directory
3. Send a structured plan notification to team-lead:
```
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "PLAN_READY: Created .specweave/increments/[ID]/\nTasks: [count]\nACs covered: [list AC-IDs]\nKey decisions: [1-2 sentence summary]\nFiles to create/modify: [file list]\nArchitecture: [pattern/approach chosen]",
  summary: "Plan ready — proceeding to implementation"
});
```
4. **Proceed to implementation IMMEDIATELY.** Do NOT wait for any response.
5. If team-lead sends `PLAN_CORRECTION` during implementation:
   - **Finish the current task** (don't leave half-done code)
   - Read the correction and update plan.md/tasks.md accordingly
   - Send `STATUS: Applied PLAN_CORRECTION. Revised [what changed]. Continuing from T-{N}.`
   - Resume implementation with the revised plan

**Team-lead side**:
1. Receive `PLAN_READY` notification from agent
2. Review using the **structured summary in the message** (do NOT read full plan files unless a concern is detected)
3. Quick-evaluate:
   - Do the covered ACs match what this agent should handle?
   - Are the files within this agent's ownership boundaries?
   - Do any key decisions conflict with other agents' plans?
   - Is the task count reasonable (<15)?
4. If plan looks good: **do nothing** — agent is already implementing
5. If plan has issues: send correction:

```
// Correct a plan issue (agent is already implementing)
SendMessage({
  type: "message",
  recipient: "database-agent",
  content: "PLAN_CORRECTION: 1) Add index on user_id for sessions. 2) You're missing AC-US1-03 — add a task for it. Pause current work and revise before continuing.",
  summary: "Plan needs correction"
});
```
6. If agent ignores `PLAN_CORRECTION` (continues without revising after 2 turns):
```
SendMessage({ type: "shutdown_request", recipient: "database-agent" });
// Report to user: "Agent ignored correction, shutting down. Manual intervention needed."
```

### Review Priorities

Not all plans need deep review. Prioritize:
- **Phase 1 (upstream) plans** — errors here cascade to all downstream agents
- **Plans with >10 tasks** — higher risk of scope creep
- **Plans touching shared files** — ownership conflicts
- **Single-agent teams** — skip review entirely (no coordination needed)

### Multi-Increment Consideration

For very large features, the team lead MAY split work into multiple increments per domain for better tracking and independent closure. Decide this during initial analysis (Step 1), before spawning agents.

### Task Cap Per Agent (CRITICAL — Context Overflow Prevention)

**Maximum 15 tasks per agent.** Agents with more tasks accumulate too much context in auto-mode, leading to extended thinking loops and stuck agents.

When distributing tasks from the master spec:
1. Count tasks per domain
2. If a domain has >15 tasks: **split into 2 agents** (e.g., `jira-agent-a`, `jira-agent-b`) with non-overlapping task ranges
3. If splitting isn't natural, group tasks into phases and create 2 increments per domain

```
Domain tasks analysis:
  Frontend: 12 tasks -> 1 agent (OK)
  Backend:  8 tasks  -> 1 agent (OK)
  JIRA:     23 tasks -> SPLIT into 2 agents (tasks 1-12, tasks 13-23)
```

**Why**: Each auto-mode iteration adds context (spec reads, edits, test outputs). At 20+ tasks, accumulated context causes the model to enter extended thinking (30+ min) and effectively hang. The 15-task cap keeps agents within a safe context budget.

---

## 4. Agent Spawn Prompt Templates

Agent definitions live as reusable `.md` files in the `agents/` subdirectory. When spawning a domain agent, **Read the agent file and use its full content as the Task() prompt**, with placeholders replaced.

### Agent Reference Table

| Agent | File | Domain | Phase | Primary Skills |
|-------|------|--------|-------|---------------|
| Frontend | `agents/frontend.md` | UI, components, pages | 2 (downstream) | `sw:architect` |
| Backend | `agents/backend.md` | API, services, middleware | 2 (downstream) | `sw:architect`, `infra:devops` |
| Database | `agents/database.md` | Schema, migrations, seeds | 1 (upstream) | `sw:architect` |
| Testing | `agents/testing.md` | Unit, integration, E2E | 2 (downstream) | `sw:e2e`, `sw:tdd-red` |
| Security | `agents/security.md` | Auth, validation, audit | 2 (downstream) | `sw:security` |

### How to Use Agent Files

For each domain agent to spawn:

1. **Read** the agent definition: `Read("agents/{domain}.md")`
2. **Replace placeholders** in the content:
   - `[INCREMENT_ID]` → the increment ID (e.g., `0042-checkout-flow`)
   - `[MASTER_INCREMENT_PATH]` → full path to the master increment directory
   - `{ORG}` → the discovered organization name
   - `{repo-name}` → the assigned repository name
3. **Spawn** via Task() with the replaced content as the prompt:
   ```
   Task({
     team_name: "<team-name>",
     name: "<domain>-agent",
     subagent_type: "general-purpose",
     mode: "bypassPermissions",
     prompt: <replaced agent content>
   })
   ```

**CRITICAL**: Always use `mode: "bypassPermissions"` — agents cannot handle interactive trust-folder prompts.

---

## 5. File Ownership

Each agent has exclusive WRITE access to specific file patterns. This prevents merge conflicts.

### Ownership Map

| Domain | WRITE Patterns | Notes |
|--------|---------------|-------|
| **Frontend** | `src/components/**`, `src/pages/**`, `src/hooks/**`, `src/styles/**`, `src/app/**`, `src/stores/**`, `public/**` | UI layer |
| **Backend** | `src/api/**`, `src/services/**`, `src/middleware/**`, `src/routes/**`, `src/controllers/**` | API layer |
| **Database** | `prisma/**`, `src/db/**`, `src/repositories/**`, `seeds/**`, `scripts/db/**` | Data layer |
| **Shared/Types** | `src/types/**`, `src/shared/**`, `src/constants/**`, `src/utils/shared/**` | Contracts |
| **Testing** | `tests/**`, `__tests__/**`, `e2e/**`, `**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`, `test-utils/**`, `fixtures/**` | All test files |
| **Security** | `src/auth/**`, `src/middleware/auth*`, `src/middleware/security*`, `src/utils/crypto/**`, `src/utils/validation/**`, `security/**` | Auth and security |
| **DevOps** | `.github/**`, `docker/**`, `Dockerfile*`, `docker-compose*`, `k8s/**`, `terraform/**`, `.gitlab-ci.yml`, `Makefile` | Infrastructure |
| **Mobile** | `src/screens/**`, `src/navigation/**`, `ios/**`, `android/**`, `src/native/**` | Mobile app |
| **ML** | `models/**`, `notebooks/**`, `src/ml/**`, `src/pipelines/**`, `data/**` | Machine learning |

### Ownership Rules

1. **WRITE only to files you own** -- agents must not modify files outside their ownership patterns
2. **READ any file** -- all agents have unrestricted read access for context
3. **Shared files require coordination** -- if two domains need to modify the same file (e.g., `package.json`), the orchestrator assigns a primary owner and others request changes via SendMessage
4. **New files** -- agents can create new files ONLY within their ownership patterns
5. **Conflict detection** -- the orchestrator checks for ownership overlap before spawning and resolves ambiguity upfront
6. **Repository directory structure** -- for multi-repo setups, ALL repository cloning and creation MUST use the `repositories/{ORG}/` directory convention

---

## 6. Communication Protocol

Agents communicate contract readiness, blocking issues, and completion status using `SendMessage`.

### Message Types

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `CONTRACT_READY:` | Upstream contract is published | Upstream agent | team-lead (broadcasts to downstream) |
| `PLAN_READY:` | Plan created, agent proceeding to implementation | Any agent | team-lead (async review) |
| `STATUS:` | Heartbeat — task progress update | Any agent | team-lead (stuck detection) |
| `BLOCKING_ISSUE:` | Agent is stuck, needs help | Any agent | team-lead |
| `COMPLETION:` | Agent finished all tasks | Any agent | team-lead |
| `PLAN_CORRECTION:` | Plan needs revision (async) | team-lead | Specific agent |

### Message Examples

```typescript
// Upstream agent signals contract is ready
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "CONTRACT_READY: TypeScript interfaces written to src/types/checkout.ts. Exports: CheckoutItem, CartSummary, PaymentIntent.",
  summary: "Shared types contract ready"
});

// Agent notifies plan is ready (does NOT wait for response)
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "PLAN_READY: Created .specweave/increments/0202-checkout-backend/\nTasks: 8\nACs covered: AC-US1-01, AC-US1-02, AC-US2-01\nKey decisions: REST API with Express, JWT auth middleware\nFiles: src/api/checkout.ts, src/services/payment.ts, src/middleware/auth.ts\nArchitecture: Controller-Service-Repository pattern",
  summary: "Backend plan ready — proceeding to implementation"
});

// Agent heartbeat after each task completion
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "STATUS: T-003/8 complete. Next: T-004 (implement payment service). Tests: 12/12 passing.",
  summary: "Backend agent: task 3 of 8 done"
});

// Agent reports a blocking issue
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "BLOCKING_ISSUE: Cannot implement payment webhook -- Stripe webhook secret not found in .env. Need STRIPE_WEBHOOK_SECRET to proceed.",
  summary: "Blocked on missing Stripe secret"
});

// Agent signals completion
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "COMPLETION: All 8 tasks done. Tests passing (24/24). Ready for team-lead closure.",
  summary: "Frontend agent completed all tasks"
});

// Team-lead sends async plan correction (agent is already implementing)
SendMessage({
  type: "message",
  recipient: "database-agent",
  content: "PLAN_CORRECTION: 1) Add index on user_id for sessions table. 2) Missing AC-US1-03 — add a migration task. Pause and revise.",
  summary: "Plan correction for database agent"
});
```

---

## 7. Spawning Agents

### Step 1: Create the Team

```typescript
TeamCreate({
  team_name: "feature-checkout",
  description: "Building checkout flow across frontend, backend, and database"
});
```

### Step 2: Spawn Upstream Agents (Phase 1)

All agents are spawned with `mode: "bypassPermissions"` to prevent blocking on trust-folder prompts. Agents notify team-lead of their plans via PLAN_READY but proceed to implementation immediately (see Section 3b for async review protocol).

For each agent: **Read the agent definition file** (see Section 4 reference table), replace placeholders (`[INCREMENT_ID]`, `[MASTER_INCREMENT_PATH]`, `{ORG}`, `{repo-name}`), and use the full content as the Task() prompt.

```typescript
// Read agents/database.md, replace placeholders, then:
Task({
  team_name: "feature-checkout",
  name: "database-agent",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/database.md with placeholders replaced>,
});
```

### Step 3: Wait for Phase 1 CONTRACT_READY Messages

Messages are delivered automatically via SendMessage from upstream agents.

### Step 4: Spawn Downstream Agents (Phase 2)

```typescript
// Read agents/backend.md, agents/frontend.md, agents/testing.md
// Replace placeholders, then spawn each:
Task({
  team_name: "feature-checkout",
  name: "backend-agent",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/backend.md with placeholders replaced>,
});

Task({
  team_name: "feature-checkout",
  name: "frontend-agent",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/frontend.md with placeholders replaced>,
});

Task({
  team_name: "feature-checkout",
  name: "testing-agent",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/testing.md with placeholders replaced>,
});
```

---

## 8. Quality Gates

Quality gates are split: agents handle tests, team-lead handles closure (grill, done, judge-llm). This prevents context overflow in agents from loading 4+ additional skill definitions during closure.

### Per-Agent Quality Gate (Lightweight)

```
Agent Workflow:
  1. Execute all assigned tasks via sw:auto --simple
  2. Run all tests for owned code (unit + integration + E2E)
  3. Run linter/type-check for owned code
  4. If tests fail -> fix issues and repeat from step 2
  5. Do NOT signal completion until all tests pass
  6. Signal COMPLETION via SendMessage (include task count, test results summary)
  7. Do NOT run sw:grill or sw:done — team-lead handles closure centrally
```

**Why agents don't run sw:done**: The sw:done skill invokes 4 sub-skills (grill, judge-llm, sync-docs, qa), each loading a full SKILL.md. After 15+ tasks of auto-mode context, this pushes agents into extended thinking (30+ min hangs). Closure is delegated to `sw-closer` subagents that run in a fresh context, avoiding overflow for both agents and the team-lead orchestrator.

### Active Phase Rules (CRITICAL — While Agents Are Implementing)

**During the active phase (between spawning agents and receiving ALL COMPLETION signals), the team-lead MUST NOT run any closure operations.**

```
ALLOWED during active phase:
  ✓ Process SendMessage from agents (PLAN_READY, STATUS, CONTRACT_READY, BLOCKING_ISSUE, COMPLETION)
  ✓ Async plan review (read PLAN_READY summaries, send PLAN_CORRECTION if needed)
  ✓ Track heartbeat STATUS per agent for stuck detection
  ✓ Respond to BLOCKING_ISSUE messages
  ✓ Send STATUS_CHECK to silent agents
  ✓ Shutdown stuck agents

FORBIDDEN during active phase:
  ✗ Run sw:grill on any increment
  ✗ Run sw:done on any increment
  ✗ Invoke any closure-related skills (judge-llm, sync-docs, qa)
  ✗ Read full plan/spec files (use PLAN_READY summaries instead)
  ✗ Call TeamDelete() (kills all running agents — only use after all agents done or stuck)

ALLOWED but use with caution:
  ~ Spawn a replacement agent for a stuck agent that was shut down (same domain, remaining tasks)
```

**Why**: Closure loads 4+ skill definitions into context. Running it while agents are active causes the orchestrator to enter extended thinking (30+ min) and stop responding to agent messages — freezing the entire session.

### Orchestrator Quality Gate — Closure Phase (SIMPLIFIED)

**Closure begins ONLY after ALL agents have signaled COMPLETION (or been declared stuck).**

**Do NOT manually run grill/done per increment — spawn `sw-closer` subagents instead.**

```
AFTER ALL AGENTS COMPLETE:
  1. Verify ALL agents signaled COMPLETION (no unresolved BLOCKING_ISSUE)
  2. Determine closure order from team topology (shared → backend → frontend)
  3. For each increment in dependency order, spawn sw-closer subagent:
     Agent({
       subagent_type: "sw:sw-closer",
       prompt: "Close increment <ID>. Increment path: .specweave/increments/<ID>/",
       description: "Close increment <ID>"
     })
  4. Wait for each sw-closer to complete before spawning the next (dependency order)
  5. If an sw-closer fails, log the failure and continue to the next increment
  6. Run Step 9 cleanup (TeamDelete + kill tmux panes)
```

**CRITICAL**: Do NOT attempt inline closure (grill → done → retry loops) yourself.
Spawn `sw-closer` subagents instead — each runs in a fresh context with only the `sw:done` skill loaded, avoiding the context overflow that caused the "stuck after first agent" bug.

**If all sw-closer subagents fail**, report the failures to the user with the error messages. Do NOT retry inline.

### Grill Checklist per Domain

| Domain | Grill Checks |
|--------|-------------|
| Frontend | Components render, no console errors, accessibility, responsive |
| Backend | API endpoints return correct status codes, validation works, error handling |
| Database | Migrations apply cleanly, seed data loads, rollback works |
| Testing | All tests pass, coverage threshold met, no flaky tests |
| Security | No exposed secrets, input validation, auth working |
| DevOps | Docker builds, CI passes, deployment config valid |

---

## 8b. Agent Timeout and Stuck Detection (Heartbeat-Based)

Agents send `STATUS: T-{N}/{total}` heartbeat messages after each task completion. The team-lead uses these to detect stuck agents proactively.

### Heartbeat Tracking

The team-lead maintains a mental log of the last STATUS received from each agent:

```
Agent Heartbeat Log (example):
  backend-agent:  STATUS: T-003/8  (last seen: 2 turns ago)
  frontend-agent: STATUS: T-005/12 (last seen: this turn)
  database-agent: COMPLETION       (done)
  testing-agent:  STATUS T-001/6  (last seen: 4 turns ago) ← STUCK?
```

### Stuck Detection Rules

**Note**: Claude Code has no built-in timers. Heartbeats are tracked relative to team-lead turns (each time the orchestrator processes messages).

| Condition | Action |
|-----------|--------|
| Agent sent STATUS within last 2 team-lead turns | Healthy — no action needed |
| No STATUS from agent for 2 consecutive turns | Send `STATUS_CHECK` message to agent |
| No STATUS for 3 consecutive turns (or no response to STATUS_CHECK) | Declare agent stuck |
| Agent sends STATUS but task number hasn't changed for 3+ heartbeats | Stuck in loop — declare stuck |
| All agents stuck | STOP team, report to user |

### Stuck-in-Loop Detection

An agent may appear to send heartbeats but actually be looping on the same task (e.g., test fails → fix → test fails → fix → ...). To detect this:

- Track the task number in each STATUS message
- If the same task number appears in 3+ consecutive STATUS messages from the same agent, the agent is stuck in a loop
- Action: send a message to the agent with guidance, or declare stuck if the loop continues

### Stuck Agent Recovery

When an agent is declared stuck:
1. Do NOT wait for it — proceed with other agents
2. Note the stuck agent's increment ID and last known task progress (from last STATUS)
3. Send shutdown_request to the stuck agent to free resources
4. During closure phase, the stuck agent's increment is left open for manual completion

### Preventing Stuck Agents

- Enforce the 15-task cap (Section 3b)
- Agents use `--simple` flag in auto-mode (reduces context per iteration)
- Agents do NOT run sw:done (team-lead handles closure centrally)
- Heartbeat STATUS messages let team-lead detect problems early instead of after long silences
- If an agent's task count exceeds 15 despite the cap, the team-lead should split it before spawning

---

## 9. Workflow Summary

```
sw:team-lead "Build checkout flow"
  │
  ├── Step 0: VERIFY INCREMENT EXISTS (BLOCKING)
  │     ├── Found? → Read master spec.md as source of truth
  │     └── Missing? → Auto-invoke sw:increment, wait for completion
  ├── Step 0b: ACTIVATE MASTER INCREMENT (MANDATORY)
  │     └── Edit metadata.json: set status to "active" BEFORE spawning agents
  ├── Step 1: Analyze feature (from master spec) → identify domains → decide increment split
  ├── Step 2: Create team via TeamCreate
  ├── Step 3: Create per-domain increments (derived from master spec)
  │
  │ ── ACTIVE PHASE (agents implementing, team-lead monitoring) ──
  │
  ├── Step 4: Contract-first spawning (all agents with mode: "bypassPermissions")
  │     ├── Phase 1: Spawn shared + database
  │     │     └── Agents send PLAN_READY notification → proceed immediately
  │     │     └── Team-lead reviews async, sends PLAN_CORRECTION only if needed
  │     │     └── Wait for CONTRACT_READY
  │     └── Phase 2: Spawn backend + frontend + testing
  │           └── Agents send PLAN_READY notification → proceed immediately
  ├── Step 5: Monitor progress via STATUS heartbeats
  │     ├── Track per-agent: last STATUS task number and turn count
  │     ├── No STATUS for 2 turns → send STATUS_CHECK
  │     ├── No STATUS for 3 turns or same task 3+ times → declare stuck
  │     └── DO NOT run grill/done/closure during this phase
  ├── Step 6: Collect all COMPLETION signals (or declare remaining agents stuck)
  │
  │ ── CLOSURE PHASE (all agents done) ──
  │
  ├── Step 7: Spawn sw-closer subagents per increment (fresh context closure)
  ├── Step 8: Shutdown agents → TeamDelete() → orphaned pane safety net (Step 9 below)
  └── Done.
```

**IMPORTANT**: The intended entry point is: `sw:increment` → `sw:do` (detects 3+ domains) → `sw:team-lead`.
Direct invocation of `sw:team-lead` without an existing increment will trigger the guard and auto-invoke `sw:increment`.

### Step 9: Post-Completion Cleanup (MANDATORY — NEVER SKIP)

**After delivering results OR after all sw-closer subagents complete, clean up the team.**

#### Phase 1: Graceful Agent Shutdown

Send `shutdown_request` to every agent you spawned. You know their names — you spawned them via `Task()`.

```typescript
// Replace with your actual agent names from this session
SendMessage({ type: "shutdown_request", recipient: "<agent-1-name>", content: "Team work complete" });
SendMessage({ type: "shutdown_request", recipient: "<agent-2-name>", content: "Team work complete" });
// ... for every agent you spawned
```

Harmless if agents already exited. **NOTE**: `shutdown_request` via `SendMessage` does NOT close the tmux pane — the agent's Claude process exits but the pane persists with "Resume this session". Phase 3 below is the ONLY mechanism that actually kills orphaned panes. **NEVER skip Phase 3.**

#### Phase 2: Destroy Team

```typescript
TeamDelete();
```

If `TeamDelete` fails (agents still shutting down), wait 3 seconds, retry once.

#### Phase 3: Kill Orphaned Panes (MANDATORY — this is the ONLY thing that closes tmux panes)

`SendMessage` shutdown does NOT close tmux panes. Agent processes exit but panes persist showing "Resume this session". **This bash script is the ONLY cleanup mechanism. ALWAYS run it.**

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

**Key**: Removed `$TMUX` guard — even if the orchestrator isn't inside tmux itself, agent panes still exist in tmux and need cleanup. The `tmux` command can manage external sessions.

### --dry-run Output

When `--dry-run` is specified, display the proposed plan without executing.
**Do NOT call TeamCreate in dry-run mode** — just show the formatted plan text.

```
Team Orchestration Plan (DRY RUN)
==================================================
Feature: Build checkout flow | Domains: 4

Phase 1 (upstream):
  1. shared-types -> sw:architect, sw:code-simplifier  | Increment: 0200-checkout-shared
  2. database     -> sw:architect                 | Increment: 0201-checkout-database

Phase 2 (downstream, parallel):
  3. backend      -> sw:architect, infra:devops              | Increment: 0202-checkout-backend
  4. frontend     -> sw:architect                           | Increment: 0203-checkout-frontend

Max agents: 4 (2 sequential + 2 parallel)
To execute, run without --dry-run.
```

---

## 10. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| **TeamCreate blocked by guard** | No increment with spec.md exists | Run `sw:increment "feature"` first, then retry `sw:team-lead`. The guard requires a substantive spec.md (>200 bytes, not a template) |
| **Agent stuck on trust folder** | Agent spawned without `bypassPermissions` | ALWAYS use `mode: "bypassPermissions"` — NEVER `mode: "plan"`. Trust prompts require interactive input agents cannot provide |
| **Session freezes after first agent completes** | Closure ran during active phase (pre-v0528 bug) | Ensure §8 active-phase rules are followed: NO grill/done until ALL agents signal COMPLETION |
| **Agent proceeds with wrong plan** | Async model means agents don't wait for approval | Send `PLAN_CORRECTION` immediately; agent should pause and revise. If ignored, send `shutdown_request` |
| **No heartbeat STATUS from agent** | Agent didn't implement heartbeat or is stuck | Check if agent template includes heartbeat step. If yes, agent is stuck — send STATUS_CHECK, then declare stuck after 3 turns |
| **Agent stuck in loop (same task repeated)** | Test fail → fix → test fail cycle | Heartbeat shows same task number 3+ times. Send guidance message or declare stuck |
| **Agents editing same files** | Overlapping file ownership patterns | Review ownership map; reassign conflicting files to a single owner; use `--dry-run` to validate before launch |
| **Token cost too high** | Too many agents or overly large prompts | Reduce `--max-agents`; use `--domains` to limit scope; split feature into smaller increments |
| **Agent stuck in extended thinking** | Too many tasks (>15) causing context overflow | Enforce 15-task cap per agent; split large domains into 2 agents; agents use `--simple` mode |
| **Agent hung on sw:done** | Closure loads 4+ skill definitions into already-full context | Agents should NOT run sw:done — team-lead spawns `sw-closer` subagents (fresh context) for closure |
| **Contract agent takes too long** | Large schema or complex type system | Set a timeout in the agent prompt; if stuck >15 min, check agent output and consider splitting the contract work |
| **Phase 2 starts before Phase 1 finishes** | CONTRACT_READY not received yet | Ensure upstream agents send CONTRACT_READY via SendMessage before team-lead spawns downstream |
| **Agent fails mid-task** | Build error, test failure, or dependency issue | Send message to agent to fix; restart the agent with `sw:auto` on its increment |
| **`specweave complete` exits silently** | metadata.json status is "planned" (not "active") | Agents don't manage lifecycle status. Team-lead MUST activate the increment before spawning agents (see Step 0). Fix: edit metadata.json to set `"status": "active"` before running `specweave complete` |
| **Closure fails on multiple increments** | Quality gates fail (grill, desync, missing reports) | Each `sw-closer` subagent retries once automatically. If still failing, use `/sw:close-all` for batch retry |

---

## 11. Examples

### Example 1: Full-Stack Feature

```
User: sw:team-lead "Build user authentication with login, signup, password reset, and OAuth"

Orchestrator detects domains: shared/types, database, backend, frontend, testing, security
Creates 6 increments.

Phase 1:
  - shared-types agent: Auth types (User, Session, AuthToken interfaces)
  - database agent: User table, Session table, Prisma migrations

Phase 2 (after contracts ready):
  - backend agent: /api/auth/login, /api/auth/signup, /api/auth/reset, OAuth flow
  - frontend agent: LoginForm, SignupForm, ResetPasswordForm, OAuthButton
  - testing agent: Unit tests, E2E login flow, E2E signup flow
  - security agent: Password hashing, JWT validation, rate limiting, CSRF
```

### Example 2: Frontend-Only (No Dependencies)

```
User: sw:team-lead "Redesign dashboard" --domains frontend,testing
-> No upstream dependencies. Both agents spawn in parallel immediately.
```

### Example 3: Dry Run

```
User: sw:team-lead "Add payment processing" --dry-run
-> Shows plan with domains, phases, file ownership. No agents spawned.
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `sw:team-status` | Show progress of all agents in the current team session |
| `sw:team-merge` | Merge completed agent work in dependency order |
| `sw:auto` | Autonomous execution (single-agent mode) |
| `sw:architect` | System architecture and ADRs |
| `sw:grill` | Quality validation gate |

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#team-lead)
