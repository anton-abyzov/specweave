---
description: Orchestrate multi-agent parallel teams for implementation, PR reviews, brainstorming, and analysis. Supports 4 modes — implementation (spec-required, domain agents), review (parallel reviewers for PRs/code), brainstorm (multi-perspective ideation), and analysis (codebase research). PROACTIVELY invoke for 3+ domains or 15+ tasks. Also use when user says "team setup", "parallel agents", "team lead", "agent teams", "review this PR", "brainstorm", "analyze the codebase".
hooks:
  PreToolUse:
    - matcher: TeamCreate
      hooks:
        - type: command
          command: bash -c 'W="${CLAUDE_PLUGIN_ROOT}/hooks/universal/fail-fast-wrapper.sh"; S="${CLAUDE_PLUGIN_ROOT}/hooks/v2/guards/increment-existence-guard.sh"; [[ -x "$W" ]] && exec "$W" "$S" || (cat >/dev/null && printf "{\"decision\":\"allow\"}")'
---

# Team Lead

**Orchestrate parallel agent teams for implementation, reviews, brainstorming, and analysis.**

## Usage

```bash
/sw:team-lead "<description>" [--mode implementation|review|brainstorm|analysis] [OPTIONS]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--mode` | Team mode: `implementation`, `review`, `brainstorm`, `analysis` | auto-detect |
| `--dry-run` | Show proposed agent plan without launching | false |
| `--domains` | Override domain detection (implementation mode) | auto-detect |
| `--max-agents` | Maximum number of concurrent agents | 6 |

---

## 0. Mode Detection (FIRST STEP)

**Before anything else, determine which mode this team operates in.** The mode dictates the entire workflow — different modes have fundamentally different agent structures, naming conventions, and requirements.

### Auto-Detection Rules

| Signal | Mode | Examples |
|--------|------|---------|
| Explicit `--mode` flag | As specified | `--mode review` |
| PR/review keywords | **review** | "review PR #63", "code review", "audit the auth module", "review this pull request" |
| Brainstorm keywords | **brainstorm** | "brainstorm approaches", "explore ideas", "pros and cons", "ideate on", "what are our options" |
| Analysis keywords | **analysis** | "analyze the codebase", "research how X works", "explore the architecture", "investigate performance" |
| Implementation signals | **implementation** | "build X", "implement Y", "add feature Z", 3+ domains detected, 15+ tasks in tasks.md |

### Keyword Priority

If multiple signals conflict, explicit `--mode` flag wins. Otherwise: review > brainstorm > analysis > implementation.

### Team Naming Convention (CRITICAL for Guard)

The PreToolUse guard uses team_name prefix to determine mode. **You MUST use these prefixes:**

| Mode | team_name pattern | Example |
|------|------------------|---------|
| Implementation | `impl-*` or any non-prefixed name | `impl-checkout`, `feature-auth` |
| Review | `review-*` | `review-pr-63`, `review-auth-module` |
| Brainstorm | `brainstorm-*` | `brainstorm-architecture`, `brainstorm-pricing` |
| Analysis | `analysis-*` | `analysis-performance`, `analysis-codebase` |

**WHY**: The guard only enforces spec-first for implementation teams. Using the correct prefix lets review/brainstorm/analysis teams proceed without an increment.

---

## Mode 1: Implementation (Spec-Required)

**When to use**: Building features, fixing bugs, any work that produces code changes requiring spec-driven coordination.

**Requires**: An existing increment with substantive spec.md (enforced by guard).

### 0a. Increment Pre-Flight (BLOCKING)

**CRITICAL: Implementation mode REQUIRES an existing increment with a substantive spec.md.**
A PreToolUse guard on TeamCreate will BLOCK team creation if no increment exists.

**You MUST verify an increment exists BEFORE proceeding.**

```bash
# Single-repo
find .specweave/increments -maxdepth 2 -name "spec.md" 2>/dev/null | head -5

# Multi-repo (umbrella)
find repositories -path "*/.specweave/increments/*/spec.md" -maxdepth 6 2>/dev/null | head -5
```

#### If NO increment exists → Auto-invoke /sw:increment

Do NOT ask permission. Invoke the increment skill with the user's feature description:

```typescript
Skill({ skill: "sw:increment", args: "the user's feature description" })
```

Wait for /sw:increment to complete (spec.md, plan.md, tasks.md created and approved).
Then continue. If /sw:increment fails: **STOP. Do NOT proceed.**

#### If increment exists → Read the master spec

Read the increment's spec.md. This is the **source of truth** for all agent work:
- Scope and boundaries
- User stories and acceptance criteria
- Task breakdown and dependencies

Store the increment path as `MASTER_INCREMENT_PATH`.

#### Activate the Master Increment (MANDATORY)

**Before spawning ANY agents**, transition the master increment to `"active"` status.

```bash
STATUS=$(jq -r '.status' [MASTER_INCREMENT_PATH]/metadata.json)
if [ "$STATUS" != "active" ] && [ "$STATUS" != "ready_for_review" ]; then
  Edit metadata.json: "status": "planned" → "status": "active"
fi
```

### Implementation Workflow

Follow Sections 1-11 below (the full implementation protocol).

---

## Mode 2: Review (No Increment Required)

**When to use**: PR reviews, code audits, architecture reviews, security audits, pre-release quality checks.

**Does NOT require**: An increment or spec.md. Reviews examine existing code.

### Review Workflow

#### Step 1: Determine Review Scope

Identify what's being reviewed:
- **PR review**: Extract PR number, fetch diff with `gh pr diff <number>`
- **Code audit**: Identify target files/modules
- **Architecture review**: Identify system boundaries and components

#### Step 2: Create Review Team

```typescript
TeamCreate({
  team_name: "review-pr-63",  // MUST use review-* prefix
  description: "Review PR #63 for security, logic, and performance"
});
```

#### Step 3: Spawn Review Agents (All Parallel)

Review agents run in parallel — they examine code independently from different perspectives. **Read the agent definition files** from `agents/` directory, replace placeholders, and spawn.

| Agent | File | Focus |
|-------|------|-------|
| Security Reviewer | `agents/reviewer-security.md` | Vulnerabilities, injection, auth flaws, secrets exposure, OWASP |
| Logic Reviewer | `agents/reviewer-logic.md` | Correctness, edge cases, error handling, race conditions, logic bugs |
| Performance Reviewer | `agents/reviewer-performance.md` | N+1 queries, memory leaks, unnecessary allocations, algorithmic complexity |

```typescript
// Spawn ALL reviewers in parallel — no dependencies between them
Task({
  team_name: "review-pr-63",
  name: "security-reviewer",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/reviewer-security.md with placeholders replaced>
});

Task({
  team_name: "review-pr-63",
  name: "logic-reviewer",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/reviewer-logic.md with placeholders replaced>
});

Task({
  team_name: "review-pr-63",
  name: "performance-reviewer",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/reviewer-performance.md with placeholders replaced>
});
```

#### Step 4: Collect and Merge Reviews

Wait for all agents to signal REVIEW_COMPLETE. Each agent produces a structured findings report. The team-lead:

1. Collects all REVIEW_COMPLETE messages
2. Deduplicates overlapping findings
3. Prioritizes by severity (CRITICAL > HIGH > MEDIUM > LOW)
4. Produces a unified review summary with:
   - **Must Fix** (blocking): Security vulnerabilities, logic bugs, data loss risks
   - **Should Fix** (non-blocking): Performance issues, code quality, missing error handling
   - **Consider** (optional): Style improvements, documentation gaps, refactoring opportunities

#### Step 5: Deliver Review

Present the merged review to the user. If reviewing a PR, optionally post the review as a PR comment via `gh pr review`.

### Review Agent Communication Protocol

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `REVIEW_COMPLETE:` | Agent finished reviewing | Review agent | team-lead |
| `REVIEW_QUESTION:` | Agent needs clarification | Review agent | team-lead |

---

## Mode 3: Brainstorm (No Increment Required)

**When to use**: Exploring ideas, evaluating approaches, multi-perspective ideation, architecture decision exploration, trade-off analysis.

**Does NOT require**: An increment or spec.md. Brainstorming is pre-spec exploration.

### Brainstorm Workflow

#### Step 1: Frame the Question

Extract the core question or decision to brainstorm:
- "How should we architect the payment system?"
- "What approach for real-time notifications?"
- "Should we use microservices or monolith?"

#### Step 2: Create Brainstorm Team

```typescript
TeamCreate({
  team_name: "brainstorm-payment-arch",  // MUST use brainstorm-* prefix
  description: "Brainstorm payment system architecture approaches"
});
```

#### Step 3: Spawn Perspective Agents (All Parallel)

Brainstorm agents represent different thinking perspectives. **Read the agent definition files** from `agents/` directory, replace placeholders, and spawn.

| Agent | File | Perspective |
|-------|------|------------|
| Advocate | `agents/brainstorm-advocate.md` | Champions the most ambitious/innovative approach. Pushes boundaries. |
| Critic | `agents/brainstorm-critic.md` | Devil's advocate. Finds risks, edge cases, failure modes. Questions assumptions. |
| Pragmatist | `agents/brainstorm-pragmatist.md` | Practical realist. Considers timelines, team skills, maintenance burden. |

```typescript
// Spawn ALL perspective agents in parallel
Task({
  team_name: "brainstorm-payment-arch",
  name: "advocate",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/brainstorm-advocate.md with placeholders replaced>
});

Task({
  team_name: "brainstorm-payment-arch",
  name: "critic",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/brainstorm-critic.md with placeholders replaced>
});

Task({
  team_name: "brainstorm-payment-arch",
  name: "pragmatist",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: <content of agents/brainstorm-pragmatist.md with placeholders replaced>
});
```

#### Step 4: Synthesize Perspectives

Wait for all agents to signal PERSPECTIVE_COMPLETE. The team-lead:

1. Collects all perspectives
2. Identifies areas of agreement (strong signals)
3. Maps areas of disagreement (decision points)
4. Produces a **Decision Matrix**:

```
| Approach | Advocate View | Critic Concerns | Pragmatist Assessment | Score |
|----------|--------------|-----------------|----------------------|-------|
| Option A | Pro: X, Y    | Risk: Z         | Feasible, 2 weeks    | 7/10  |
| Option B | Pro: A, B    | Risk: C, D      | Complex, 4 weeks     | 5/10  |
```

5. Recommends a path forward with clear rationale
6. If the user wants to proceed → suggest `/sw:increment` to formalize the chosen approach

### Brainstorm Agent Communication Protocol

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `PERSPECTIVE_COMPLETE:` | Agent finished their analysis | Perspective agent | team-lead |
| `INSIGHT:` | Important finding during analysis | Perspective agent | team-lead |

---

## Mode 4: Analysis (No Increment Required)

**When to use**: Codebase research, dependency analysis, architecture mapping, performance profiling, tech debt assessment, migration feasibility studies.

**Does NOT require**: An increment or spec.md. Analysis is exploratory.

### Analysis Workflow

#### Step 1: Define Analysis Scope

Identify what needs to be analyzed and what questions need answers:
- "How are API endpoints structured?"
- "What's the dependency graph for the auth module?"
- "Where are the performance bottlenecks?"

#### Step 2: Create Analysis Team

```typescript
TeamCreate({
  team_name: "analysis-auth-deps",  // MUST use analysis-* prefix
  description: "Analyze authentication module dependencies and architecture"
});
```

#### Step 3: Spawn Analysis Agents

Unlike fixed-role review/brainstorm agents, analysis agents are **dynamically composed** based on the analysis scope. Common patterns:

| Pattern | Agents | Use Case |
|---------|--------|----------|
| **Architecture mapping** | structure-agent, dependency-agent, pattern-agent | Understanding system design |
| **Performance analysis** | profiler-agent, bottleneck-agent, optimization-agent | Finding performance issues |
| **Tech debt assessment** | complexity-agent, coverage-agent, freshness-agent | Evaluating maintenance burden |
| **Migration feasibility** | source-agent, target-agent, risk-agent | Planning technology migrations |

Agents are spawned with focused prompts tailored to the specific analysis question. There are no fixed agent templates — the team-lead crafts prompts from the analysis scope.

```typescript
// Example: Architecture mapping
Task({
  team_name: "analysis-auth-deps",
  name: "structure-agent",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: "Analyze the directory structure and module organization of the auth system. Map all files in src/auth/, src/middleware/auth*, and related test files. Report: file count, module boundaries, export/import graph, and any circular dependencies. Signal completion with ANALYSIS_COMPLETE: prefix."
});

Task({
  team_name: "analysis-auth-deps",
  name: "dependency-agent",
  subagent_type: "general-purpose",
  mode: "bypassPermissions",
  prompt: "Analyze external dependencies used by the auth module. Check package.json for auth-related packages, trace their usage, check for CVEs, and assess upgrade paths. Signal completion with ANALYSIS_COMPLETE: prefix."
});
```

#### Step 4: Synthesize Findings

Wait for all ANALYSIS_COMPLETE signals. Produce a structured analysis report:

1. **Findings Summary**: Key discoveries from each agent
2. **Diagrams**: ASCII architecture diagrams, dependency graphs
3. **Recommendations**: Prioritized list of actions
4. **Next Steps**: Suggest `/sw:increment` if actionable improvements are identified

### Analysis Agent Communication Protocol

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `ANALYSIS_COMPLETE:` | Agent finished analysis | Analysis agent | team-lead |
| `FINDING:` | Significant discovery during analysis | Analysis agent | team-lead |

---

## 1. Tool Reference

| Action | Tool | Parameters |
|--------|------|------------|
| Create team | `TeamCreate` | `team_name`, `description` |
| Spawn agent | `Task` | `team_name`, `name`, `subagent_type`, `prompt`, `mode: "bypassPermissions"` |
| Send message | `SendMessage` | `type`, `recipient`, `content`, `summary` |
| Shutdown agent | `SendMessage` | `type: "shutdown_request"`, `recipient` |

---

## 2. Domain-to-Skill Mapping (Implementation Mode)

Analyze the feature request and map affected domains to SpecWeave skills.

| Domain | Primary Skill | Additional Skills | When to Use |
|--------|--------------|-------------------|-------------|
| **Frontend** | `frontend:architect` | `frontend:nextjs`, `frontend:design` | UI components, pages, client-side state |
| **Backend** | `sw:architect` | `infra:devops` | API endpoints, services, business logic |
| **Database** | `sw:architect` | | Schema design, migrations, seed data |
| **Shared/Types** | `sw:architect` | `sw:code-simplifier` | TypeScript interfaces, shared constants, API contracts |
| **Testing** | `testing:qa` | `testing:e2e`, `testing:unit` | Test strategy, E2E suites, integration tests |
| **Security** | `sw:security` | `security:patterns` | Auth, authorization, threat modeling, OWASP |
| **DevOps** | `infra:devops` | `k8s:deployment-generate`, `infra:observability` | CI/CD, Docker, K8s, monitoring |
| **Mobile** | `mobile:react-native` | `mobile:screen-generate`, `mobile:expo` | Native/cross-platform mobile apps |
| **ML** | `ml:engineer` | `ml:pipeline`, `ml:deploy` | Model training, inference pipelines, deployment |

### Auto-Detection Signals

The orchestrator infers domains from the feature description and codebase structure (e.g., `src/components/` signals Frontend, `prisma/` signals Database, `src/api/` signals Backend, `tests/` signals Testing, auth-related keywords signal Security, Docker/K8s/CI files signal DevOps, React Native/Flutter signal Mobile, model/pipeline keywords signal ML).

---

## 3. Contract-First Spawning Protocol (Implementation Mode)

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

**In umbrella projects with a `repositories/` folder, each agent MUST create its increment in its OWN repo's `.specweave/`:**

```
# CORRECT: Each repo has its own .specweave/increments/
umbrella-project/
├── .specweave/config.json              # Umbrella config ONLY
├── repositories/
│   ├── {ORG}/sw-ecom-domain/
│   │   └── .specweave/increments/0001-domain-models/
│   ├── {ORG}/sw-ecom-shared/
│   │   └── .specweave/increments/0001-shared-types/
│   └── {ORG}/sw-ecom-api/
│       └── .specweave/increments/0001-api-endpoints/
```

**Rules:**
- Run `specweave init` in each repo if `.specweave/` doesn't exist
- Each agent's working directory is its assigned repo inside `repositories/`
- Never create `.specweave/increments/` in the umbrella root for multi-repo work
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

## 3b. Plan Review Workflow (Implementation Mode)

The team lead acts as **architectural reviewer** for all sub-agent plans. Do NOT auto-accept plans.

### Why Review

Without review, agents may duplicate work across domains, misinterpret scope, make conflicting architectural decisions, or produce plans misaligned with the spec.

### Permission Mode: bypassPermissions (CRITICAL)

**All agents MUST be spawned with `mode: "bypassPermissions"`.** This is required because:
- Agents run as separate processes that encounter folder trust prompts
- Trust prompts require interactive input that agents CANNOT provide
- Without `bypassPermissions`, agents get STUCK waiting for trust confirmation and never execute
- This applies to ALL agent spawns — upstream and downstream, ALL MODES

**NEVER use `mode: "plan"` for agent spawns** — it causes agents to block on the trust-folder prompt.

### Protocol (SendMessage-Based)

Since agents use `bypassPermissions` (not `plan` mode), plan review uses an explicit SendMessage protocol:

**Agent side** (built into every agent prompt template):
1. Read the increment spec and explore the codebase
2. Create plan files (spec.md, plan.md, tasks.md) in the increment directory
3. Send plan summary to team-lead:
```
SendMessage({
  type: "message",
  recipient: "team-lead",
  content: "PLAN_READY: Created spec.md, plan.md, tasks.md at .specweave/increments/[ID]/. Summary: [key decisions, file list, task count]. Ready for review.",
  summary: "Plan ready for review"
});
```
4. **WAIT for PLAN_APPROVED message** before starting implementation. Do NOT proceed without approval.

**Team-lead side**:
1. Receive `PLAN_READY` message from agent
2. Read the agent's plan files (spec.md, plan.md, tasks.md)
3. Evaluate:
   - Does it align with the feature spec and ACs?
   - Is the architecture consistent with existing codebase patterns?
   - Does the agent stay within its file ownership boundaries?
   - Are there conflicts with other agents' plans?
   - Is scope correct — not too broad, not too narrow?
4. Approve or reject:

```
// Approve
SendMessage({
  type: "message",
  recipient: "database-agent",
  content: "PLAN_APPROVED: Go ahead with implementation.",
  summary: "Plan approved"
});

// Reject with feedback
SendMessage({
  type: "message",
  recipient: "database-agent",
  content: "PLAN_REJECTED: Revise: 1) Add index on user_id for sessions. 2) Missing migration for AC-US1-03.",
  summary: "Plan needs revision"
});
```

### Non-Blocking Review

Plan review MUST NOT block other agents. Review plans as they arrive — agents waiting for approval are idle, but other agents continue working normally.

### Task Cap Per Agent (CRITICAL — Context Overflow Prevention)

**Maximum 15 tasks per agent.** Agents with more tasks accumulate too much context in auto-mode, leading to extended thinking loops and stuck agents.

When distributing tasks from the master spec:
1. Count tasks per domain
2. If a domain has >15 tasks: **split into 2 agents** (e.g., `jira-agent-a`, `jira-agent-b`) with non-overlapping task ranges
3. If splitting isn't natural, group tasks into phases and create 2 increments per domain

**Why**: Each auto-mode iteration adds context (spec reads, edits, test outputs). At 20+ tasks, accumulated context causes the model to enter extended thinking (30+ min) and effectively hang. The 15-task cap keeps agents within a safe context budget.

---

## 4. Agent Spawn Prompt Templates

Agent definitions live as reusable `.md` files in the `agents/` subdirectory. When spawning an agent, **Read the agent file and use its full content as the Task() prompt**, with placeholders replaced.

### Implementation Agent Reference

| Agent | File | Domain | Phase | Primary Skills |
|-------|------|--------|-------|---------------|
| Frontend | `agents/frontend.md` | UI, components, pages | 2 (downstream) | `frontend:architect`, `frontend:design` |
| Backend | `agents/backend.md` | API, services, middleware | 2 (downstream) | `sw:architect`, `infra:devops` |
| Database | `agents/database.md` | Schema, migrations, seeds | 1 (upstream) | `sw:architect` |
| Testing | `agents/testing.md` | Unit, integration, E2E | 2 (downstream) | `testing:qa`, `testing:e2e` |
| Security | `agents/security.md` | Auth, validation, audit | 2 (downstream) | `sw:security` |

### Review Agent Reference

| Agent | File | Focus |
|-------|------|-------|
| Security Reviewer | `agents/reviewer-security.md` | Vulnerabilities, injection, auth, secrets, OWASP |
| Logic Reviewer | `agents/reviewer-logic.md` | Correctness, edge cases, error handling, race conditions |
| Performance Reviewer | `agents/reviewer-performance.md` | N+1 queries, memory leaks, algorithmic complexity |

### Brainstorm Agent Reference

| Agent | File | Perspective |
|-------|------|------------|
| Advocate | `agents/brainstorm-advocate.md` | Champions innovative/ambitious approaches |
| Critic | `agents/brainstorm-critic.md` | Devil's advocate — finds risks and failure modes |
| Pragmatist | `agents/brainstorm-pragmatist.md` | Practical realist — timelines, skills, maintenance |

### How to Use Agent Files

For each agent to spawn:

1. **Read** the agent definition: `Read("agents/{name}.md")`
2. **Replace placeholders** in the content:
   - `[REVIEW_TARGET]` → PR number, file paths, or module name being reviewed
   - `[BRAINSTORM_QUESTION]` → the core question being explored
   - `[INCREMENT_ID]` → the increment ID (implementation mode)
   - `[MASTER_INCREMENT_PATH]` → full path to the master increment directory (implementation mode)
   - `{ORG}` → the discovered organization name
   - `{repo-name}` → the assigned repository name
3. **Spawn** via Task() with the replaced content as the prompt

**CRITICAL**: Always use `mode: "bypassPermissions"` — agents cannot handle interactive trust-folder prompts.

---

## 5. File Ownership (Implementation Mode)

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

**Note**: Review, brainstorm, and analysis mode agents have READ-ONLY access to all files. They do not write code (unless explicitly asked to produce fixes in review mode).

---

## 6. Communication Protocol

Agents communicate using `SendMessage`. The message prefix convention varies by mode.

### Implementation Mode Messages

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `CONTRACT_READY:` | Upstream contract is published | Upstream agent | team-lead |
| `BLOCKING_ISSUE:` | Agent is stuck, needs help | Any agent | team-lead |
| `COMPLETION:` | Agent finished all tasks | Any agent | team-lead |
| `PLAN_READY:` | Agent's plan is ready for review | Any agent | team-lead |
| `PLAN_APPROVED:` | Plan approved, proceed | team-lead | Agent |
| `PLAN_REJECTED:` | Plan needs revision | team-lead | Agent |

### Review Mode Messages

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `REVIEW_COMPLETE:` | Review findings ready | Review agent | team-lead |
| `REVIEW_QUESTION:` | Needs clarification about code | Review agent | team-lead |

### Brainstorm Mode Messages

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `PERSPECTIVE_COMPLETE:` | Perspective analysis done | Brainstorm agent | team-lead |
| `INSIGHT:` | Important finding during analysis | Brainstorm agent | team-lead |

### Analysis Mode Messages

| Prefix | Purpose | Sender | Receiver |
|--------|---------|--------|----------|
| `ANALYSIS_COMPLETE:` | Analysis findings ready | Analysis agent | team-lead |
| `FINDING:` | Significant discovery | Analysis agent | team-lead |

---

## 7. Spawning Agents (Implementation Mode)

### Step 1: Create the Team

```typescript
TeamCreate({
  team_name: "feature-checkout",
  description: "Building checkout flow across frontend, backend, and database"
});
```

### Step 2: Spawn Upstream Agents (Phase 1)

All agents are spawned with `mode: "bypassPermissions"` to prevent blocking on trust-folder prompts. Plan review is enforced via the SendMessage PLAN_READY/PLAN_APPROVED protocol (see Section 3b).

For each agent: **Read the agent definition file** (see Section 4 reference table), replace placeholders, and use the full content as the Task() prompt.

```typescript
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

## 8. Quality Gates (Implementation Mode)

Quality gates are split: agents handle tests, team-lead handles closure (grill, done, judge-llm). This prevents context overflow in agents from loading 4+ additional skill definitions during closure.

### Per-Agent Quality Gate (Lightweight)

```
Agent Workflow:
  1. Execute all assigned tasks via /sw:auto --simple
  2. Run all tests for owned code (unit + integration + E2E)
  3. Run linter/type-check for owned code
  4. If tests fail -> fix issues and repeat from step 2
  5. Do NOT signal completion until all tests pass
  6. Signal COMPLETION via SendMessage (include task count, test results summary)
  7. Do NOT run /sw:grill or /sw:done — team-lead handles closure centrally
```

### Orchestrator Quality Gate (Centralized Closure)

After all agents complete, the team-lead runs closure **centrally** for each increment.

**CRITICAL: Increments MUST be closed sequentially, not skipped on failure.**

```
Orchestrator Final Check:
  1. All agents signaled COMPLETION
  2. No unresolved BLOCKING_ISSUE messages
  3. Run full test suite (all domains combined)
  4. For EACH increment in dependency order (shared → database → backend → frontend → testing → security):
     a. PRE-CLOSURE STATUS CHECK:
        - Read metadata.json status
        - If status is "planned" or "backlog" → Edit to "active"
        - If status is "completed" → Skip (already closed)
     b. Run /sw:grill on the increment
     c. If grill finds CRITICAL/BLOCKER issues:
        → Fix them directly (team-lead has cleaner context than agents)
        → Re-run /sw:grill (max 2 retries)
        → If still failing after 2 retries → log failure, move to next increment
     d. Run /sw:done --auto <id>
     e. If /sw:done fails:
        → Read the error output carefully
        → Fix the root cause (sync ACs, update task counts, write missing reports)
        → Re-run /sw:done --auto <id> (max 2 retries)
     f. Verify closure: check metadata.json status == "completed"
  5. After all increments attempted:
     - If ALL closed → /sw:team-merge
     - If SOME failed → report which increments are still open with failure reasons
```

**Common closure failures and fixes:**

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| `specweave complete` exits silently | metadata.json status is "planned" | Edit metadata.json: set status to "active" |
| Desync error | spec.md AC count != metadata.json | Run `specweave sync-acs <id>` or fix manually |
| Missing grill-report.json | Grill wasn't run or didn't write report | Run `/sw:grill <id>` — it writes the report |
| Missing judge-llm-report.json | Judge wasn't run | Write WAIVED report if no external model consent |
| Task count mismatch | tasks.md frontmatter != actual checked tasks | Update `completed_tasks` in tasks.md frontmatter |
| ACs not all checked | Some ACs still `[ ]` in spec.md | Verify implementation, then check them `[x]` |

---

## 8b. Agent Timeout and Stuck Detection

Agents can get stuck in extended thinking if their context overflows. The team-lead MUST monitor for stuck agents.

### Stuck Detection Rules

**Note**: Claude Code has no built-in timers. These are best-effort heuristics applied when the team-lead regains control.

| Condition | Action |
|-----------|--------|
| Agent has not messaged since team-lead's last turn | Send `STATUS_CHECK` message to agent |
| Agent does not respond to STATUS_CHECK on next team-lead turn | Declare agent stuck |
| Agent stuck | Log warning, proceed with other agents, handle stuck agent's work manually |
| All agents stuck | STOP team, report to user |

### Stuck Agent Recovery

1. Do NOT wait for it — proceed with closure of other agents' work
2. Note the stuck agent's last known progress
3. Send shutdown_request to the stuck agent to free resources
4. For implementation mode: leave stuck agent's increment open for manual completion

### Preventing Stuck Agents

- Enforce the 15-task cap (implementation mode)
- Agents use `--simple` flag in auto-mode
- Agents do NOT run /sw:done (team-lead handles closure centrally)
- Review/brainstorm/analysis agents have inherently bounded scope

---

## 9. Workflow Summary

### Implementation Mode

```
/sw:team-lead "Build checkout flow"
  │
  ├── Step 0: MODE DETECTION → implementation (default)
  ├── Step 0a: VERIFY INCREMENT EXISTS (BLOCKING)
  │     ├── Found? → Read master spec.md as source of truth
  │     └── Missing? → Auto-invoke /sw:increment, wait for completion
  ├── Step 0b: ACTIVATE MASTER INCREMENT
  │     └── Edit metadata.json: set status to "active"
  ├── Step 1: Analyze feature → identify domains → decide increment split
  ├── Step 2: Create team via TeamCreate (team_name: "impl-*" or any)
  ├── Step 3: Create per-domain increments
  ├── Step 4: Contract-first spawning (all agents with mode: "bypassPermissions")
  │     ├── Phase 1: Spawn shared + database → wait for CONTRACT_READY
  │     └── Phase 2: Spawn backend + frontend + testing
  ├── Step 5: Monitor progress via SendMessage
  ├── Step 6: Agents signal COMPLETION
  ├── Step 7: Team-lead runs centralized closure per increment
  └── Step 8: Merge and close (/sw:team-merge)
```

### Review Mode

```
/sw:team-lead "Review PR #63" --mode review
  │
  ├── Step 0: MODE DETECTION → review
  ├── Step 1: Determine review scope (PR diff, target files)
  ├── Step 2: Create team (team_name: "review-pr-63")
  ├── Step 3: Spawn all reviewers in parallel
  │     ├── Security Reviewer
  │     ├── Logic Reviewer
  │     └── Performance Reviewer
  ├── Step 4: Collect REVIEW_COMPLETE from all agents
  ├── Step 5: Merge, deduplicate, prioritize findings
  └── Step 6: Deliver unified review to user
```

### Brainstorm Mode

```
/sw:team-lead "Brainstorm payment architecture" --mode brainstorm
  │
  ├── Step 0: MODE DETECTION → brainstorm
  ├── Step 1: Frame the core question
  ├── Step 2: Create team (team_name: "brainstorm-payment-arch")
  ├── Step 3: Spawn all perspective agents in parallel
  │     ├── Advocate (champions innovative approaches)
  │     ├── Critic (finds risks and failure modes)
  │     └── Pragmatist (practical feasibility)
  ├── Step 4: Collect PERSPECTIVE_COMPLETE from all agents
  ├── Step 5: Synthesize into decision matrix
  └── Step 6: Recommend path forward → suggest /sw:increment if proceeding
```

### Analysis Mode

```
/sw:team-lead "Analyze auth module architecture" --mode analysis
  │
  ├── Step 0: MODE DETECTION → analysis
  ├── Step 1: Define analysis scope and questions
  ├── Step 2: Create team (team_name: "analysis-auth-deps")
  ├── Step 3: Spawn analysis agents (dynamically composed)
  ├── Step 4: Collect ANALYSIS_COMPLETE from all agents
  ├── Step 5: Synthesize findings into structured report
  └── Step 6: Deliver report → suggest /sw:increment if actionable
```

---

## 10. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| **TeamCreate blocked by guard** | No increment exists AND team_name doesn't have a non-impl prefix | For implementation: run `/sw:increment` first. For review/brainstorm/analysis: use the correct team_name prefix (review-*, brainstorm-*, analysis-*) |
| **Agent stuck on trust folder** | Agent spawned without `bypassPermissions` | ALWAYS use `mode: "bypassPermissions"` — NEVER `mode: "plan"` |
| **Agents editing same files** | Overlapping file ownership (implementation mode) | Review ownership map; reassign conflicting files |
| **Token cost too high** | Too many agents | Reduce `--max-agents`; use `--domains` to limit scope |
| **Agent stuck in extended thinking** | Too many tasks (>15) | Enforce 15-task cap; split large domains |
| **Review agents missing context** | PR diff not provided in prompt | Ensure PR number or file paths are in [REVIEW_TARGET] placeholder |
| **Brainstorm too shallow** | Agents not exploring deeply enough | Add more specific context to [BRAINSTORM_QUESTION] placeholder |
| **Wrong mode detected** | Ambiguous description | Use explicit `--mode` flag or correct team_name prefix |
| **`specweave complete` exits silently** | metadata.json status is "planned" | Edit metadata.json: set status to "active" before closure |

---

## 11. Examples

### Example 1: Full-Stack Feature (Implementation Mode)

```
User: /sw:team-lead "Build user authentication with login, signup, password reset, and OAuth"

Mode: implementation (auto-detected)
Domains: shared/types, database, backend, frontend, testing, security

Phase 1:
  - shared-types agent: Auth types (User, Session, AuthToken interfaces)
  - database agent: User table, Session table, Prisma migrations

Phase 2 (after contracts ready):
  - backend agent: /api/auth/login, /api/auth/signup, /api/auth/reset, OAuth flow
  - frontend agent: LoginForm, SignupForm, ResetPasswordForm, OAuthButton
  - testing agent: Unit tests, E2E login flow, E2E signup flow
  - security agent: Password hashing, JWT validation, rate limiting, CSRF
```

### Example 2: PR Review (Review Mode)

```
User: /sw:team-lead "Review PR #63"

Mode: review (auto-detected from "PR #63")
Team: review-pr-63

Spawns 3 parallel reviewers:
  - Security: Checks for injection, auth bypass, secrets in diff
  - Logic: Verifies correctness, edge cases, error handling in changed code
  - Performance: Identifies N+1 queries, unnecessary allocations in diff

Output: Unified review with Must Fix / Should Fix / Consider categories
```

### Example 3: Architecture Brainstorm (Brainstorm Mode)

```
User: /sw:team-lead "Brainstorm: microservices vs monolith for our growing app"

Mode: brainstorm (auto-detected from "brainstorm")
Team: brainstorm-arch-decision

Spawns 3 parallel perspective agents:
  - Advocate: Champions microservices — independent scaling, team autonomy, polyglot
  - Critic: Warns about distributed complexity, network latency, operational overhead
  - Pragmatist: Evaluates team size, current traffic, migration cost, timeline

Output: Decision matrix with scored options and recommended path
```

### Example 4: Codebase Analysis (Analysis Mode)

```
User: /sw:team-lead "Analyze our dependency tree for security risks" --mode analysis

Mode: analysis (explicit flag)
Team: analysis-dep-security

Spawns dynamically composed agents:
  - npm-audit-agent: Runs npm audit, maps CVEs to severity
  - license-agent: Checks license compliance across all deps
  - freshness-agent: Identifies outdated packages and upgrade paths

Output: Structured report with findings, risk assessment, prioritized action items
```

### Example 5: Dry Run

```
User: /sw:team-lead "Add payment processing" --dry-run

Team Orchestration Plan (DRY RUN)
==================================================
Feature: Add payment processing | Mode: implementation | Domains: 4

Phase 1 (upstream):
  1. shared-types -> sw:architect  | Increment: 0200-payment-shared
  2. database     -> sw:architect  | Increment: 0201-payment-database

Phase 2 (downstream, parallel):
  3. backend      -> sw:architect  | Increment: 0202-payment-backend
  4. frontend     -> frontend:architect | Increment: 0203-payment-frontend

Max agents: 4 (2 sequential + 2 parallel)
To execute, run without --dry-run.
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `/sw:team-status` | Show progress of all agents in the current team session |
| `/sw:team-merge` | Merge completed agent work in dependency order |
| `/sw:team-build` | Preset-driven team spawning (full-stack, review, testing, tdd, migration) |
| `/sw:auto` | Autonomous execution (single-agent mode) |
| `/sw:architect` | System architecture and ADRs |
| `/sw:grill` | Quality validation gate |
| `/sw:brainstorm` | Single-agent brainstorming (for simpler ideation without teams) |
